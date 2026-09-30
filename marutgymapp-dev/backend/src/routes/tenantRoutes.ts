import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/jwt";
import { tenantAuthMiddleware, AuthenticatedRequest } from "../lib/tenantContext";

const router = Router();

// 1. PUBLIC: GET /api/v1/tenants/public-list - List active gym facilities & staff roles
router.get("/public-list", async (req, res: Response) => {
  try {
    const activeTenants = await prisma.tenant.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        slug: true,
        branding: {
          select: {
            businessName: true,
            address: true,
            contactPhone: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const availableRoles = [
      { id: "MANAGER", title: "General Manager / Facility Admin" },
      { id: "TRAINER", title: "Gym Trainer / Fitness Coach" },
      { id: "RECEPTIONIST", title: "Front Desk / Receptionist" },
      { id: "ACCOUNTANT", title: "Finance / Accountant" },
      { id: "STAFF", title: "Operations / Support Staff" },
    ];

    return res.json({ success: true, facilities: activeTenants, roles: availableRoles });
  } catch (error: any) {
    console.error("❌ Error fetching public facilities:", error);
    return res.status(500).json({ error: "Failed to fetch gym list", success: false });
  }
});

// 2. PUBLIC: POST /api/v1/tenants/register - Self-service facility signup
router.post("/register", async (req, res: Response) => {
  try {
    const { gymName, location, contactPhone, contactEmail, ownerName, password } = req.body;

    if (!gymName || !contactPhone || !contactEmail || !ownerName || !password) {
      return res.status(400).json({
        error: "Gym Name, Phone, Email, Owner Name, and Password are required",
        success: false,
      });
    }

    const cleanEmail = String(contactEmail).trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      return res.status(400).json({
        error: "An account with this email address already exists.",
        success: false,
      });
    }

    // Generate unique slug
    let baseSlug = gymName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "gym";
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.tenant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const passwordHash = await hashPassword(password);

    // Auto-generate 4-digit numeric business code starting at 1001
    const allTenantsWithCode = await prisma.tenant.findMany({
      where: { businessCode: { not: null } },
      select: { businessCode: true }
    });
    let maxBizCode = 1000;
    for (const t of allTenantsWithCode) {
      if (t.businessCode) {
        const num = parseInt(t.businessCode, 10);
        if (!isNaN(num) && num > maxBizCode) {
          maxBizCode = num;
        }
      }
    }
    const businessCode = String(maxBizCode + 1);

    // Create Tenant in PENDING_APPROVAL status
    const tenant = await prisma.tenant.create({
      data: {
        name: gymName,
        slug,
        businessCode,
        status: "PENDING_APPROVAL",
        branding: {
          create: {
            businessName: gymName,
            address: location || null,
            contactPhone,
            contactEmail: cleanEmail,
            whatsappNumber: contactPhone,
          },
        },
      },
    });

    // Create Owner User (disabled until approved)
    await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: cleanEmail,
        phone: contactPhone,
        passwordHash,
        name: `${ownerName} (Owner)`,
        isSuperAdmin: false,
        isActive: false, // Inactive until approved by Super Admin
      },
    });

    return res.json({
      success: true,
      message: "Facility registration submitted successfully and is pending approval by the System Administrator.",
      tenantId: tenant.id,
    });
  } catch (error: any) {
    console.error("❌ Error registering facility:", error);
    return res.status(500).json({ error: "Failed to register gym facility", details: error?.message, success: false });
  }
});

