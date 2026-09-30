import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { tenantAuthMiddleware, AuthenticatedRequest } from "../lib/tenantContext";

const router = Router();
const prisma = new PrismaClient();

// Helper to extract YouTube embed ID or video URL (handles Shorts, watch, youtu.be, m.youtube)
function formatYoutubeUrl(url: string): string {
  if (!url) return "";
  let clean = url.trim();

  // 1. YouTube Shorts: youtube.com/shorts/VIDEO_ID or m.youtube.com/shorts/VIDEO_ID
  if (clean.includes("/shorts/")) {
    const match = clean.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) return `https://www.youtube.com/embed/${match[1]}`;
  }

  // 2. Standard Watch: youtube.com/watch?v=VIDEO_ID or m.youtube.com/watch?v=VIDEO_ID
  if (clean.includes("watch?v=")) {
    const match = clean.match(/v=([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) return `https://www.youtube.com/embed/${match[1]}`;
  }

  // 3. Short URL: youtu.be/VIDEO_ID
  if (clean.includes("youtu.be/")) {
    const match = clean.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) return `https://www.youtube.com/embed/${match[1]}`;
  }

  // 4. Embed URL: youtube.com/embed/VIDEO_ID
  if (clean.includes("/embed/")) {
    const match = clean.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) return `https://www.youtube.com/embed/${match[1]}`;
  }

  return clean;
}

// ==========================================
// PUBLIC ENDPOINTS
// ==========================================

// 1. PUBLIC: GET /api/v1/public/competitions - List active open competitions
router.get("/public/competitions", async (req: Request, res: Response) => {
  try {
    const { code, tenantId } = req.query;

    let targetTenantId: string | null = (tenantId as string) || null;

    if (!targetTenantId && code) {
      const codeStr = String(code).trim();
      const tenant = await prisma.tenant.findFirst({
        where: { businessCode: codeStr },
        select: { id: true }
      });
      if (tenant) {
        targetTenantId = tenant.id;
      }
    }

    // Fetch open competitions (global + facility-specific if tenantId provided)
    const competitions = await prisma.competition.findMany({
      where: {
        status: "OPEN",
        OR: [
          { tenantId: null },
          ...(targetTenantId ? [{ tenantId: targetTenantId }] : [])
        ]
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ success: true, competitions });
  } catch (error: any) {
    console.error("❌ Error fetching public competitions:", error);
    return res.status(500).json({ error: error?.message || "Failed to fetch competitions", success: false });
  }
});

// 2. PUBLIC: POST /api/v1/public/competitions/submit - Submit competition entry
router.post("/public/competitions/submit", async (req: Request, res: Response) => {
  try {
    const { code, tenantId, competitionId, participantName, participantPhone, metricValue, youtubeUrl, notes } = req.body;

    if (!participantName || !participantPhone || !competitionId || metricValue === undefined || !youtubeUrl) {
      return res.status(400).json({
        error: "Full name, phone number, competition event, vitals, and YouTube video link are required.",
        success: false
      });
    }

    let resolvedTenantId: string | null = tenantId || null;

    if (!resolvedTenantId && code) {
      const codeStr = String(code).trim();
      const tenant = await prisma.tenant.findFirst({
        where: { businessCode: codeStr },
        select: { id: true }
      });
      if (tenant) resolvedTenantId = tenant.id;
    }

    if (!resolvedTenantId) {
      // Fallback to first active tenant if code omitted
      const defaultTenant = await prisma.tenant.findFirst({ select: { id: true } });
      if (defaultTenant) resolvedTenantId = defaultTenant.id;
    }

    if (!resolvedTenantId) {
      return res.status(400).json({ error: "Invalid facility code.", success: false });
    }

    const comp = await prisma.competition.findUnique({
      where: { id: competitionId }
    });

    if (!comp) {
      return res.status(404).json({ error: "Competition event not found.", success: false });
    }

    const numericValue = parseFloat(metricValue);
    if (isNaN(numericValue) || numericValue < 0) {
      return res.status(400).json({ error: "Please enter a valid numeric performance metric.", success: false });
    }

    const cleanYoutubeUrl = formatYoutubeUrl(String(youtubeUrl));

    const submission = await prisma.competitionSubmission.create({
      data: {
        competitionId,
        tenantId: resolvedTenantId,
        participantName: String(participantName).trim(),
        participantPhone: String(participantPhone).trim(),
        metricValue: numericValue,
        youtubeUrl: cleanYoutubeUrl,
        notes: notes ? String(notes).trim() : null,
        status: "SUBMITTED"
      },
      include: {
        competition: true,
        tenant: {
          select: { name: true, businessCode: true, branding: { select: { businessName: true } } }
        }
      }
    });

    // Compute participant's current rank in this competition
    const higherSubmissionsCount = await prisma.competitionSubmission.count({
      where: {
        competitionId,
        metricValue: { gt: numericValue }
      }
    });

    const rank = higherSubmissionsCount + 1;

    return res.json({
      success: true,
      message: "Competition entry submitted successfully!",
      submission,
      rank
    });
  } catch (error: any) {
    console.error("❌ Competition submission error:", error);
    return res.status(500).json({ error: error?.message || "Failed to submit competition entry", success: false });
  }
});

// ==========================================
// ADMIN ENDPOINTS (AUTHENTICATED)
// ==========================================

// 3. GET /api/v1/tenants/competitions & GET /api/v1/competitions - List all competitions for Admin Center
router.get(["/competitions", "/tenants/competitions"], tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdmin = req.user?.isSuperAdmin;
    const tenantId = req.tenantId || req.user?.tenantId;

    const whereCondition = isSuperAdmin
      ? {}
      : { OR: [{ tenantId: null }, ...(tenantId ? [{ tenantId }] : [])] };

    const competitions = await prisma.competition.findMany({
      where: whereCondition,
      include: {
        _count: { select: { submissions: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ success: true, competitions });
  } catch (error: any) {
    console.error("❌ Error fetching competitions for admin:", error);
    return res.status(500).json({ error: error?.message || "Failed to fetch competitions", success: false });
  }
});

// 4. POST /api/v1/tenants/competitions & POST /api/v1/competitions - Create new competition event
router.post(["/competitions", "/tenants/competitions"], tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, category, metricType, metricUnit, description, status } = req.body;

    if (!title || !category) {
      return res.status(400).json({ error: "Competition title and category are required", success: false });
    }

    let targetTenantId: string | null = null;
    if (!req.user?.isSuperAdmin) {
      const candidateTenantId = req.tenantId || req.user?.tenantId;
      if (candidateTenantId && candidateTenantId !== "platform") {
        const tenantExists = await prisma.tenant.findUnique({ where: { id: candidateTenantId } });
        if (tenantExists) {
          targetTenantId = candidateTenantId;
        }
      }
    }

    const competition = await prisma.competition.create({
      data: {
        title: String(title).trim(),
        category: String(category).trim().toUpperCase(),
        metricType: metricType || "REPS",
        metricUnit: metricUnit || (metricType === "DURATION" ? "seconds" : metricType === "COUNT" ? "points" : "reps"),
        description: description ? String(description).trim() : null,
        status: status || "OPEN",
        tenantId: targetTenantId
      }
    });

    console.log("✅ Competition created successfully:", competition.id);

    return res.json({ success: true, message: "Competition created successfully!", competition });
  } catch (error: any) {
    console.error("❌ Error creating competition:", error);
    return res.status(500).json({ error: error?.message || "Failed to create competition", success: false });
  }
});

