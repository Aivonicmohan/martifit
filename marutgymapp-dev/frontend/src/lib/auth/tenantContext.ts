import { NextRequest, NextResponse } from "next/server";
import { verifyJWT, UserSessionPayload } from "./jwt";

export interface TenantContext extends UserSessionPayload {
  tenantId: string;
}

export async function getTenantContext(req: NextRequest): Promise<TenantContext | null> {
  let token: string | null = null;
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else {
    const cookieToken = req.cookies.get("token")?.value;
    if (cookieToken) token = cookieToken;
  }

  if (!token) return null;
  const session = await verifyJWT(token);
  if (!session) return null;

  // Super admins can explicitly pass X-Tenant-Id header to act on behalf of a specific tenant
  let activeTenantId = session.tenantId;
  const headerTenantId = req.headers.get("x-tenant-id");

  if (session.isSuperAdmin && headerTenantId) {
    activeTenantId = headerTenantId;
  }

  if (!activeTenantId && !session.isSuperAdmin) {
    return null; // Regular user must be bound to a tenant
  }

  return {
    ...session,
    tenantId: activeTenantId || "platform",
  };
}

export function enforceTenantAccess(
  session: UserSessionPayload | null,
  targetTenantId: string
): boolean {
  if (!session) return false;
  if (session.isSuperAdmin) return true; // Super Admin can access any tenant
  return session.tenantId === targetTenantId;
}

export function unauthorizedResponse(message = "Unauthorized access"): NextResponse {
  return NextResponse.json({ error: message, success: false }, { status: 401 });
}

export function forbiddenResponse(message = "Forbidden: Insufficient permissions or tenant mismatch"): NextResponse {
  return NextResponse.json({ error: message, success: false }, { status: 403 });
}