// 3. PUBLIC: POST /api/v1/tenants/register-user - Register user under an existing gym facility
router.post("/register-user", async (req, res: Response) => {
  try {
    const { tenantId, name, email, phone, staffType, password } = req.body;

    if (!tenantId || !name || !phone || !password) {
      return res.status(400).json({
        error: "Facility, Full Name, Phone, and Password are required",
        success: false,
      });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant || tenant.status !== "ACTIVE") {
      return res.status(404).json({ error: "Selected Gym Facility is invalid or inactive.", success: false });
    }

    const cleanEmail = email ? String(email).trim().toLowerCase() : `${phone.replace(/\D/g, "")}@user.gym`;
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: cleanEmail },
          { phone },
        ],
      },
    });

    if (existingUser) {
      return res.status(400).json({
        error: "An account with this email address or mobile phone number already exists.",
        success: false,
      });
    }

    const passwordHash = await hashPassword(password);
    const chosenRole = staffType || "STAFF";

    // Create User (disabled until approved by Gym Owner)
    const user = await prisma.user.create({
      data: {
        tenantId,
        email: cleanEmail,
        phone,
        passwordHash,
        name,
        isSuperAdmin: false,
        isActive: false, // Inactive until approved by Gym Owner / Admin
      },
    });

    // Create Staff record linked to User
    await prisma.staff.create({
      data: {
        tenantId,
        userId: user.id,
        name,
        phone,
        email: cleanEmail,
        staffType: chosenRole,
        roleTitle: chosenRole.replace(/_/g, " "),
        department: "OPERATIONS",
        isActive: false, // Pending approval
      },
    });

    return res.json({
      success: true,
      message: `User registration submitted for "${tenant.name}"! Your account is pending approval by your Gym Facility Owner or Administrator.`,
      userId: user.id,
    });
  } catch (error: any) {
    console.error("❌ Error registering gym user:", error);
    return res.status(500).json({ error: "Failed to register user account", details: error?.message, success: false });
  }
});

// 3b. SUPER ADMIN ONLY: POST /api/v1/tenants/create - Create gym facility directly from Super Admin
router.post("/create", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ error: "Forbidden: Super Admin access required", success: false });
  }

  try {
    const { gymName, location, contactPhone, contactEmail, ownerName, password } = req.body;

    if (!gymName || !contactPhone || !contactEmail || !ownerName || !password) {
      return res.status(400).json({
        error: "Gym Name, Phone, Email, Owner Name, and Password are required",
        success: false,
      });
    }

    const cleanEmail = String(contactEmail).trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      return res.status(400).json({
        error: "An account with this email address already exists.",
        success: false,
      });
    }

    // Generate unique slug
    let baseSlug = gymName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "gym";
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.tenant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const passwordHash = await hashPassword(password);

    // Auto-generate 4-digit numeric business code starting at 1001
    const allTenantsWithCode = await prisma.tenant.findMany({
      where: { businessCode: { not: null } },
      select: { businessCode: true }
    });
    let maxBizCode = 1000;
    for (const t of allTenantsWithCode) {
      if (t.businessCode) {
        const num = parseInt(t.businessCode, 10);
        if (!isNaN(num) && num > maxBizCode) {
          maxBizCode = num;
        }
      }
    }
    const businessCode = String(maxBizCode + 1);

    // Create Tenant directly in ACTIVE status
    const tenant = await prisma.tenant.create({
      data: {
        name: gymName,
        slug,
        businessCode,
        status: "ACTIVE",
        branding: {
          create: {
            businessName: gymName,
            address: location || null,
            contactPhone,
            contactEmail: cleanEmail,
            whatsappNumber: contactPhone,
          },
        },
      },
    });

    // Create Owner User (Active)
    await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: cleanEmail,
        phone: contactPhone,
        passwordHash,
        name: `${ownerName} (Owner)`,
        isSuperAdmin: false,
        isActive: true,
      },
    });

    return res.json({
      success: true,
      message: `Facility "${gymName}" created successfully with Business Code ${businessCode}!`,
      tenant,
    });
  } catch (error: any) {
    console.error("❌ Error creating facility:", error);
    return res.status(500).json({ error: "Failed to create gym facility", details: error?.message, success: false });
  }
});

