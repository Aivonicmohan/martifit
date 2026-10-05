import { Router } from "express";
import { prisma } from "../lib/prisma";
import { tenantAuthMiddleware, AuthenticatedRequest } from "../lib/tenantContext";

const router = Router();

router.get("/", tenantAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  const entity = (req.query.entity as string) || "MEMBER";
  const fields = await prisma.customFieldDefinition.findMany({
    where: { tenantId: req.tenantId, entity, isActive: true },
    orderBy: { displayOrder: "asc" },
  });
  return res.json({ success: true, fields });
});

export default router;
