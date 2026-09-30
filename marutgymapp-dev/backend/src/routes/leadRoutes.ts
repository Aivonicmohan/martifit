import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { tenantAuthMiddleware, AuthenticatedRequest } from "../lib/tenantContext";

const router = Router();

// ======================================================
// PUBLIC ENDPOINTS (No Authentication Required for Prospects)
// ======================================================

// 1. PUBLIC: GET /api/v1/leads/public/gym-info/:slug - Get Gym Facility details & plans for public inquiry form
router.get("/public/gym-info/:slug", async (req, res: Response) => {
  try {
    const { slug } = req.params;
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { slug },
          { id: slug },
          { businessCode: slug }
        ],
        status: "ACTIVE"
      },
      include: {
        branding: true,
        membershipPlans: {
          where: { isActive: true },
          orderBy: { price: "asc" }
        }
      }
    });

    if (!tenant) {
      return res.status(404).json({ error: "Gym facility not found or inactive", success: false });
    }

    return res.json({
      success: true,
      gym: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        businessCode: tenant.businessCode,
        branding: tenant.branding,
        plans: tenant.membershipPlans
      }
    });
  } catch (error: any) {
    console.error("❌ Error fetching public gym info:", error);
    return res.status(500).json({ error: "Failed to fetch gym details", success: false });
  }
});

// 2. PUBLIC: POST /api/v1/leads/public/submit - Submit public inquiry / trial booking
router.post("/public/submit", async (req, res: Response) => {
  try {
    const {
      slug,
      name,
      phone,
      email,
      interestedPlanId,
      notes,
      source,
      howDidYouFindUs,
      referrerName,
      referrerPhone,
      otherSourceDetails,
    } = req.body;

    if (!slug || !name || !phone) {
      return res.status(400).json({ error: "Gym Facility, Full Name, and Phone Number are required", success: false });
    }

    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { slug },
          { id: slug },
          { businessCode: slug }
        ],
        status: "ACTIVE"
      }
    });

    if (!tenant) {
      return res.status(404).json({ error: "Gym facility not found", success: false });
    }

    // Determine final source string
    let finalSource = source || howDidYouFindUs || "PUBLIC_QR";
    if (finalSource === "DIRECT_WALK_IN") finalSource = "WALK_IN";

    // Build detailed source notes
    let extraNotes: string[] = [];
    if (notes) extraNotes.push(notes);

    if ((howDidYouFindUs === "REFERENCE" || source === "REFERENCE") && (referrerName || referrerPhone)) {
      const refDetails = [
        referrerName ? `Name: ${referrerName}` : null,
        referrerPhone ? `Contact: ${referrerPhone}` : null,
      ]
        .filter(Boolean)
        .join(", ");
      if (refDetails) {
        extraNotes.push(`[Referred by: ${refDetails}]`);
      }
    } else if ((howDidYouFindUs === "OTHERS" || source === "OTHERS") && otherSourceDetails) {
      extraNotes.push(`[Source Detail: ${otherSourceDetails}]`);
    }

    const combinedNotes = extraNotes.length > 0 ? extraNotes.join("\n") : "Submitted via Public Inquiry / QR Form";

    const lead = await prisma.lead.create({
      data: {
        tenantId: tenant.id,
        name,
        phone,
        email: email || null,
        source: finalSource,
        interestedPlanId: interestedPlanId || null,
        status: "NEW",
        notes: combinedNotes,
      },
      include: {
        interestedPlan: true
      }
    });

    return res.json({
      success: true,
      message: `Thank you, ${name}! Your inquiry has been submitted to ${tenant.name}. Our team will contact you shortly!`,
      leadId: lead.id
    });
  } catch (error: any) {
    console.error("❌ Error submitting public inquiry:", error);
    return res.status(500).json({ error: "Failed to submit inquiry", success: false });
  }
});

// ======================================================
// AUTHENTICATED CRM ENDPOINTS (Gym Owners & Staff)
// ======================================================

// 3. GET /api/v1/leads - Fetch all leads for active tenant with pipeline stats
router.get("/", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId;
    const status = req.query.status as string;
    const search = (req.query.search as string) || "";

    const whereClause: any = { tenantId };
    if (status && status !== "ALL") {
      whereClause.status = status;
    }
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where: whereClause,
      include: {
        interestedPlan: true,
        assignedStaff: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate Pipeline Stage Summary Counts
    const allTenantLeads = await prisma.lead.findMany({
      where: { tenantId },
      select: { status: true }
    });

    const stats = {
      total: allTenantLeads.length,
      newCount: allTenantLeads.filter(l => l.status === "NEW").length,
      followUpCount: allTenantLeads.filter(l => l.status === "FOLLOW_UP").length,
      prospectCount: allTenantLeads.filter(l => l.status === "PROSPECT").length,
      wonCount: allTenantLeads.filter(l => l.status === "CLOSED_WON").length,
      lostCount: allTenantLeads.filter(l => l.status === "CLOSED_LOST").length,
    };

    return res.json({ success: true, leads, stats, count: leads.length });
  } catch (error: any) {
    console.error("❌ Error fetching CRM leads:", error);
    return res.status(500).json({ error: "Failed to fetch CRM leads", success: false });
  }
});

// 4. POST /api/v1/leads - Manually create lead in CRM
router.post("/", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { name, phone, email, source = "WALK_IN", interestedPlanId, assignedStaffId, followUpDate, status = "NEW", notes } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: "Full Name and Phone Number are required", success: false });
    }

    const lead = await prisma.lead.create({
      data: {
        tenantId,
        name,
        phone,
        email: email || null,
        source,
        interestedPlanId: interestedPlanId || null,
        assignedStaffId: assignedStaffId || null,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        status,
        notes: notes || null,
      },
      include: {
        interestedPlan: true,
        assignedStaff: { select: { id: true, name: true } }
      }
    });

    return res.json({ success: true, lead, message: "Lead added successfully!" });
  } catch (error: any) {
    console.error("❌ Error creating lead:", error);
    return res.status(500).json({ error: "Failed to create lead", success: false });
  }
});

// 5. PUT /api/v1/leads/:id - Update lead details / status progression
router.put("/:id", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, email, source, interestedPlanId, assignedStaffId, followUpDate, status, notes } = req.body;

    const existing = await prisma.lead.findFirst({
      where: { id, tenantId: req.tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: "Lead record not found", success: false });
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(email !== undefined && { email }),
        ...(source && { source }),
        ...(interestedPlanId !== undefined && { interestedPlanId }),
        ...(assignedStaffId !== undefined && { assignedStaffId }),
        ...(followUpDate !== undefined && { followUpDate: followUpDate ? new Date(followUpDate) : null }),
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        interestedPlan: true,
        assignedStaff: { select: { id: true, name: true } }
      }
    });

    return res.json({ success: true, lead: updatedLead, message: "Lead updated successfully!" });
  } catch (error: any) {
    console.error("❌ Error updating lead:", error);
    return res.status(500).json({ error: "Failed to update lead", success: false });
  }
});

// 6. DELETE /api/v1/leads/:id - Delete lead
router.delete("/:id", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.lead.findFirst({
      where: { id, tenantId: req.tenantId }
    });

    if (!existing) {
      return res.status(404).json({ error: "Lead record not found", success: false });
    }

    await prisma.lead.delete({ where: { id } });

    return res.json({ success: true, message: "Lead deleted successfully" });
  } catch (error: any) {
    console.error("❌ Error deleting lead:", error);
    return res.status(500).json({ error: "Failed to delete lead", success: false });
  }
});

export default router;
