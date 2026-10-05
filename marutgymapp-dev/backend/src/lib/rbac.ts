import { UserSessionPayload } from "./jwt";
import { prisma } from "./prisma";

export const PERMISSIONS = {
  MEMBERS_VIEW: "members.view",
  MEMBERS_CREATE: "members.create",
  MEMBERS_UPDATE: "members.update",
  MEMBERS_DELETE: "members.delete",
  MEMBERSHIPS_VIEW: "memberships.view",
  MEMBERSHIPS_MANAGE: "memberships.manage",
  ATTENDANCE_VIEW: "attendance.view",
  ATTENDANCE_MANAGE: "attendance.manage",
  FINANCE_VIEW: "finance.view",
  FINANCE_CREATE: "finance.create",
  FINANCE_MANAGE: "finance.manage",
  LEADS_VIEW: "leads.view",
  LEADS_MANAGE: "leads.manage",
  STAFF_VIEW: "staff.view",
  STAFF_MANAGE: "staff.manage",
  REPORTS_VIEW: "reports.view",
  SETTINGS_MANAGE: "settings.manage",
  INTEGRATIONS_MANAGE: "integrations.manage",
} as const;

export function isOwnerOrManager(user?: UserSessionPayload): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  const role = (user.role || "").toUpperCase();
  return role.includes("OWNER") || role.includes("MANAGER") || role === "GYM OWNER";
}

export function hasPermission(session: UserSessionPayload | undefined, requiredPermission: string): boolean {
  if (!session) return false;
  if (isOwnerOrManager(session)) return true;
  return session.permissions?.includes(requiredPermission) || false;
}

export async function logAuditAction(params: {
  tenantId?: string | null;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
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
    console.error("Audit log error:", error);
  }
}
