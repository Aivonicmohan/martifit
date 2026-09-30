import { prisma } from "../prisma";

export interface LogAuditParams {
  tenantId?: string | null;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAuditAction(params: LogAuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: params.tenantId || null,
        userId: params.userId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        oldValueJson: params.oldValue ? JSON.stringify(params.oldValue) : null,
        newValueJson: params.newValue ? JSON.stringify(params.newValue) : null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
