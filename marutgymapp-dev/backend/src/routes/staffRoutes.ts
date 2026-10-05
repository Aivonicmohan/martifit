import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { tenantAuthMiddleware, AuthenticatedRequest } from "../lib/tenantContext";
import { hasPermission, isOwnerOrManager, PERMISSIONS } from "../lib/rbac";
import { buildSyncCommands, buildBlockCommands } from "../lib/biometricProtocolFactory";

const router = Router();

const DEFAULT_TENANT_ID = "df702917-b1c4-4160-8672-85fe981d03f8";

function getActiveTenantId(req: AuthenticatedRequest): string {
  if (req.tenantId && req.tenantId !== "platform") {
    return req.tenantId;
  }
  return DEFAULT_TENANT_ID;
}

// Middleware to enforce Owner / Manager privileges for all staff routes
router.use(tenantAuthMiddleware, (req: AuthenticatedRequest, res: Response, next) => {
  if (!isOwnerOrManager(req.user)) {
    return res.status(403).json({
      error: "Forbidden: Access Denied. Staff data is sensitive and accessible only to Facility Owners or Managers.",
      success: false,
    });
  }
  next();
});

// 1. GET /api/v1/staff - Fetch all staff members for current tenant
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = getActiveTenantId(req);
    const { search, staffType } = req.query;

    const where: any = { tenantId, isActive: true };

    if (staffType && staffType !== "ALL") {
      where.staffType = String(staffType);
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }

    const staffList = await prisma.staff.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const payrolls = await prisma.staffPayroll.findMany({
      where: {
        tenantId,
        month: currentMonth,
        year: currentYear,
      },
    });

    const staffWithPayroll = staffList.map((s) => {
      const p = payrolls.find((item) => item.staffId === s.id);
      return {
        ...s,
        currentMonthPayroll: p || {
          month: currentMonth,
          year: currentYear,
          baseSalary: s.baseSalary,
          advancesGiven: 0,
          amountPaid: 0,
          dueAmount: s.baseSalary,
          status: "UNPAID",
        },
      };
    });

    return res.json({ success: true, staff: staffWithPayroll });
  } catch (err) {
    console.error("Error fetching staff:", err);
    return res.status(500).json({ error: "Failed to fetch staff members", success: false });
  }
});

// 2. POST /api/v1/staff - Add a new staff member
router.post("/", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!hasPermission(req.user, PERMISSIONS.STAFF_MANAGE)) {
    return res.status(403).json({ error: "Forbidden", success: false });
  }

  try {
    const tenantId = getActiveTenantId(req);
    const {
      name,
      phone,
      email,
      photoUrl,
      dob,
      anniversary,
      gender = "MALE",
      staffType = "TRAINER",
      roleTitle,
      baseSalary = 0,
      salaryDay = 1,
      externalBiometricId,
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: "Name and Phone number are required", success: false });
    }

    let bioPin = externalBiometricId ? String(externalBiometricId).trim() : "";
    if (!bioPin) {
      const existingPins = new Set<string>();
      const allMembers = await prisma.member.findMany({
        where: { tenantId },
        select: { memberCode: true, externalBiometricId: true },
      });
      const allStaff = await prisma.staff.findMany({
        where: { tenantId },
        select: { externalBiometricId: true },
      });

      allMembers.forEach((m) => {
        if (m.memberCode && !isNaN(Number(m.memberCode))) existingPins.add(m.memberCode);
        if (m.externalBiometricId && !isNaN(Number(m.externalBiometricId))) existingPins.add(m.externalBiometricId);
      });
      allStaff.forEach((s) => {
        if (s.externalBiometricId && !isNaN(Number(s.externalBiometricId))) existingPins.add(s.externalBiometricId);
      });

      let candidate = 501;
      while (existingPins.has(String(candidate))) {
        candidate++;
      }
      bioPin = String(candidate);
    }

    const newStaff = await prisma.staff.create({
      data: {
        tenantId,
        name,
        phone,
        email: email || null,
        photoUrl: photoUrl || null,
        dob: dob ? new Date(dob) : null,
        anniversary: anniversary ? new Date(anniversary) : null,
        gender: gender || "MALE",
        staffType: staffType || "TRAINER",
        roleTitle: roleTitle || (staffType === "OWNER" ? "Gym Owner" : staffType === "TRAINER" ? "Fitness Trainer" : staffType === "RECEPTIONIST" ? "Receptionist" : "House Keeping"),
        baseSalary: staffType === "OWNER" ? 0 : (Number(baseSalary) || 0),
        salaryDay: Number(salaryDay) || 1,
        externalBiometricId: bioPin,
        isActive: true,
      },
    });

    const pin = newStaff.externalBiometricId || newStaff.phone;

    // Auto-queue biometric sync commands across all facility devices
    try {
      const devices = await prisma.attendanceDevice.findMany({ where: { tenantId } });
      for (const dev of devices) {
        const syncCmds = buildSyncCommands(dev.deviceType, pin, newStaff.name);
        for (const command of syncCmds) {
          await prisma.biometricCommand.create({
            data: { tenantId, deviceId: dev.id, command }
          });
        }
      }
    } catch (bioErr) {
      console.error("Warning: Failed to queue biometric sync on staff creation:", bioErr);
    }

    return res.json({ success: true, staff: newStaff });
  } catch (err) {
    console.error("Error creating staff:", err);
    return res.status(500).json({ error: "Failed to create staff member", success: false });
  }
});