// 4. SUPER ADMIN ONLY: GET /api/v1/tenants/pending - List all pending gym signups
router.get("/pending", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ error: "Forbidden: Super Admin access required", success: false });
  }

  try {
    const pendingTenants = await prisma.tenant.findMany({
      where: { status: "PENDING_APPROVAL" },
      include: {
        branding: true,
        users: { select: { id: true, name: true, email: true, createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, pending: pendingTenants });
  } catch (error: any) {
    console.error("❌ Error fetching pending tenants:", error);
    return res.status(500).json({ error: "Failed to fetch pending facility signups", success: false });
  }
});

// 5. SUPER ADMIN ONLY: GET /api/v1/tenants/all - List all active/non-deleted gym facilities
router.get("/all", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ error: "Forbidden: Super Admin access required", success: false });
  }

  try {
    const tenants = await prisma.tenant.findMany({
      where: { status: { notIn: ["DELETED"] } },
      include: {
        branding: true,
        users: { select: { id: true, name: true, email: true, phone: true, isActive: true } },
        _count: { select: { members: true, staff: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, tenants });
  } catch (error: any) {
    console.error("❌ Error fetching all tenants:", error);
    return res.status(500).json({ error: "Failed to fetch facilities", success: false });
  }
});

// 5b. SUPER ADMIN ONLY: GET /api/v1/tenants/trash - List all deleted facilities in Trash
router.get("/trash", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ error: "Forbidden: Super Admin access required", success: false });
  }

  try {
    const trashTenants = await prisma.tenant.findMany({
      where: { status: "DELETED" },
      include: {
        branding: true,
        users: { select: { id: true, name: true, email: true, phone: true, isActive: true } },
        _count: { select: { members: true, staff: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return res.json({ success: true, trash: trashTenants });
  } catch (error: any) {
    console.error("❌ Error fetching trash tenants:", error);
    return res.status(500).json({ error: "Failed to fetch trash facilities", success: false });
  }
});

// 6. SUPER ADMIN ONLY: POST /api/v1/tenants/:id/approve - Approve & Activate Gym Facility
router.post("/:id/approve", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ error: "Forbidden: Super Admin access required", success: false });
  }

  try {
    const { id } = req.params;

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return res.status(404).json({ error: "Gym Facility not found", success: false });
    }

    // Activate Tenant
    await prisma.tenant.update({
      where: { id },
      data: { status: "ACTIVE" },
    });

    // Activate Owner & Users
    await prisma.user.updateMany({
      where: { tenantId: id },
      data: { isActive: true },
    });

    return res.json({ success: true, message: `Gym Facility "${tenant.name}" has been approved and activated!` });
  } catch (error: any) {
    console.error("❌ Error approving tenant:", error);
    return res.status(500).json({ error: "Failed to approve gym facility", success: false });
  }
});

// 7. SUPER ADMIN ONLY: POST /api/v1/tenants/:id/reject - Reject Gym Facility Registration
router.post("/:id/reject", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ error: "Forbidden: Super Admin access required", success: false });
  }

  try {
    const { id } = req.params;

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return res.status(404).json({ error: "Gym Facility not found", success: false });
    }

    await prisma.tenant.update({
      where: { id },
      data: { status: "REJECTED" },
    });

    await prisma.user.updateMany({
      where: { tenantId: id },
      data: { isActive: false },
    });

    return res.json({ success: true, message: `Facility registration for "${tenant.name}" has been rejected.` });
  } catch (error: any) {
    console.error("❌ Error rejecting tenant:", error);
    return res.status(500).json({ error: "Failed to reject gym facility", success: false });
  }
});

// 8. SUPER ADMIN ONLY: POST /api/v1/tenants/:id/restore - Restore Gym Facility from Trash
router.post("/:id/restore", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ error: "Forbidden: Super Admin access required", success: false });
  }

  try {
    const { id } = req.params;

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return res.status(404).json({ error: "Gym Facility not found", success: false });
    }

    await prisma.tenant.update({
      where: { id },
      data: { status: "ACTIVE" },
    });

    await prisma.user.updateMany({
      where: { tenantId: id },
      data: { isActive: true },
    });

    return res.json({ success: true, message: `Gym Facility "${tenant.name}" has been restored to Active status!` });
  } catch (error: any) {
    console.error("❌ Error restoring tenant:", error);
    return res.status(500).json({ error: "Failed to restore gym facility", success: false });
  }
});

