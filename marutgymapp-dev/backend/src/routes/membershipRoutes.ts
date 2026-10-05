import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { tenantAuthMiddleware, AuthenticatedRequest } from "../lib/tenantContext";
import { hasPermission, PERMISSIONS } from "../lib/rbac";

const router = Router();

router.get("/", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const whereClause: any = {};
  if (req.tenantId && req.tenantId !== "platform") {
    whereClause.tenantId = req.tenantId;
  }

  const [plans, memberships] = await Promise.all([
    prisma.membershipPlan.findMany({
      where: whereClause,
      orderBy: { durationMonths: "asc" },
    }),
    prisma.membership.findMany({
      where: whereClause,
      include: { member: true, plan: true },
      orderBy: { endDate: "asc" },
    }),
  ]);

  return res.json({ success: true, plans, memberships });
});

router.post("/", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!hasPermission(req.user, PERMISSIONS.MEMBERSHIPS_MANAGE)) {
    return res.status(403).json({ error: "Forbidden", success: false });
  }

  try {
    const { name, description, durationMonths, price, joiningFee = 0 } = req.body;
    const plan = await prisma.membershipPlan.create({
      data: {
        tenantId: req.tenantId!,
        name,
        description,
        durationMonths: Number(durationMonths),
        price: Number(price),
        joiningFee: Number(joiningFee),
      },
    });
    return res.json({ success: true, plan });
  } catch (err) {
    return res.status(500).json({ error: "Failed to create plan", success: false });
  }
});

router.put("/:id", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!hasPermission(req.user, PERMISSIONS.MEMBERSHIPS_MANAGE)) {
    return res.status(403).json({ error: "Forbidden", success: false });
  }

  try {
    const { id } = req.params;
    const { name, description, durationMonths, price, joiningFee, isActive } = req.body;

    const existingPlan = await prisma.membershipPlan.findUnique({
      where: { id },
    });

    if (!existingPlan) {
      return res.status(404).json({ error: "Membership plan not found", success: false });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (durationMonths !== undefined) updateData.durationMonths = Number(durationMonths);
    if (price !== undefined) updateData.price = Number(price);
    if (joiningFee !== undefined) updateData.joiningFee = Number(joiningFee);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updatedPlan = await prisma.membershipPlan.update({
      where: { id },
      data: updateData,
    });

    return res.json({ success: true, plan: updatedPlan });
  } catch (err) {
    console.error("Error updating membership plan:", err);
    return res.status(500).json({ error: "Failed to update membership plan", success: false });
  }
});

router.delete("/:id", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!hasPermission(req.user, PERMISSIONS.MEMBERSHIPS_MANAGE)) {
    return res.status(403).json({ error: "Forbidden", success: false });
  }

  try {
    const { id } = req.params;

    const existingPlan = await prisma.membershipPlan.findUnique({
      where: { id },
      include: { _count: { select: { memberships: true } } },
    });

    if (!existingPlan) {
      return res.status(404).json({ error: "Membership plan not found", success: false });
    }

    if (existingPlan._count.memberships > 0) {
      // Soft-delete by setting isActive to false to preserve historical data
      await prisma.membershipPlan.update({
        where: { id },
        data: { isActive: false },
      });
      return res.json({
        success: true,
        message: "Membership plan deactivated to preserve existing member subscriptions.",
      });
    }

    try {
      await prisma.membershipPlan.delete({
        where: { id },
      });
      return res.json({ success: true, message: "Membership plan deleted successfully." });
    } catch (dbErr) {
      // Fallback soft delete if foreign key constraint is hit
      await prisma.membershipPlan.update({
        where: { id },
        data: { isActive: false },
      });
      return res.json({
        success: true,
        message: "Membership plan deactivated to preserve member historical data.",
      });
    }
  } catch (err) {
    console.error("Error deleting membership plan:", err);
    return res.status(500).json({ error: "Failed to delete membership plan", success: false });
  }
});


export default router;

