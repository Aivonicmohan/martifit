import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { tenantAuthMiddleware, AuthenticatedRequest } from "../lib/tenantContext";
import { hasPermission, PERMISSIONS } from "../lib/rbac";

const router = Router();

// GET /api/v1/batches
router.get("/", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const batches = await prisma.gymBatch.findMany({
      where: { tenantId: req.tenantId, isActive: true },
      orderBy: { createdAt: "asc" },
    });
    return res.json({ success: true, batches });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch gym batches", success: false });
  }
});

// POST /api/v1/batches
router.post("/", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!hasPermission(req.user, PERMISSIONS.SETTINGS_MANAGE)) {
    return res.status(403).json({ error: "Forbidden", success: false });
  }

  try {
    const { name, startTime, endTime, description, capacity } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Batch name is required", success: false });
    }

    const batch = await prisma.gymBatch.create({
      data: {
        tenantId: req.tenantId!,
        name: name.trim(),
        startTime: startTime ? startTime.trim() : null,
        endTime: endTime ? endTime.trim() : null,
        description: description ? description.trim() : null,
        capacity: capacity ? Number(capacity) : null,
        isActive: true,
      },
    });
    return res.json({ success: true, batch });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create gym batch", success: false });
  }
});

// PUT /api/v1/batches/:id
router.put("/:id", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!hasPermission(req.user, PERMISSIONS.SETTINGS_MANAGE)) {
    return res.status(403).json({ error: "Forbidden", success: false });
  }

  try {
    const { name, startTime, endTime, description, capacity, isActive } = req.body;
    const existing = await prisma.gymBatch.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Batch not found", success: false });
    }

    const updated = await prisma.gymBatch.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(startTime !== undefined && { startTime: startTime ? startTime.trim() : null }),
        ...(endTime !== undefined && { endTime: endTime ? endTime.trim() : null }),
        ...(description !== undefined && { description: description ? description.trim() : null }),
        ...(capacity !== undefined && { capacity: capacity ? Number(capacity) : null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    return res.json({ success: true, batch: updated });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update batch", success: false });
  }
});

// DELETE /api/v1/batches/:id
router.delete("/:id", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!hasPermission(req.user, PERMISSIONS.SETTINGS_MANAGE)) {
    return res.status(403).json({ error: "Forbidden", success: false });
  }

  try {
    const existing = await prisma.gymBatch.findFirst({
      where: { id: req.params.id, tenantId: req.tenantId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Batch not found", success: false });
    }

    await prisma.gymBatch.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    return res.json({ success: true, message: "Batch deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete batch", success: false });
  }
});

export default router;