// 9. SUPER ADMIN ONLY: DELETE /api/v1/tenants/:id - Move Gym Facility to Trash (Soft Delete)
router.delete("/:id", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ error: "Forbidden: Super Admin access required", success: false });
  }

  try {
    const { id } = req.params;

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return res.status(404).json({ error: "Gym Facility not found", success: false });
    }

    await prisma.tenant.update({
      where: { id },
      data: { status: "DELETED" },
    });

    await prisma.user.updateMany({
      where: { tenantId: id },
      data: { isActive: false },
    });

    return res.json({ success: true, message: `Gym Facility "${tenant.name}" moved to Trash.` });
  } catch (error: any) {
    console.error("❌ Error soft deleting tenant:", error);
    return res.status(500).json({ error: "Failed to move gym facility to trash", success: false });
  }
});

// 9b. SUPER ADMIN ONLY: DELETE /api/v1/tenants/:id/permanent - Permanently Hard Delete Gym Facility
router.delete("/:id/permanent", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ error: "Forbidden: Super Admin access required", success: false });
  }

  try {
    const { id } = req.params;

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return res.status(404).json({ error: "Gym Facility not found", success: false });
    }

    await prisma.tenant.delete({ where: { id } });

    return res.json({ success: true, message: `Gym Facility "${tenant.name}" has been permanently deleted.` });
  } catch (error: any) {
    console.error("❌ Error permanently deleting tenant:", error);
    return res.status(500).json({ error: "Failed to permanently delete gym facility", success: false });
  }
});

// 10. SUPER ADMIN ONLY: GET /api/v1/tenants/dashboard-stats - SaaS Platform Overview Stats
router.get("/dashboard-stats", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ error: "Forbidden: Super Admin access required", success: false });
  }

  try {
    const allTenants = await prisma.tenant.findMany({
      where: { status: { notIn: ["DELETED"] } },
      include: {
        branding: true,
        users: { select: { id: true, name: true, email: true, phone: true } },
        _count: { select: { members: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const todayDate = now.getDate();

    const startOfToday = new Date(currentYear, currentMonth, todayDate, 0, 0, 0);
    const endOfToday = new Date(currentYear, currentMonth, todayDate, 23, 59, 59);

    const endOfWeek = new Date(currentYear, currentMonth, todayDate + 7, 23, 59, 59);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    const totalFacilities = allTenants.length;

    // Helper to calculate next payment due date for facility
    const mapTenantWithDueDate = (t: any) => {
      const created = new Date(t.createdAt);
      let dueDay = created.getDate();
      let dueDate = new Date(currentYear, currentMonth, Math.min(dueDay, 28));

      if (dueDate < startOfToday) {
        // Passed this month's due date, set next month
        dueDate = new Date(currentYear, currentMonth + 1, Math.min(dueDay, 28));
      }

      const isDueToday = dueDate >= startOfToday && dueDate <= endOfToday;
      const isDueThisWeek = dueDate >= startOfToday && dueDate <= endOfWeek;
      const isDueThisMonth = dueDate >= startOfToday && dueDate <= endOfMonth;

      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        status: t.status,
        createdAt: t.createdAt,
        branding: t.branding,
        owner: t.users?.[0] || null,
        membersCount: t._count?.members || 0,
        dueDate: dueDate.toISOString(),
        isDueToday,
        isDueThisWeek,
        isDueThisMonth,
        subscriptionFee: 2999, // Base monthly SaaS fee
      };
    };

    const formattedTenants = allTenants.map(mapTenantWithDueDate);

    const dueTodayList = formattedTenants.filter((t) => t.isDueToday);
    const dueThisWeekList = formattedTenants.filter((t) => t.isDueThisWeek);
    const dueThisMonthList = formattedTenants.filter((t) => t.isDueThisMonth);

    return res.json({
      success: true,
      stats: {
        totalFacilities,
        dueTodayCount: dueTodayList.length,
        dueThisWeekCount: dueThisWeekList.length,
        dueThisMonthCount: dueThisMonthList.length,
        allFacilities: formattedTenants,
        dueTodayList,
        dueThisWeekList,
        dueThisMonthList,
      }
    });
  } catch (error: any) {
    console.error("❌ Error fetching superadmin dashboard stats:", error);
    return res.status(500).json({ error: "Failed to fetch platform dashboard stats", success: false });
  }
});

// 11. GET /api/v1/tenants/branding - Fetch active tenant branding settings
router.get("/branding", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required", success: false });
    }

    const branding = await prisma.tenantBranding.findUnique({
      where: { tenantId },
    });

    let tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, slug: true, businessCode: true },
    });

    // Auto-generate 4-digit numeric code if missing for existing tenant
    if (tenant && !tenant.businessCode) {
      const allTenantsWithCode = await prisma.tenant.findMany({
        where: { businessCode: { not: null } },
        select: { businessCode: true }
      });
      let maxBizCode = 1000;
      for (const t of allTenantsWithCode) {
        if (t.businessCode) {
          const num = parseInt(t.businessCode, 10);
          if (!isNaN(num) && num > maxBizCode) {
            maxBizCode = num;
          }
        }
      }
      const newCode = String(maxBizCode + 1);
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { businessCode: newCode }
      });
      tenant.businessCode = newCode;
    }

    return res.json({
      success: true,
      businessCode: tenant?.businessCode || "1001",
      branding: branding || {
        businessName: tenant?.name || "My Gym Facility",
        logoUrl: null,
        contactPhone: "",
        contactEmail: "",
        address: "",
      },
    });
  } catch (error: any) {
    console.error("❌ Error fetching tenant branding:", error);
    return res.status(500).json({ error: "Failed to fetch branding settings", success: false });
  }
});

