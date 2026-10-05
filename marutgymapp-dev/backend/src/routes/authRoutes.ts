import { Router } from "express";
import { prisma } from "../lib/prisma";
import { verifyPassword, signJWT } from "../lib/jwt";
import { tenantAuthMiddleware, AuthenticatedRequest } from "../lib/tenantContext";
import { logAuditAction } from "../lib/rbac";

const router = Router();

router.post("/login", async (req, res) => {
  try {
    const { email, username, phone, identifier, password } = req.body;
    const loginInput = (identifier || email || username || phone || "").toString().trim();

    if (!loginInput || !password) {
      return res.status(400).json({ error: "Email or Mobile Number and password are required", success: false });
    }

    const cleanInput = loginInput.toLowerCase();
    const digitsOnly = loginInput.replace(/\D/g, "");

    // 1. Find user by email or direct phone match
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: cleanInput, mode: "insensitive" } },
          { phone: { equals: loginInput } },
          ...(digitsOnly.length >= 7 ? [{ phone: { contains: digitsOnly } }] : []),
        ],
      },
      include: {
        tenant: { include: { branding: true } },
        userRoles: {
          include: {
            role: {
              include: { rolePermissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    // 2. Fallback: Search via Staff phone number link if not found directly
    if (!user && digitsOnly.length >= 7) {
      const staffMatch = await prisma.staff.findFirst({
        where: { phone: { contains: digitsOnly } },
        include: {
          user: {
            include: {
              tenant: { include: { branding: true } },
              userRoles: {
                include: {
                  role: {
                    include: { rolePermissions: { include: { permission: true } } },
                  },
                },
              },
            },
          },
        },
      });

      if (staffMatch && staffMatch.user) {
        user = staffMatch.user;
      }
    }

    if (!user) {
      return res.status(401).json({ error: "Invalid Email / Mobile Number or Password", success: false });
    }

    if (user.tenant && user.tenant.status === "PENDING_APPROVAL") {
      return res.status(403).json({
        error: "Your facility registration is pending approval from the System Administrator.",
        success: false,
      });
    }

    if (user.tenant && user.tenant.status === "REJECTED") {
      return res.status(403).json({
        error: "Your facility registration request was not approved by the System Administrator.",
        success: false,
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: "Your user account registration is pending approval by your Gym Facility Owner or Administrator.",
        success: false,
      });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid Email / Mobile Number or Password", success: false });
    }

    let roleName = user.isSuperAdmin ? "Super Admin" : "Gym Owner";
    const permissionsSet = new Set<string>();

    for (const ur of user.userRoles) {
      roleName = ur.role.name;
      for (const rp of ur.role.rolePermissions) {
        permissionsSet.add(rp.permission.code);
      }
    }

    const token = await signJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      role: roleName,
      permissions: Array.from(permissionsSet),
      isSuperAdmin: user.isSuperAdmin,
    });

    await logAuditAction({
      tenantId: user.tenantId,
      userId: user.id,
      action: "USER_LOGIN",
      entity: "USER",
      entityId: user.id,
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        tenantId: user.tenantId,
        role: roleName,
        isSuperAdmin: user.isSuperAdmin,
        branding: user.tenant?.branding || null,
      },
    });
  } catch (error: any) {
    console.error("❌ Login Auth Error:", error);
    return res.status(500).json({
      error: "Authentication server error",
      details: error?.message || String(error),
      success: false,
    });
  }
});

router.get("/me", tenantAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  let branding = null;
  if (req.tenantId && req.tenantId !== "platform") {
    branding = await prisma.tenantBranding.findUnique({
      where: { tenantId: req.tenantId },
    });
  }

  return res.json({
    success: true,
    user: {
      ...req.user,
      branding,
    },
  });
});

router.post("/logout", (req, res) => {
  res.json({ success: true, message: "Logged out" });
});

export default router;
