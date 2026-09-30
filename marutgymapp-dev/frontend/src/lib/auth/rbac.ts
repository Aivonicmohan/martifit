import { UserSessionPayload } from "./jwt";

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

export function hasPermission(session: UserSessionPayload | null, requiredPermission: string): boolean {
  if (!session) return false;
  if (session.isSuperAdmin) return true;
  if (session.role === "Gym Owner") return true; // Owner has full access to tenant resources
  return session.permissions?.includes(requiredPermission) || false;
}
