import { Router } from "express";
import { prisma } from "../lib/prisma";
import { tenantAuthMiddleware, AuthenticatedRequest } from "../lib/tenantContext";
import { hasPermission, PERMISSIONS, logAuditAction } from "../lib/rbac";
import { buildSyncCommands, buildBlockCommands } from "../lib/biometricProtocolFactory";
import { getCachedMembers, setCachedMembers, invalidateMemberCache } from "../lib/memberCache";

const router = Router();

router.get("/", tenantAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!hasPermission(req.user, PERMISSIONS.MEMBERS_VIEW)) {
    return res.status(403).json({ error: "Forbidden", success: false });
  }

  const tenantId = req.tenantId || "default";
  const rawSearch = ((req.query.search as string) || "").trim();
  const status = (req.query.status as string) || "ALL";

  // The members screen is refreshed frequently. Keep the list response small and
  // cache it briefly; full member details are loaded only when a member is opened.
  const cached = getCachedMembers(tenantId, rawSearch, status);
  if (cached) {
    res.setHeader("X-Members-Cache", "HIT");
    return res.json(cached);
  }

  const whereClause: any = {};
  if (req.tenantId && req.tenantId !== "platform") {
    whereClause.tenantId = req.tenantId;
  }

  if (status && status !== "ALL") {
    if (status.startsWith("EXPIRED") || status.startsWith("EXPIRING") || status === "UNKNOWN") {
      // The UI computes these derived states from the latest membership endDate.
      whereClause.status = { in: ["ACTIVE", "EXPIRED", "INACTIVE"] };
    } else {
      whereClause.status = status;
    }
  }

  if (rawSearch) {
    const orConditions: any[] = [
      { firstName: { contains: rawSearch, mode: "insensitive" } },
      { lastName: { contains: rawSearch, mode: "insensitive" } },
      { phone: { contains: rawSearch, mode: "insensitive" } },
      { memberCode: { contains: rawSearch, mode: "insensitive" } },
    ];

    const parts = rawSearch.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      orConditions.push({
        AND: [
          { firstName: { contains: parts[0], mode: "insensitive" } },
          { lastName: { contains: parts.slice(1).join(" "), mode: "insensitive" } },
        ],
      });
      orConditions.push({
        AND: [
          { firstName: { contains: parts.slice(1).join(" "), mode: "insensitive" } },
          { lastName: { contains: parts[0], mode: "insensitive" } },
        ],
      });
    }

    whereClause.OR = orConditions;
  }

  const members = await prisma.member.findMany({
    where: whereClause,
    select: {
      id: true,
      tenantId: true,
      memberCode: true,
      firstName: true,
      lastName: true,
      gender: true,
      phone: true,
      email: true,
      status: true,
      joiningDate: true,
      externalBiometricId: true,
      group: true,
      source: true,
      notes: true,
      createdAt: true,
      updatedAt: true,

      // The list screen only needs the current/latest membership to calculate
      // status and days remaining. Full history is fetched by GET /:id.
      memberships: {
        where: { deletedAt: null },
        select: {
          id: true,
          planId: true,
          status: true,
          startDate: true,
          endDate: true,
          totalAmount: true,
          paidAmount: true,
          pendingAmount: true,
          discountAmount: true,
          notes: true,
          freezeStartDate: true,
          freezeEndDate: true,
          plan: {
            select: {
              id: true,
              name: true,
              price: true,
              durationMonths: true,
              freezeDaysMax: true,
            },
          },
        },
        orderBy: { endDate: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const responseData = { success: true, members, count: members.length };
  setCachedMembers(tenantId, rawSearch, status, responseData);

  res.setHeader("X-Members-Cache", "MISS");
  res.setHeader("Cache-Control", "private, max-age=15");
  return res.json(responseData);
});

router.get("/:id", tenantAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!hasPermission(req.user, PERMISSIONS.MEMBERS_VIEW)) {
    return res.status(403).json({ error: "Forbidden", success: false });
  }

  const { id } = req.params;
  const member = await prisma.member.findFirst({
    where: {
      id,
      ...(req.tenantId && req.tenantId !== "platform" ? { tenantId: req.tenantId } : {}),
    },
    include: {
      memberships: { include: { plan: true, pauses: true }, orderBy: { createdAt: "desc" } },
      payments: { orderBy: { paymentDate: "desc" } },
      customFields: { include: { customField: true } },
    },
  });

  if (!member) {
    return res.status(404).json({ error: "Member not found", success: false });
  }

  return res.json({ success: true, member });
});

router.post("/", tenantAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!hasPermission(req.user, PERMISSIONS.MEMBERS_CREATE)) {
    return res.status(403).json({ error: "Forbidden", success: false });
  }

  try {
    const { firstName, lastName = "", gender = "Male", phone, email, planId, startDate, discountAmount, paidAmount, paymentMethod, avatarUrl } = req.body;
    if (!firstName || !phone) {
      return res.status(400).json({ error: "First name and phone required", success: false });
    }

    const cleanPhone = String(phone).trim();

    // Prevent duplicate member records for the same phone number in the gym directory
    const existingPhoneMember = await prisma.member.findFirst({
      where: {
        tenantId: req.tenantId!,
        phone: cleanPhone
      }
    });

    if (existingPhoneMember) {
      return res.status(400).json({
        error: `A member named "${existingPhoneMember.firstName} ${existingPhoneMember.lastName || ""}" (#${existingPhoneMember.memberCode}) already exists with phone number ${cleanPhone}. Please update or renew the existing member profile instead of creating a duplicate entry.`,
        success: false
      });
    }

    // Collision-proof Member Code generation by finding highest existing numeric ID
    const allMembers = await prisma.member.findMany({
      where: { tenantId: req.tenantId! },
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
        tenantId: req.tenantId!,
        memberCode,
        firstName,
        lastName,
        gender,
        phone: cleanPhone,
        email: email || `${firstName.toLowerCase()}.${memberCode}@example.com`,
        status: "ACTIVE",
        externalBiometricId: memberCode,
        ...(avatarUrl && { avatarUrl }),
      },
    });

    // Auto-enqueue sync command to linked biometric devices
    try {
      const pin = member.externalBiometricId || member.memberCode;
      const devices = await prisma.attendanceDevice.findMany({ where: { tenantId: req.tenantId! } });
      
      for (const dev of devices) {
        const commands = buildSyncCommands(dev.deviceType, pin, member.firstName);
        for (const command of commands) {
          await prisma.biometricCommand.create({
            data: { tenantId: req.tenantId!, deviceId: dev.id, command }
          });
        }
      }
    } catch (bioErr) {
      console.error("Warning: Failed to queue automatic biometric sync on member creation:", bioErr);
    }

    if (planId) {
      let plan = await prisma.membershipPlan.findFirst({
        where: { id: planId, tenantId: req.tenantId },
      });
      if (!plan) {
        plan = await prisma.membershipPlan.findUnique({
          where: { id: planId },
        });
      }
      if (plan) {
        const start = startDate ? new Date(startDate) : new Date();
        const endDate = new Date(start.getTime() + plan.durationMonths * 30 * 24 * 60 * 60 * 1000);
        const total = (plan.price + (plan.joiningFee || 0)) - (Number(discountAmount) || 0);
        const paid = paidAmount !== undefined && paidAmount !== "" ? Number(paidAmount) : total;
        const pending = Math.max(0, total - paid);

        const newMembership = await prisma.membership.create({
          data: {
            tenantId: req.tenantId!,
            memberId: member.id,
            planId: plan.id,
            startDate: start,
            endDate,
            status: "ACTIVE",
            totalAmount: total,
            paidAmount: paid,
            pendingAmount: pending,
            discountAmount: Number(discountAmount) || 0,
          },
        });

        if (paid > 0) {
          const invoiceNumber = `INV-${memberCode}`;
          const payment = await prisma.payment.create({
            data: {
              tenantId: req.tenantId!,
              memberId: member.id,
              membershipId: newMembership.id,
              invoiceNumber,
              amount: paid,
              netAmount: paid,
              paymentMethod: paymentMethod || "UPI",
              paymentDate: start,
              notes: `Initial Membership Plan Fee - ${plan.name}`,
            },
          });

          try {
            await prisma.invoice.create({
              data: {
                tenantId: req.tenantId!,
                memberId: member.id,
                paymentId: payment.id,
                invoiceNumber,
                issueDate: start,
                dueDate: start,
                subtotal: total,
                taxAmount: 0,
                totalAmount: paid,
                status: pending > 0 ? "PARTIAL" : "PAID",
              },
            });
          } catch (invErr) {
            console.warn("Invoice creation warning:", invErr);
          }
        }
      }
    }

    invalidateMemberCache(req.tenantId);

    await logAuditAction({
      tenantId: req.tenantId,
      userId: req.user?.userId,
      action: "MEMBER_CREATE",
      entity: "MEMBER",
      entityId: member.id,
    });

    return res.json({ success: true, member });
  } catch (error: any) {
    console.error("❌ Error creating member:", error);
    return res.status(500).json({ error: error?.message || "Failed to create member", success: false });
  }
});

