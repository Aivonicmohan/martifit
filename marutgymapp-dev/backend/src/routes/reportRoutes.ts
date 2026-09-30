import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { tenantAuthMiddleware, AuthenticatedRequest } from "../lib/tenantContext";
import { isOwnerOrManager } from "../lib/rbac";

const router = Router();

// GET /api/v1/reports/dashboard-stats
router.get("/dashboard-stats", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userIsOwner = isOwnerOrManager(req.user);
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const next7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59);

    // 1. Total & Active Members
    const totalMembers = await prisma.member.count({ where: { tenantId, deletedAt: null } });
    const activeMembers = await prisma.member.count({
      where: {
        tenantId,
        deletedAt: null,
        status: { notIn: ["INACTIVE", "inactive", "DELETED", "deleted", "EXPIRED", "TRASH"] },
        memberships: {
          some: {
            deletedAt: null,
            status: "ACTIVE",
            endDate: { gte: startOfDay }
          }
        }
      }
    });

    let monthCollection = 0;
    let pendingBalance = 0;

    // Financial totals visible strictly to Facility Owners & Managers
    if (userIsOwner) {
      // Direct payments recorded
      const paymentsAgg = await prisma.payment.aggregate({
        where: { tenantId },
        _sum: { amount: true }
      });

      // Paid amounts stored directly on memberships
      const membershipsAgg = await prisma.membership.aggregate({
        where: { tenantId, deletedAt: null },
        _sum: { paidAmount: true }
      });

      // Payments already linked to a membership ID to prevent double counting
      const linkedPaymentsAgg = await prisma.payment.aggregate({
        where: { tenantId, membershipId: { not: null } },
        _sum: { amount: true }
      });

      const totalDirectPayments = paymentsAgg._sum.amount || 0;
      const totalMembershipPaid = membershipsAgg._sum.paidAmount || 0;
      const linkedPaymentDeduction = linkedPaymentsAgg._sum.amount || 0;

      monthCollection = totalDirectPayments + totalMembershipPaid - linkedPaymentDeduction;

      const pendingBalanceAgg = await prisma.membership.aggregate({
        where: { tenantId, deletedAt: null },
        _sum: { pendingAmount: true }
      });
      pendingBalance = pendingBalanceAgg._sum.pendingAmount || 0;
    }

    // Today Attendance
    const todayAttendanceCount = await prisma.attendance.count({
      where: {
        tenantId,
        date: todayStr
      }
    });

    // Expiring Memberships (Next 7 Days)
    const expiringMemberships = await prisma.membership.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
        endDate: { gte: startOfDay, lte: next7Days }
      },
      include: {
        member: { select: { id: true, firstName: true, lastName: true, memberCode: true, phone: true } },
        plan: { select: { name: true } }
      },
      orderBy: { endDate: "asc" }
    });

    return res.json({
      success: true,
      stats: {
        totalMembers,
        activeMembers,
        monthCollection,
        pendingBalance,
        todayAttendance: todayAttendanceCount,
        expiringCount: expiringMemberships.length,
        expiringList: expiringMemberships.map((m) => ({
          id: m.id,
          memberId: m.memberId,
          memberName: `${m.member.firstName} ${m.member.lastName}`.trim(),
          memberCode: m.member.memberCode,
          phone: m.member.phone,
          planName: m.plan?.name || "Active Membership",
          endDate: m.endDate
        }))
      }
    });
  } catch (error: any) {
    console.error("❌ Error generating dashboard stats:", error);
    return res.status(500).json({ error: "Failed to load dashboard metrics", success: false });
  }
});

// GET /api/v1/reports (Summary analytics)
router.get("/", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const totalMembers = await prisma.member.count({ where: { tenantId, deletedAt: null } });
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const activeMembers = await prisma.member.count({
      where: {
        tenantId,
        deletedAt: null,
        status: { notIn: ["INACTIVE", "inactive", "DELETED", "deleted", "EXPIRED", "TRASH"] },
        memberships: {
          some: {
            deletedAt: null,
            status: "ACTIVE",
            endDate: { gte: startOfDay }
          }
        }
      }
    });

    const paymentsAgg = await prisma.payment.aggregate({
      where: { tenantId },
      _sum: { amount: true }
    });

    const membershipsAgg = await prisma.membership.aggregate({
      where: { tenantId, deletedAt: null },
      _sum: { paidAmount: true }
    });

    const linkedPaymentsAgg = await prisma.payment.aggregate({
      where: { tenantId, membershipId: { not: null } },
      _sum: { amount: true }
    });

    const totalRevenue = (paymentsAgg._sum.amount || 0) + (membershipsAgg._sum.paidAmount || 0) - (linkedPaymentsAgg._sum.amount || 0);

    return res.json({
      success: true,
      summary: {
        totalMembers,
        activeMemberships: activeMembers,
        totalRevenue
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to generate report summary" });
  }
});

// Middleware to enforce Owner / Manager privileges for detailed report endpoints
router.use(tenantAuthMiddleware, (req: AuthenticatedRequest, res: Response, next) => {
  if (!isOwnerOrManager(req.user)) {
    return res.status(403).json({
      error: "Forbidden: Access Denied. Analytical reports are accessible only to Facility Owners or Managers.",
      success: false,
    });
  }
  next();
});

router.get("/members", async (req: AuthenticatedRequest, res: Response) => {
  const members = await prisma.member.findMany({
    where: { tenantId: req.tenantId },
    include: { memberships: true },
  });
  return res.json({ success: true, members });
});

router.get("/finance", async (req: AuthenticatedRequest, res: Response) => {
  const payments = await prisma.payment.findMany({
    where: { tenantId: req.tenantId },
  });
  const expenses = await prisma.expense.findMany({
    where: { tenantId: req.tenantId },
  });
  return res.json({ success: true, payments, expenses });
});

router.get("/attendance", async (req: AuthenticatedRequest, res: Response) => {
  const attendance = await prisma.attendance.findMany({
    where: { tenantId: req.tenantId },
  });
  return res.json({ success: true, attendance });
});

export default router;
