import { Router } from "express";
import { prisma } from "../lib/prisma";
import { tenantAuthMiddleware, AuthenticatedRequest } from "../lib/tenantContext";

const router = Router();

router.get("/", tenantAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  const dateStr = (req.query.date as string) || new Date().toISOString().split("T")[0];

  const attendance = await prisma.attendance.findMany({
    where: { tenantId: req.tenantId, date: dateStr },
    include: { member: true },
    orderBy: { checkInTime: "desc" },
  });

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const totalMembers = await prisma.member.count({
    where: {
      tenantId: req.tenantId,
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

  const uniqueMemberIds = new Set(attendance.map(a => a.memberId));
  const presentCount = uniqueMemberIds.size;

  return res.json({
    success: true,
    date: dateStr,
    presentCount,
    absentCount: Math.max(0, totalMembers - presentCount),
    attendance,
  });
});

router.post("/", tenantAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { memberCode, method = "MANUAL" } = req.body;
    const member = await prisma.member.findFirst({
      where: { tenantId: req.tenantId, OR: [{ memberCode }, { phone: memberCode }] },
    });

    if (!member) return res.status(404).json({ error: "Member not found", success: false });

    const todayStr = req.body.date || new Date().toISOString().split("T")[0];
    const newAtt = await prisma.attendance.create({
      data: {
        tenantId: req.tenantId!,
        memberId: member.id,
        date: todayStr,
        checkInTime: new Date(),
        status: "PRESENT",
        method,
      },
      include: { member: true },
    });

    return res.json({ success: true, attendance: newAtt });
  } catch {
    return res.status(500).json({ error: "Failed to record attendance", success: false });
  }
});

export default router;