// 12. PUT /api/v1/tenants/branding - Update active tenant branding & gym logo
router.put("/branding", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID required", success: false });
    }

    const { businessName, logoUrl, contactPhone, contactEmail, address } = req.body;

    const updatedBranding = await prisma.tenantBranding.upsert({
      where: { tenantId },
      update: {
        ...(businessName && { businessName }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(contactPhone !== undefined && { contactPhone }),
        ...(contactEmail !== undefined && { contactEmail }),
        ...(address !== undefined && { address }),
      },
      create: {
        tenantId,
        businessName: businessName || "My Gym Facility",
        logoUrl: logoUrl || null,
        contactPhone: contactPhone || null,
        contactEmail: contactEmail || null,
        address: address || null,
      },
    });

    if (businessName) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { name: businessName },
      });
    }

    return res.json({
      success: true,
      message: "Branding settings and logo updated successfully!",
      branding: updatedBranding,
    });
  } catch (error: any) {
    console.error("❌ Error updating tenant branding:", error);
    return res.status(500).json({ error: "Failed to update branding settings", success: false });
  }
});

// 13. SUPER ADMIN ONLY: GET /api/v1/tenants/franchise-applications - List all franchise applications
router.get("/franchise-applications", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ error: "Forbidden: Super Admin access required", success: false });
  }

  try {
    const applications = await prisma.franchiseApplication.findMany({
      include: {
        affiliate: true
      },
      orderBy: { createdAt: "desc" }
    });

    // Resolve Facility names for codes or tenant IDs that belong to Gym Facilities
    const tenants = await prisma.tenant.findMany({
      select: { id: true, businessCode: true, name: true, branding: { select: { businessName: true } } }
    });

    const tenantMap: Record<string, string> = {};
    tenants.forEach((t) => {
      const facilityName = t.branding?.businessName || t.name;
      if (t.businessCode) {
        tenantMap[t.businessCode] = facilityName;
      }
      tenantMap[t.id] = facilityName;
    });

    const enrichedApps = applications.map((app) => {
      let referrerName = app.affiliate?.name || null;
      let referrerType = app.affiliate ? "AFFILIATE" : null;

      if (!referrerName && app.referredByCode && tenantMap[app.referredByCode]) {
        referrerName = tenantMap[app.referredByCode];
        referrerType = "FACILITY";
      }

      return {
        ...app,
        referrerName: referrerName || null,
        referrerType: referrerType || (app.referredByCode ? "CODE" : "DIRECT")
      };
    });

    return res.json({ success: true, applications: enrichedApps });
  } catch (error: any) {
    console.error("❌ Error fetching franchise applications:", error);
    return res.status(500).json({ error: "Failed to fetch franchise applications", success: false });
  }
});