// 3. PUT /api/v1/staff/:id - Update staff profile & salary details
router.put("/:id", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!hasPermission(req.user, PERMISSIONS.STAFF_MANAGE)) {
    return res.status(403).json({ error: "Forbidden", success: false });
  }

  try {
    const { id } = req.params;
    const {
      name,
      phone,
      email,
      photoUrl,
      dob,
      anniversary,
      gender,
      staffType,
      roleTitle,
      baseSalary,
      salaryDay,
      externalBiometricId,
      isActive,
    } = req.body;

    const existing = await prisma.staff.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Staff member not found", success: false });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email || null;
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl || null;
    if (dob !== undefined) updateData.dob = dob ? new Date(dob) : null;
    if (anniversary !== undefined) updateData.anniversary = anniversary ? new Date(anniversary) : null;
    if (gender !== undefined) updateData.gender = gender;
    if (staffType !== undefined) updateData.staffType = staffType;
    if (roleTitle !== undefined) updateData.roleTitle = roleTitle;
    if (externalBiometricId !== undefined) updateData.externalBiometricId = externalBiometricId ? String(externalBiometricId).trim() : null;
    if (staffType === "OWNER" || (staffType === undefined && existing.staffType === "OWNER")) {
      updateData.baseSalary = 0;
    } else if (baseSalary !== undefined) {
      updateData.baseSalary = Number(baseSalary) || 0;
    }
    if (salaryDay !== undefined) updateData.salaryDay = Number(salaryDay);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await prisma.staff.update({
      where: { id },
      data: updateData,
    });

    const activePin = updated.externalBiometricId || updated.phone;

    // Auto-queue biometric sync command on profile or biometric ID update
    try {
      if (activePin) {
        await prisma.biometricCommand.updateMany({
          where: {
            tenantId: existing.tenantId,
            status: "PENDING",
            OR: [
              { command: { contains: `PIN=${activePin}` } },
              { command: { contains: `Pin=${activePin}` } }
            ]
          },
          data: { status: "FAILED", updatedAt: new Date() }
        });
      }

      const devices = await prisma.attendanceDevice.findMany({ where: { tenantId: existing.tenantId } });
      for (const dev of devices) {
        const cmds = (isActive !== undefined ? Boolean(isActive) : existing.isActive)
          ? buildSyncCommands(dev.deviceType, activePin, updated.name)
          : buildBlockCommands(dev.deviceType, activePin);
        for (const command of cmds) {
          await prisma.biometricCommand.create({
            data: { tenantId: existing.tenantId, deviceId: dev.id, command }
          });
        }
      }
    } catch (bioErr) {
      console.error("Warning: Failed to update biometric command on staff update:", bioErr);
    }

    return res.json({ success: true, staff: updated });
  } catch (err) {
    console.error("Error updating staff:", err);
    return res.status(500).json({ error: "Failed to update staff member", success: false });
  }
});

