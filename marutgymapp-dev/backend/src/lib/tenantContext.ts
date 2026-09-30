import { Request, Response, NextFunction } from "express";
import { verifyJWT, UserSessionPayload } from "./jwt";

export interface AuthenticatedRequest extends Request {
  user?: UserSessionPayload;
  tenantId?: string;
}

export async function tenantAuthMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | null = null;
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else if (req.headers.cookie) {
    const match = req.headers.cookie.match(/token=([^;]+)/);
    if (match) token = match[1];
  }

  if (!token) {
    return res.status(401).json({ error: "Unauthorized access", success: false });
  }

  const session = await verifyJWT(token);
  if (!session) {
    return res.status(401).json({ error: "Invalid or expired token", success: false });
  }

  let activeTenantId = session.tenantId;

  // Super Admin can switch tenant context using x-tenant-id header
  if (session.isSuperAdmin) {
    const headerTenantId = req.headers["x-tenant-id"] as string;
    if (headerTenantId) {
      activeTenantId = headerTenantId;
    }
  }

  const DEFAULT_TENANT_ID = "df702917-b1c4-4160-8672-85fe981d03f8"; // Default Fallback Tenant

  req.user = session;
  req.tenantId = activeTenantId && activeTenantId !== "platform" ? activeTenantId : DEFAULT_TENANT_ID;
  next();
}