// 5. DELETE /api/v1/tenants/competitions/:id & DELETE /api/v1/competitions/:id - Delete/remove competition event
router.delete(["/competitions/:id", "/tenants/competitions/:id"], tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.competition.delete({
      where: { id }
    });

    return res.json({ success: true, message: "Competition deleted successfully!" });
  } catch (error: any) {
    console.error("❌ Error deleting competition:", error);
    return res.status(500).json({ error: error?.message || "Failed to delete competition", success: false });
  }
});

// 6. GET /api/v1/tenants/competitions/:id/leaderboard & GET /api/v1/competitions/:id/leaderboard
router.get(["/competitions/:id/leaderboard", "/tenants/competitions/:id/leaderboard"], tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const competition = await prisma.competition.findUnique({
      where: { id }
    });

    if (!competition) {
      return res.status(404).json({ error: "Competition not found", success: false });
    }

    // Fetch submissions sorted in descending order by metricValue
    const submissions = await prisma.competitionSubmission.findMany({
      where: { competitionId: id },
      include: {
        tenant: {
          select: { name: true, businessCode: true, branding: { select: { businessName: true } } }
        }
      },
      orderBy: { metricValue: "desc" }
    });

    // Add rank index to each submission
    const rankedSubmissions = submissions.map((sub, idx) => ({
      ...sub,
      rank: idx + 1
    }));

    return res.json({
      success: true,
      competition,
      submissions: rankedSubmissions
    });
  } catch (error: any) {
    console.error("❌ Error fetching leaderboard:", error);
    return res.status(500).json({ error: error?.message || "Failed to fetch leaderboard", success: false });
  }
});

// 7. PATCH /api/v1/tenants/competitions/submissions/:id/status & PATCH /api/v1/competitions/submissions/:id/status
router.patch(["/competitions/submissions/:id/status", "/tenants/competitions/submissions/:id/status"], tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["SUBMITTED", "VERIFIED_FINALIST", "DISQUALIFIED"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value", success: false });
    }

    const updated = await prisma.competitionSubmission.update({
      where: { id },
      data: { status }
    });

    return res.json({ success: true, message: `Submission status updated to ${status}`, submission: updated });
  } catch (error: any) {
    console.error("❌ Error updating submission status:", error);
    return res.status(500).json({ error: error?.message || "Failed to update status", success: false });
  }
});

export default router;