// 4. DELETE /api/v1/staff/:id - Delete / deactivate staff member
router.delete("/:id", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!hasPermission(req.user, PERMISSIONS.STAFF_MANAGE)) {
    return res.status(403).json({ error: "Forbidden", success: false });
  }

  try {
    const { id } = req.params;

    const staff = await prisma.staff.update({
      where: { id },
      data: { isActive: false },
    });

    // Auto-queue biometric block command on staff deactivation/deletion
    try {
      const devices = await prisma.attendanceDevice.findMany({ where: { tenantId: staff.tenantId } });
      for (const dev of devices) {
        const blockCmds = buildBlockCommands(dev.deviceType, staff.phone);
        for (const command of blockCmds) {
          await prisma.biometricCommand.create({
            data: { tenantId: staff.tenantId, deviceId: dev.id, command }
          });
        }
      }
    } catch (bioErr) {
      console.error("Warning: Failed to queue biometric block on staff deletion:", bioErr);
    }

    return res.json({ success: true, message: "Staff member deactivated successfully" });
  } catch (err) {
    console.error("Error deleting staff:", err);
    return res.status(500).json({ error: "Failed to delete staff member", success: false });
  }
});

// 5. GET /api/v1/staff/payroll - Fetch monthly payroll ledger
router.get("/payroll", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = getActiveTenantId(req);
    const now = new Date();
    const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : now.getFullYear();

    const staffList = await prisma.staff.findMany({
      where: { tenantId, isActive: true, staffType: { not: "OWNER" } },
      orderBy: { name: "asc" },
    });

    const payrolls = await prisma.staffPayroll.findMany({
      where: { tenantId, month, year },
    });

    const ledger = staffList.map((s) => {
      const p = payrolls.find((item) => item.staffId === s.id);
      const baseSalary = s.baseSalary;
      const advancesGiven = p ? p.advancesGiven : 0;
      const amountPaid = p ? p.amountPaid : 0;
      const dueAmount = Math.max(0, baseSalary - advancesGiven - amountPaid);
      let status = "UNPAID";
      if (dueAmount === 0 && (amountPaid > 0 || baseSalary === 0)) status = "PAID";
      else if (amountPaid > 0 || advancesGiven > 0) status = "PARTIAL";

      return {
        staffId: s.id,
        staffName: s.name,
        staffType: s.staffType,
        phone: s.phone,
        month,
        year,
        baseSalary,
        salaryDay: s.salaryDay,
        advancesGiven,
        amountPaid,
        dueAmount,
        status,
        paymentDate: p?.paymentDate || null,
        paymentMethod: p?.paymentMethod || "CASH",
        notes: p?.notes || "",
      };
    });

    return res.json({ success: true, month, year, ledger });
  } catch (err) {
    console.error("Error fetching payroll:", err);
    return res.status(500).json({ error: "Failed to fetch payroll records", success: false });
  }
});