// 14. SUPER ADMIN ONLY: PATCH /api/v1/tenants/franchise-applications/:id/status - Update application status
router.patch("/franchise-applications/:id/status", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ error: "Forbidden: Super Admin access required", success: false });
  }

  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const application = await prisma.franchiseApplication.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes })
      }
    });

    return res.json({ success: true, application });
  } catch (error: any) {
    console.error("❌ Error updating franchise application status:", error);
    return res.status(500).json({ error: "Failed to update application status", success: false });
  }
});

// 15. SUPER ADMIN ONLY: GET /api/v1/tenants/affiliate-partners - List all affiliate partners
router.get("/affiliate-partners", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ error: "Forbidden: Super Admin access required", success: false });
  }

  try {
    const affiliates = await prisma.affiliatePartner.findMany({
      include: {
        _count: {
          select: { applications: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ success: true, affiliates });
  } catch (error: any) {
    console.error("❌ Error fetching affiliate partners:", error);
    return res.status(500).json({ error: "Failed to fetch affiliate partners", success: false });
  }
});

// 16. SUPER ADMIN ONLY: POST /api/v1/tenants/affiliate-partners - Create affiliate partner
router.post("/affiliate-partners", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ error: "Forbidden: Super Admin access required", success: false });
  }

  try {
    const { name, phone, profession, location, code, tenantId, notes } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: "Name and phone number are required", success: false });
    }

    // Auto-generate unique affiliate code if not specified
    let affiliateCode = code ? String(code).trim() : "";
    if (!affiliateCode) {
      const allPartners = await prisma.affiliatePartner.findMany({ select: { code: true } });
      let maxAffCode = 8000;
      for (const p of allPartners) {
        const num = parseInt(p.code, 10);
        if (!isNaN(num) && num > maxAffCode) {
          maxAffCode = num;
        }
      }
      affiliateCode = String(maxAffCode + 1);
    }

    // Ensure code uniqueness
    const existing = await prisma.affiliatePartner.findUnique({ where: { code: affiliateCode } });
    if (existing) {
      return res.status(400).json({ error: `Affiliate code "${affiliateCode}" is already in use.`, success: false });
    }

    const partner = await prisma.affiliatePartner.create({
      data: {
        code: affiliateCode,
        name: name.trim(),
        phone: String(phone).trim(),
        profession: profession ? profession.trim() : null,
        location: location ? location.trim() : null,
        tenantId: tenantId || null,
        notes: notes || null
      }
    });

    return res.json({ success: true, partner });
  } catch (error: any) {
    console.error("❌ Error creating affiliate partner:", error);
    return res.status(500).json({ error: error.message || "Failed to create affiliate partner", success: false });
  }
});

// 17. SUPER ADMIN ONLY: DELETE /api/v1/tenants/affiliate-partners/:id - Delete affiliate partner
router.delete("/affiliate-partners/:id", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ error: "Forbidden: Super Admin access required", success: false });
  }

  try {
    const { id } = req.params;
    await prisma.affiliatePartner.delete({ where: { id } });
    return res.json({ success: true, message: "Affiliate partner deleted" });
  } catch (error: any) {
    console.error("❌ Error deleting affiliate partner:", error);
    return res.status(500).json({ error: "Failed to delete affiliate partner", success: false });
  }
});

// 18. SUPER ADMIN ONLY: PUT /api/v1/tenants/system-settings/:key - Update global system setting
router.put("/system-settings/:key", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ error: "Forbidden: Super Admin access required", success: false });
  }

  try {
    const { key } = req.params;
    const { value, description } = req.body;

    if (value === undefined || value === null) {
      return res.status(400).json({ error: "Value is required", success: false });
    }

    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: {
        value: String(value).trim(),
        ...(description && { description: String(description).trim() })
      },
      create: {
        key,
        value: String(value).trim(),
        description: description ? String(description).trim() : null
      }
    });

    return res.json({ success: true, setting });
  } catch (error: any) {
    console.error("❌ Error updating system setting:", error);
    return res.status(500).json({ error: "Failed to update system setting", success: false });
  }
});

export default router;
