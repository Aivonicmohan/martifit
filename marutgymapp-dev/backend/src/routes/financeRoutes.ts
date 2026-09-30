import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { tenantAuthMiddleware, AuthenticatedRequest } from "../lib/tenantContext";
import { isOwnerOrManager } from "../lib/rbac";
import { invalidateMemberCache } from "../lib/memberCache";

const router = Router();

// Middleware to enforce Owner / Manager privileges for all finance routes
router.use(tenantAuthMiddleware, (req: AuthenticatedRequest, res: Response, next) => {
  if (!isOwnerOrManager(req.user)) {
    return res.status(403).json({
      error: "Forbidden: Access Denied. Financial records are accessible only to Facility Owners or Managers.",
      success: false,
    });
  }
  next();
});

router.get("/payments", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { tenantId: req.tenantId },
      select: {
        id: true,
        tenantId: true,
        memberId: true,
        membershipId: true,
        amount: true,
        paymentMethod: true,
        transactionRef: true,
        paymentDate: true,
        invoiceNumber: true,
        notes: true,
        createdAt: true,

        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            memberCode: true,
          },
        },

        membership: {
          select: {
            id: true,
            startDate: true,
          },
        },
      },
      orderBy: { paymentDate: "desc" },
    });

    return res.json({
      success: true,
      payments,
    });
  } catch (error: any) {
    console.error("❌ Error loading finance payments:", error);

    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to load finance payments",
    });
  }
});

router.post("/payments", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { memberId, membershipId, amount, paymentMethod = "CASH", transactionRef, paymentDate, notes } = req.body;

    if (!memberId) {
      return res.status(400).json({ success: false, error: "Member ID is required" });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, error: "Payment amount must be greater than 0" });
    }

    // Verify member exists within current tenant
    const member = await prisma.member.findFirst({
      where: { id: memberId, tenantId: req.tenantId },
    });

    if (!member) {
      return res.status(404).json({ success: false, error: "Member not found in current facility" });
    }

    // Locate target membership
    let targetMembership = null;
    if (membershipId) {
      targetMembership = await prisma.membership.findFirst({
        where: { id: membershipId, memberId, tenantId: req.tenantId },
      });
    }

    if (!targetMembership) {
      targetMembership = await prisma.membership.findFirst({
        where: { memberId, tenantId: req.tenantId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      });
    }

    // Generate Invoice Number
    const count = await prisma.payment.count({ where: { tenantId: req.tenantId } });
    const invoiceNumber = `INV-${1490 + count + 1}`;

    const paymentDateObj = paymentDate ? new Date(paymentDate) : new Date();

    const payment = await prisma.payment.create({
      data: {
        tenantId: req.tenantId!,
        memberId,
        membershipId: targetMembership?.id || null,
        invoiceNumber,
        amount: numAmount,
        netAmount: numAmount,
        paymentMethod: paymentMethod.toUpperCase(),
        transactionRef: transactionRef || null,
        notes: notes || null,
        paymentDate: paymentDateObj,
        receivedById: req.user?.userId || null,
      },
      include: {
        member: true,
        membership: { include: { plan: true } },
      },
    });

    // Update membership balance if associated
    if (targetMembership) {
      const currentPaid = targetMembership.paidAmount || 0;
      const newPaid = currentPaid + numAmount;
      const newPending = Math.max(0, (targetMembership.totalAmount || 0) - newPaid);

      await prisma.membership.update({
        where: { id: targetMembership.id },
        data: {
          paidAmount: newPaid,
          pendingAmount: newPending,
        },
      });
    }

    // Automatically create invoice record
    try {
      await prisma.invoice.create({
        data: {
          tenantId: req.tenantId!,
          memberId,
          paymentId: payment.id,
          invoiceNumber,
          issueDate: paymentDateObj,
          dueDate: paymentDateObj,
          subtotal: numAmount,
          taxAmount: 0,
          totalAmount: numAmount,
          status: "PAID",
        },
      });
    } catch (invErr) {
      console.warn("Invoice record warning:", invErr);
    }

    invalidateMemberCache(req.tenantId);

    return res.json({ success: true, payment, message: "Payment recorded successfully" });
  } catch (error: any) {
    console.error("❌ Error recording payment:", error);
    return res.status(500).json({ success: false, error: error?.message || "Failed to record payment" });
  }
});


router.get("/dues", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const memberships = await prisma.membership.findMany({
      where: { tenantId: req.tenantId },
      select: {
        id: true,
        memberId: true,
        startDate: true,
        endDate: true,
        pendingAmount: true,
        createdAt: true,
        status: true,
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            memberCode: true,
          },
        },
        plan: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { endDate: "asc" },
    });

    return res.json({
      success: true,
      memberships,
    });
  } catch (error: any) {
    console.error("❌ Error loading finance dues:", error);

    return res.status(500).json({
      success: false,
      error: error?.message || "Failed to load finance dues",
    });
  }
});

router.get("/expenses", async (req: AuthenticatedRequest, res: Response) => {
  const expenses = await prisma.expense.findMany({
    where: { tenantId: req.tenantId },
    orderBy: { expenseDate: "desc" },
  });
  return res.json({ success: true, expenses });
});

export default router;

