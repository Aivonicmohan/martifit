import { Router } from "express";
import { prisma } from "../lib/prisma";
import { buildSyncCommands } from "../lib/biometricProtocolFactory";

const router = Router();

router.get("/tenants/:tenantId", async (req, res) => {
  try {
    const { tenantId } = req.params;
    const branding = await prisma.tenantBranding.findUnique({
      where: { tenantId }
    });
    
    if (!branding) {
      return res.status(404).json({ error: "Tenant not found", success: false });
    }
    
    return res.json({ 
      success: true, 
      tenant: {
        id: tenantId,
        businessName: branding.businessName,
        logoUrl: branding.logoUrl,
      } 
    });
  } catch (error: any) {
    console.error("Public Tenant fetch error:", error);
    return res.status(500).json({ error: error.message || "Internal server error", success: false });
  }
});

// Lookup gym branding by 4-digit numeric Business Code
router.get("/tenants/by-code/:code", async (req, res) => {
  try {
    const code = req.params.code.trim();
    if (!code) {
      return res.status(400).json({ error: "Business code required", success: false });
    }

    // Try finding tenant by businessCode first
    let tenant = await prisma.tenant.findFirst({
      where: {
        businessCode: code,
        status: "ACTIVE"
      },
      include: {
        branding: true
      }
    });

    // Fallback: If code matches a tenant ID or slug
    if (!tenant) {
      tenant = await prisma.tenant.findFirst({
        where: {
          OR: [{ id: code }, { slug: code }],
          status: "ACTIVE"
        },
        include: {
          branding: true
        }
      });
    }

    if (!tenant) {
      return res.status(404).json({ error: "Invalid business code", success: false });
    }

    return res.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        businessCode: tenant.businessCode,
        businessName: tenant.branding?.businessName || tenant.name,
        logoUrl: tenant.branding?.logoUrl || null
      }
    });
  } catch (error: any) {
    console.error("Fetch by business code error:", error);
    return res.status(500).json({ error: error.message || "Internal server error", success: false });
  }
});

router.post("/members", async (req, res) => {
  try {
    const { 
      tenantId, firstName, lastName = "", gender = "Male", phone, email, avatarUrl,
      dateOfBirth, anniversaryDate, group, source, occupation, bloodGroup
    } = req.body;
    
    if (!tenantId || !firstName || !phone) {
      return res.status(400).json({ error: "Tenant ID, first name, and phone required", success: false });
    }

    // Resolve tenant by ID, 4-digit businessCode, or slug
    const targetTenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { id: tenantId },
          { businessCode: tenantId },
          { slug: tenantId }
        ],
        status: "ACTIVE"
      }
    });

    if (!targetTenant) {
      return res.status(400).json({ error: "Invalid facility code or gym tenant not found", success: false });
    }

    const actualTenantId = targetTenant.id;
    const cleanPhone = String(phone).trim();

    // Prevent duplicate member records for the same phone number in the gym directory
    const existingPhoneMember = await prisma.member.findFirst({
      where: {
        tenantId: actualTenantId,
        phone: cleanPhone
      }
    });

    if (existingPhoneMember) {
      return res.status(400).json({
        error: `A member named "${existingPhoneMember.firstName} ${existingPhoneMember.lastName || ""}" already exists with phone number ${cleanPhone}.`,
        success: false
      });
    }

    // Collision-proof Member Code generation by finding highest existing numeric ID
    const allMembers = await prisma.member.findMany({
      where: { tenantId: actualTenantId },
      select: { memberCode: true }
    });

    let maxCode = 1480;
    for (const m of allMembers) {
      const num = parseInt(m.memberCode, 10);
      if (!isNaN(num) && num > maxCode) {
        maxCode = num;
      }
    }
    const memberCode = String(maxCode + 1);

    const member = await prisma.member.create({
      data: {
        tenantId: actualTenantId,
        memberCode,
        firstName,
        lastName,
        gender,
        phone: cleanPhone,
        email: email || `${firstName.toLowerCase()}.${memberCode}@example.com`,
        status: "ACTIVE", // Or INACTIVE if preferred
        externalBiometricId: memberCode,
        ...(avatarUrl && { avatarUrl }),
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        ...(anniversaryDate && { anniversaryDate: new Date(anniversaryDate) }),
        ...(group && { group }),
        ...(source && { source }),
        ...(occupation && { occupation }),
        ...(bloodGroup && { bloodGroup })
      },
    });

    // Auto-enqueue sync command to linked biometric devices for QR Code registration
    try {
      const pin = member.externalBiometricId || member.memberCode;
      const devices = await prisma.attendanceDevice.findMany({ where: { tenantId: actualTenantId } });
      
      for (const dev of devices) {
        const commands = buildSyncCommands(dev.deviceType, pin, member.firstName);
        for (const command of commands) {
          await prisma.biometricCommand.create({
            data: { tenantId: actualTenantId, deviceId: dev.id, command }
          });
        }
      }
      console.log(`[Public QR Register] Auto-queued biometric sync for User ID / PIN ${pin} (${firstName} ${lastName})`);
    } catch (bioErr) {
      console.error("Warning: Failed to queue automatic biometric sync on public QR registration:", bioErr);
    }

    return res.json({ success: true, member });
  } catch (error: any) {
    console.error("Public Member registration error:", error);
    return res.status(500).json({ error: error.message || "Internal server error", success: false });
  }
});