// 6. POST /api/v1/staff/payroll/pay - Record salary payment or advance
router.post("/payroll/pay", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!hasPermission(req.user, PERMISSIONS.STAFF_MANAGE)) {
    return res.status(403).json({ error: "Forbidden", success: false });
  }

  try {
    const tenantId = getActiveTenantId(req);
    const {
      staffId,
      month,
      year,
      paymentType = "SALARY", // SALARY or ADVANCE
      amount,
      paymentMethod = "CASH",
      notes,
    } = req.body;

    if (!staffId || !month || !year || !amount) {
      return res.status(400).json({ error: "Staff ID, month, year, and amount are required", success: false });
    }

    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) {
      return res.status(404).json({ error: "Staff member not found", success: false });
    }

    const m = Number(month);
    const y = Number(year);
    const payAmount = Number(amount);

    let payroll = await prisma.staffPayroll.findUnique({
      where: {
        staffId_month_year: {
          staffId,
          month: m,
          year: y,
        },
      },
    });

    let newAdvances = payroll ? payroll.advancesGiven : 0;
    let newPaid = payroll ? payroll.amountPaid : 0;

    if (paymentType === "ADVANCE") {
      newAdvances += payAmount;
    } else {
      newPaid += payAmount;
    }

    const baseSalary = staff.baseSalary;
    const dueAmount = Math.max(0, baseSalary - newAdvances - newPaid);

    let status = "UNPAID";
    if (dueAmount === 0) status = "PAID";
    else if (newPaid > 0 || newAdvances > 0) status = "PARTIAL";

    const updatedPayroll = await prisma.staffPayroll.upsert({
      where: {
        staffId_month_year: {
          staffId,
          month: m,
          year: y,
        },
      },
      update: {
        baseSalary,
        advancesGiven: newAdvances,
        amountPaid: newPaid,
        dueAmount,
        paymentDate: new Date(),
        paymentMethod: paymentMethod || "CASH",
        notes: notes || undefined,
        status,
      },
      create: {
        tenantId,
        staffId,
        month: m,
        year: y,
        baseSalary,
        advancesGiven: newAdvances,
        amountPaid: newPaid,
        dueAmount,
        paymentDate: new Date(),
        paymentMethod: paymentMethod || "CASH",
        notes: notes || undefined,
        status,
      },
    });

    return res.json({ success: true, payroll: updatedPayroll });
  } catch (err) {
    console.error("Error processing salary payment:", err);
    return res.status(500).json({ error: "Failed to record salary payment", success: false });
  }
});

// GET /api/v1/staff/pending - Fetch pending user registration requests for current tenant
router.get("/pending", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = getActiveTenantId(req);
    const pendingStaff = await prisma.staff.findMany({
      where: { tenantId, isActive: false },
      include: { user: { select: { id: true, email: true, phone: true, isActive: true, createdAt: true } } },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, pending: pendingStaff });
  } catch (err) {
    console.error("Error fetching pending staff requests:", err);
    return res.status(500).json({ error: "Failed to fetch pending staff", success: false });
  }
});

// POST /api/v1/staff/:id/approve - Approve pending staff/user request
router.post("/:id/approve", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = getActiveTenantId(req);
    const { id } = req.params;

    const staffMember = await prisma.staff.findFirst({ where: { id, tenantId } });
    if (!staffMember) {
      return res.status(404).json({ error: "Staff record not found", success: false });
    }

    await prisma.staff.update({
      where: { id },
      data: { isActive: true },
    });

    if (staffMember.userId) {
      await prisma.user.update({
        where: { id: staffMember.userId },
        data: { isActive: true },
      });
    }

    return res.json({ success: true, message: `Staff account for "${staffMember.name}" has been approved!` });
  } catch (err) {
    console.error("Error approving staff request:", err);
    return res.status(500).json({ error: "Failed to approve staff account", success: false });
  }
});

// POST /api/v1/staff/:id/reject - Reject pending staff/user request
router.post("/:id/reject", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = getActiveTenantId(req);
    const { id } = req.params;

    const staffMember = await prisma.staff.findFirst({ where: { id, tenantId } });
    if (!staffMember) {
      return res.status(404).json({ error: "Staff record not found", success: false });
    }

    await prisma.staff.delete({ where: { id } });
    if (staffMember.userId) {
      await prisma.user.delete({ where: { id: staffMember.userId } });
    }

    return res.json({ success: true, message: `Staff registration request for "${staffMember.name}" rejected.` });
  } catch (err) {
    console.error("Error rejecting staff request:", err);
    return res.status(500).json({ error: "Failed to reject staff account", success: false });
  }
});

export default router;