router.put("/:id", tenantAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!hasPermission(req.user, PERMISSIONS.MEMBERS_UPDATE)) {
    return res.status(403).json({ error: "Forbidden", success: false });
  }

  try {
    const { id } = req.params;
    const { firstName, lastName, gender, phone, email, status, group, bloodGroup, occupation, address, notes, planId, startDate, paidAmount, discountAmount, externalBiometricId, avatarUrl, pauses } = req.body;

    const existing = await prisma.member.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Member not found", success: false });
    }

    const updated = await prisma.member.update({
      where: { id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(gender && { gender }),
        ...(phone && { phone }),
        ...(email !== undefined && { email }),
        ...(status && { status }),
        ...(group !== undefined && { group }),
        ...(bloodGroup !== undefined && { bloodGroup }),
        ...(occupation !== undefined && { occupation }),
        ...(address !== undefined && { address }),
        ...(notes !== undefined && { notes }),
        ...(externalBiometricId !== undefined && { externalBiometricId }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
    });

    // Auto-block or sync on biometric device when status changes
    if (status && status !== existing.status) {
      const pin = updated.externalBiometricId || updated.memberCode;
      const devices = await prisma.attendanceDevice.findMany({ where: { tenantId: req.tenantId! } });
      
      const isWipe = status === "INACTIVE" || status === "EXPIRED" || status === "BLOCKED";

      if (devices.length > 0) {
        for (const dev of devices) {
          const commands = isWipe 
            ? buildBlockCommands(dev.deviceType, pin)
            : buildSyncCommands(dev.deviceType, pin, updated.firstName);

          for (const command of commands) {
            await prisma.biometricCommand.create({
              data: { tenantId: req.tenantId!, deviceId: dev.id, command }
            });
          }
        }
      }
    }

    if (planId) {
      let plan = await prisma.membershipPlan.findFirst({
        where: { id: planId, tenantId: req.tenantId },
      });
      if (!plan) {
        plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
      }
      if (plan) {
        const start = startDate ? new Date(startDate) : new Date();
        const baseEnd = new Date(start);
        baseEnd.setMonth(baseEnd.getMonth() + plan.durationMonths);

        let totalPauseDays = 0;
        if (Array.isArray(pauses)) {
          pauses.forEach((p: any) => {
            if (p.startDate && p.endDate) {
              const pStart = new Date(p.startDate);
              const pEnd = new Date(p.endDate);
              if (pEnd >= pStart) {
                const diffTime = Math.abs(pEnd.getTime() - pStart.getTime());
                totalPauseDays += Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
              }
            }
          });
        }

        if (totalPauseDays > 0) {
          baseEnd.setDate(baseEnd.getDate() + totalPauseDays);
        }

        const end = baseEnd;
        const total = (plan.price + (plan.joiningFee || 0)) - (Number(discountAmount) || 0);
        const paid = paidAmount !== undefined && paidAmount !== "" ? Number(paidAmount) : total;
        const pending = Math.max(0, total - paid);

        const { isRenew } = req.body;

        // Auto-restore member status to ACTIVE upon plan renewal if previously EXPIRED
        if (existing.status === "EXPIRED" || isRenew) {
          await prisma.member.update({
            where: { id },
            data: { status: "ACTIVE" }
          });
          updated.status = "ACTIVE";
        }

        const existingActiveMembership = await prisma.membership.findFirst({
          where: { memberId: id, status: "ACTIVE" },
        });

        // Determine if we should create a NEW membership record (Renewal or New Plan or expired active)
        const shouldCreateNewMembership = Boolean(
          isRenew ||
          !existingActiveMembership ||
          (existingActiveMembership && (
            existingActiveMembership.endDate < new Date() ||
            existingActiveMembership.planId !== plan.id
          ))
        );

        let targetMembershipId: string | undefined = undefined;

        if (shouldCreateNewMembership) {
          // Expire any previous active membership so it stays in past history
          if (existingActiveMembership) {
            await prisma.membership.update({
              where: { id: existingActiveMembership.id },
              data: { status: "EXPIRED" }
            });
          }

          // Create a NEW membership record
          const createdM = await prisma.membership.create({
            data: {
              tenantId: req.tenantId!,
              memberId: id,
              planId: plan.id,
              startDate: start,
              endDate: end,
              status: "ACTIVE",
              totalAmount: total,
              paidAmount: paid,
              pendingAmount: pending,
              discountAmount: Number(discountAmount) || 0,
            },
          });
          targetMembershipId = createdM.id;

          // Record payment & invoice for renewal if paid > 0
          if (paid > 0) {
            const invoiceNumber = `INV-${existing.memberCode}-${Date.now().toString().slice(-4)}`;
            try {
              const payment = await prisma.payment.create({
                data: {
                  tenantId: req.tenantId!,
                  memberId: id,
                  membershipId: createdM.id,
                  invoiceNumber,
                  amount: paid,
                  netAmount: paid,
                  paymentMethod: req.body.paymentMethod || "UPI",
                  paymentDate: start,
                  notes: `Membership Subscription / Renewal Fee - ${plan.name}`,
                },
              });

              await prisma.invoice.create({
                data: {
                  tenantId: req.tenantId!,
                  memberId: id,
                  paymentId: payment.id,
                  invoiceNumber,
                  issueDate: start,
                  dueDate: start,
                  subtotal: total,
                  taxAmount: 0,
                  totalAmount: paid,
                  status: pending > 0 ? "PARTIAL" : "PAID",
                },
              });
            } catch (payErr) {
              console.warn("Renewal payment creation warning:", payErr);
            }
          }
        } else if (existingActiveMembership) {
          // Editing existing active membership parameters in profile edit mode
          await prisma.membership.update({
            where: { id: existingActiveMembership.id },
            data: {
              planId: plan.id,
              startDate: start,
              endDate: end,
              totalAmount: total,
              paidAmount: paid,
              pendingAmount: pending,
              discountAmount: Number(discountAmount) || 0,
            },
          });
          targetMembershipId = existingActiveMembership.id;
        }

        if (targetMembershipId && Array.isArray(pauses)) {
          await prisma.membershipPause.deleteMany({
            where: { membershipId: targetMembershipId },
          });
          for (const p of pauses) {
            if (p.startDate && p.endDate) {
              const pStart = new Date(p.startDate);
              const pEnd = new Date(p.endDate);
              const pauseDays = pEnd >= pStart ? Math.ceil(Math.abs(pEnd.getTime() - pStart.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0;
              await prisma.membershipPause.create({
                data: {
                  tenantId: req.tenantId!,
                  membershipId: targetMembershipId,
                  startDate: pStart,
                  endDate: pEnd,
                  pauseDays,
                  reason: p.reason || "Member Requested Break / Extension",
                },
              });
            }
          }
        }

        // Always queue biometric sync commands to re-enable device access upon renewal
        try {
          const pin = updated.externalBiometricId || updated.memberCode;
          const devices = await prisma.attendanceDevice.findMany({ where: { tenantId: req.tenantId! } });
          for (const dev of devices) {
            const commands = buildSyncCommands(dev.deviceType, pin, updated.firstName);
            for (const command of commands) {
              await prisma.biometricCommand.create({
                data: { tenantId: req.tenantId!, deviceId: dev.id, command }
              });
            }
          }
        } catch (syncErr) {
          console.error("Warning: Failed to queue biometric sync command on plan renewal:", syncErr);
        }
      }
    }

    invalidateMemberCache(req.tenantId);

    await logAuditAction({
      tenantId: req.tenantId,
      userId: req.user?.userId,
      action: "MEMBER_UPDATE",
      entity: "MEMBER",
      entityId: id,
    });

    return res.json({ success: true, member: updated });
  } catch (error: any) {
    console.error("❌ Error updating member:", error);
    return res.status(500).json({ error: error?.message || "Failed to update member", success: false });
  }
});

router.delete("/:id", tenantAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!hasPermission(req.user, PERMISSIONS.MEMBERS_DELETE)) {
    return res.status(403).json({ error: "Forbidden", success: false });
  }

  try {
    const { id } = req.params;

    await prisma.membership.deleteMany({ where: { memberId: id } });
    await prisma.attendance.deleteMany({ where: { memberId: id } });
    await prisma.memberCustomField.deleteMany({ where: { memberId: id } });
    await prisma.member.delete({ where: { id } });

    invalidateMemberCache(req.tenantId);

    await logAuditAction({
      tenantId: req.tenantId,
      userId: req.user?.userId,
      action: "MEMBER_DELETE",
      entity: "MEMBER",
      entityId: id,
    });

    return res.json({ success: true, message: "Member deleted successfully" });
  } catch (error: any) {
    console.error("❌ Error deleting member:", error);
    return res.status(500).json({ error: error?.message || "Failed to delete member", success: false });
  }
});

export default router;