// Equipment Complaint & Rerack Request Handler
router.post("/complaints", async (req, res) => {
  try {
    const { tenantId, memberName, memberPhone, equipmentName, issueType, notes, photoUrl } = req.body;

    if (!tenantId || !memberName || !memberPhone || !equipmentName || !issueType) {
      return res.status(400).json({
        error: "Tenant ID, member name, phone number, equipment name, and issue type are required",
        success: false
      });
    }

    const targetTenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { id: tenantId },
          { businessCode: tenantId },
          { slug: tenantId }
        ],
        status: "ACTIVE"
      }
    });

    if (!targetTenant) {
      return res.status(400).json({ error: "Invalid facility code or gym tenant not found", success: false });
    }

    const actualTenantId = targetTenant.id;

    const complaint = await prisma.equipmentComplaint.create({
      data: {
        tenantId: actualTenantId,
        memberName: memberName.trim(),
        memberPhone: String(memberPhone).trim(),
        equipmentName: equipmentName.trim(),
        issueType: issueType.trim(),
        notes: notes ? notes.trim() : null,
        photoUrl: photoUrl || null,
        status: "OPEN"
      }
    });

    return res.json({ success: true, complaint });
  } catch (error: any) {
    console.error("Equipment complaint submission error:", error);
    return res.status(500).json({ error: error.message || "Internal server error", success: false });
  }
});

// Validate Affiliate / Referral Code
router.get("/affiliate/validate/:code", async (req, res) => {
  try {
    const code = req.params.code.trim();
    if (!code) {
      return res.status(400).json({ error: "Affiliate code required", success: false });
    }

    // 1. Check AffiliatePartner model
    const partner = await prisma.affiliatePartner.findFirst({
      where: { code }
    });

    if (partner) {
      return res.json({
        success: true,
        valid: true,
        affiliate: {
          id: partner.id,
          code: partner.code,
          name: partner.name,
          profession: partner.profession || "Affiliate Partner",
          type: "AFFILIATE_PARTNER"
        }
      });
    }

    // 2. Check if code is a facility's 4-digit businessCode OR tenant ID
    const tenant = await prisma.tenant.findFirst({
      where: { OR: [{ businessCode: code }, { id: code }] },
      include: { branding: true }
    });

    if (tenant) {
      return res.json({
        success: true,
        valid: true,
        affiliate: {
          id: tenant.id,
          code: tenant.businessCode || tenant.id,
          name: tenant.branding?.businessName || tenant.name,
          profession: "Fitness Facility",
          type: "FACILITY"
        }
      });
    }

    return res.status(404).json({ error: "Invalid referral or affiliate code", success: false, valid: false });
  } catch (error: any) {
    console.error("Affiliate validation error:", error);
    return res.status(500).json({ error: error.message || "Internal server error", success: false });
  }
});

// Franchise Partner Application Submission Handler
router.post("/franchise", async (req, res) => {
  try {
    const { name, phone, email, location, profession, investmentBudget, experience, referredByCode, notes } = req.body;

    if (!name || !phone || !location) {
      return res.status(400).json({
        error: "Full name, phone number, and location are required",
        success: false
      });
    }

    let affiliateId: string | null = null;
    let refCode: string | null = null;

    if (referredByCode && String(referredByCode).trim()) {
      refCode = String(referredByCode).trim();
      // 1. Try to link to affiliate partner
      const partner = await prisma.affiliatePartner.findFirst({
        where: { code: refCode }
      });
      if (partner) {
        affiliateId = partner.id;
      } else {
        // 2. Try to link to tenant facility by businessCode or ID
        const tenant = await prisma.tenant.findFirst({
          where: { OR: [{ businessCode: refCode }, { id: refCode }] },
          select: { businessCode: true, id: true }
        });
        if (tenant) {
          refCode = tenant.businessCode || tenant.id;
        }
      }
    }

    const application = await prisma.franchiseApplication.create({
      data: {
        name: name.trim(),
        phone: String(phone).trim(),
        email: email ? email.trim() : null,
        location: location.trim(),
        profession: profession ? profession.trim() : null,
        investmentBudget: investmentBudget || null,
        experience: experience || null,
        referredByCode: refCode,
        affiliateId: affiliateId,
        notes: notes || null,
        status: "NEW"
      }
    });

    return res.json({ success: true, application });
  } catch (error: any) {
    console.error("Franchise application submission error:", error);
    return res.status(500).json({ error: error.message || "Internal server error", success: false });
  }
});

// Fetch Public System Setting by Key (e.g. franchise_target_url)
router.get("/system-settings/:key", async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await prisma.systemSetting.findUnique({
      where: { key }
    });

    return res.json({
      success: true,
      key,
      value: setting?.value || null
    });
  } catch (error: any) {
    console.error("Fetch system setting error:", error);
    return res.status(500).json({ error: error.message || "Internal server error", success: false });
  }
});

export default router;
