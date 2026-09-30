import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { tenantAuthMiddleware, AuthenticatedRequest } from "../lib/tenantContext";
import { buildSyncCommands, buildBlockCommands, buildEnrollCommands, buildUnlockCommands } from "../lib/biometricProtocolFactory";

const router = Router();

// Get WhatsApp Integration Configuration
router.get("/whatsapp", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;

    let config = await prisma.whatsAppIntegration.findFirst({
      where: { tenantId },
    });

    const settings = await prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    return res.json({
      success: true,
      config: config
        ? {
            id: config.id,
            provider: config.provider,
            wabaId: config.wabaId || "",
            phoneNumberId: config.phoneNumberId || "",
            apiKey: config.accessTokenEncrypted || "",
            isActive: config.isActive,
            enablePreBatchReminder: settings?.enableAutoReminder ?? true,
            autoReminderDaysBefore: settings?.autoReminderDaysBefore ?? 10,
          }
        : {
            provider: "WHATSAPP_CLOUD_API",
            wabaId: "",
            phoneNumberId: "",
            apiKey: "",
            isActive: false,
            enablePreBatchReminder: true,
            autoReminderDaysBefore: 10,
          },
    });
  } catch (error: any) {
    console.error("Error fetching WhatsApp integration:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch WhatsApp integration config" });
  }
});

// Save or Update WhatsApp Integration Configuration & API Key
router.post("/whatsapp", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const {
      provider,
      wabaId,
      phoneNumberId,
      apiKey,
      isActive,
      enablePreBatchReminder,
      autoReminderDaysBefore,
    } = req.body;

    const existing = await prisma.whatsAppIntegration.findFirst({
      where: { tenantId },
    });

    let config;
    if (existing) {
      config = await prisma.whatsAppIntegration.update({
        where: { id: existing.id },
        data: {
          provider: provider || "WHATSAPP_CLOUD_API",
          wabaId: wabaId || null,
          phoneNumberId: phoneNumberId || null,
          accessTokenEncrypted: apiKey || null,
          isActive: isActive !== false,
        },
      });
    } else {
      config = await prisma.whatsAppIntegration.create({
        data: {
          tenantId,
          provider: provider || "WHATSAPP_CLOUD_API",
          wabaId: wabaId || null,
          phoneNumberId: phoneNumberId || null,
          accessTokenEncrypted: apiKey || null,
          isActive: isActive !== false,
        },
      });
    }

    await prisma.tenantSettings.upsert({
      where: { tenantId },
      update: {
        enableWhatsApp: true,
        enableAutoReminder: enablePreBatchReminder !== false,
        autoReminderDaysBefore: Number(autoReminderDaysBefore) || 10,
      },
      create: {
        tenantId,
        enableWhatsApp: true,
        enableAutoReminder: enablePreBatchReminder !== false,
        autoReminderDaysBefore: Number(autoReminderDaysBefore) || 10,
      },
    });

    return res.json({
      success: true,
      message: "WhatsApp Integration and API Key saved successfully!",
      config: {
        id: config.id,
        provider: config.provider,
        wabaId: config.wabaId || "",
        phoneNumberId: config.phoneNumberId || "",
        apiKey: config.accessTokenEncrypted || "",
        isActive: config.isActive,
        enablePreBatchReminder: enablePreBatchReminder !== false,
        autoReminderDaysBefore: Number(autoReminderDaysBefore) || 10,
      },
    });
  } catch (error: any) {
    console.error("Error saving WhatsApp integration:", error);
    return res.status(500).json({ success: false, error: error?.message || "Failed to save WhatsApp integration" });
  }
});

// Test WhatsApp Delivery (supports Template mode e.g. hello_world and Direct Text mode)
router.post("/whatsapp/test", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { recipients, recipientPhone, messageBody, sendMode, templateName } = req.body;

    let targetList: { name: string; phone: string; body?: string }[] = [];

    if (Array.isArray(recipients) && recipients.length > 0) {
      targetList = recipients;
    } else if (recipientPhone) {
      targetList = [{ name: "Manual Phone Number", phone: recipientPhone, body: messageBody }];
    } else {
      return res.status(400).json({ success: false, error: "Recipient phone number or member selections are required." });
    }

    const config = await prisma.whatsAppIntegration.findFirst({
      where: { tenantId },
    });

    if (!config || !config.accessTokenEncrypted) {
      return res.status(400).json({ success: false, error: "No WhatsApp API Key configured. Please save your API Key first." });
    }

    const deliveryResults: { name: string; phone: string; status: "SENT" | "FAILED"; wmid?: string; error?: string; mode?: string }[] = [];

    for (const item of targetList) {
      let cleanPhone = item.phone.replace(/\D/g, "");
      if (cleanPhone.length === 10) {
        cleanPhone = "91" + cleanPhone;
      }

      const textToSend = item.body || messageBody || "Hello! This is a test WhatsApp message from Marut Fitness Software.";

      if (config.provider === "WHATSAPP_CLOUD_API" && config.phoneNumberId) {
        const metaUrl = `https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`;

        let payload: any;
        if (sendMode === "TEMPLATE" || templateName) {
          payload = {
            messaging_product: "whatsapp",
            to: cleanPhone,
            type: "template",
            template: {
              name: templateName || "hello_world",
              language: { code: "en_US" },
            },
          };
        } else {
          payload = {
            messaging_product: "whatsapp",
            to: cleanPhone,
            type: "text",
            text: { body: textToSend },
          };
        }

        const metaRes = await fetch(metaUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.accessTokenEncrypted}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const metaData = await metaRes.json().catch(() => null);

        if (!metaRes.ok) {
          console.error(`Meta API Error for ${item.name} (${cleanPhone}):`, metaData);
          deliveryResults.push({
            name: item.name,
            phone: cleanPhone,
            status: "FAILED",
            error: metaData?.error?.message || metaData?.error?.error_user_title || "WhatsApp Cloud API error",
          });
        } else {
          const wmid = metaData?.messages?.[0]?.id || "";
          deliveryResults.push({
            name: item.name,
            phone: cleanPhone,
            status: "SENT",
            wmid,
            mode: payload.type,
          });
        }
      } else {
        deliveryResults.push({
          name: item.name,
          phone: cleanPhone,
          status: "SENT",
        });
      }
    }

    const successCount = deliveryResults.filter((r) => r.status === "SENT").length;
    const failCount = deliveryResults.length - successCount;

    return res.json({
      success: failCount === 0,
      message: `Successfully sent Meta WhatsApp message to ${successCount} member(s).` + (failCount > 0 ? ` (${failCount} failed)` : ""),
      results: deliveryResults,
    });
  } catch (error: any) {
    console.error("Error sending test WhatsApp message:", error);
    return res.status(500).json({ success: false, error: error?.message || "Failed to send test WhatsApp message" });
  }
});

// Get WhatsApp Templates / Message Rules
router.get("/whatsapp/templates", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;

    let dbTemplates = await prisma.whatsAppTemplate.findMany({
      where: { tenantId },
    });

    const defaultCategories = [
      {
        category: "EXPIRY_REMINDER",
        name: "Membership Pre-Batch Expiry Reminder",
        content: "Hi {FirstName}, your {PlanName} membership at Marut Fitness Software expires in {DaysLeft} days (on {EndDate}). Don't miss your workout today at {BatchTime}! Please renew soon.",
      },
      {
        category: "PAYMENT_RECEIPT",
        name: "Payment Receipt Notification",
        content: "Hi {FirstName}, payment of ₹{Amount} received for {PlanName}. Invoice #{InvoiceNumber}. Thank you for choosing Marut Fitness Software!",
      },
      {
        category: "WELCOME_MEMBER",
        name: "Welcome New Member",
        content: "Welcome to Marut Fitness Software, {FirstName}! Your Member ID is {MemberCode}. We are excited to support your fitness journey!",
      },
      {
        category: "DUE_ALERT",
        name: "Pending Dues Alert",
        content: "Hi {FirstName}, you have a pending balance of ₹{PendingAmount} for your {PlanName} membership. Kindly clear your dues at your earliest convenience.",
      },
    ];

    const templates = defaultCategories.map((def) => {
      const found = dbTemplates.find((t) => t.category === def.category);
      return {
        id: found?.id || `def-${def.category}`,
        category: def.category,
        name: found?.name || def.name,
        content: found?.content || def.content,
        status: found?.status || "APPROVED",
        metaTemplateName: found?.templateId || "hello_world",
        isCustomized: Boolean(found),
      };
    });

    return res.json({ success: true, templates });
  } catch (error: any) {
    console.error("Error fetching templates:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch WhatsApp templates" });
  }
});

// Save or Update WhatsApp Template / Rule
router.post("/whatsapp/templates", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { category, name, content, metaTemplateName } = req.body;

    if (!category || !content) {
      return res.status(400).json({ success: false, error: "Category and content are required." });
    }

    const existing = await prisma.whatsAppTemplate.findFirst({
      where: { tenantId, category },
    });

    let template;
    if (existing) {
      template = await prisma.whatsAppTemplate.update({
        where: { id: existing.id },
        data: {
          name: name || existing.name,
          content,
          templateId: metaTemplateName || existing.templateId || "hello_world",
          status: "APPROVED",
        },
      });
    } else {
      template = await prisma.whatsAppTemplate.create({
        data: {
          tenantId,
          category,
          name: name || category,
          templateId: metaTemplateName || "hello_world",
          content,
          status: "APPROVED",
        },
      });
    }

    return res.json({
      success: true,
      message: `Template for "${category}" saved successfully!`,
      template,
    });
  } catch (error: any) {
    console.error("Error saving WhatsApp template:", error);
    return res.status(500).json({ success: false, error: error?.message || "Failed to save template" });
  }
});

// GET All Biometric Devices for Tenant
router.get("/biometric/devices", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;

    const rawDevices = await prisma.attendanceDevice.findMany({
      where: { tenantId },
      orderBy: { lastPing: "desc" },
    });

    const now = new Date();
    // Device is considered online if last ping was within 3 minutes (180,000 ms)
    const OFFLINE_THRESHOLD_MS = 3 * 60 * 1000;

    const devices = await Promise.all(
      rawDevices.map(async (d) => {
        const lastPingTime = d.lastPing ? new Date(d.lastPing).getTime() : 0;
        const diffMs = lastPingTime > 0 ? Math.max(0, now.getTime() - lastPingTime) : null;
        const isOnline = diffMs !== null && diffMs <= OFFLINE_THRESHOLD_MS;
        const calculatedStatus = isOnline ? "ONLINE" : "OFFLINE";

        // Keep DB status aligned with calculated status
        if (d.status !== calculatedStatus) {
          await prisma.attendanceDevice.update({
            where: { id: d.id },
            data: { status: calculatedStatus },
          }).catch(() => null);
        }

        return {
          ...d,
          status: calculatedStatus,
          lastPingDiffMs: diffMs,
          isOnline,
        };
      })
    );

    return res.json({ success: true, devices });
  } catch (error: any) {
    console.error("Error fetching biometric devices:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch biometric devices" });
  }
});

// POST Register / Add New Biometric Device
router.post("/biometric/devices", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { name, deviceType, deviceSerial, deviceIp } = req.body;

    if (!name || !deviceSerial) {
      return res.status(400).json({ success: false, error: "Device Name and Serial Number are required." });
    }

    const device = await prisma.attendanceDevice.create({
      data: {
        tenantId,
        name,
        deviceType: deviceType || "eSSL ADMS",
        deviceSerial: deviceSerial.trim(),
        deviceIp: deviceIp ? deviceIp.trim() : null,
        status: "ONLINE",
        lastPing: new Date(),
      },
    });

    return res.json({
      success: true,
      message: `Biometric Device "${name}" (${deviceSerial}) connected successfully!`,
      device,
    });
  } catch (error: any) {
    console.error("Error registering biometric device:", error);
    return res.status(500).json({ success: false, error: error?.message || "Failed to register biometric device" });
  }
});

// DELETE Remove Biometric Device
router.delete("/biometric/devices/:id", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    await prisma.attendanceDevice.deleteMany({
      where: { id, tenantId },
    });

    return res.json({ success: true, message: "Biometric device removed successfully." });
  } catch (error: any) {
    console.error("Error deleting biometric device:", error);
    return res.status(500).json({ success: false, error: "Failed to delete biometric device" });
  }
});

// Clear Admin Privileges / Unlock Device Menu Remotely
router.post("/biometric/devices/:id/clear-admin", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { id } = req.params;

    const device = await prisma.attendanceDevice.findFirst({ where: { id, tenantId } });
    if (!device) return res.status(404).json({ success: false, error: "Device not found" });

    // Send remote unlock & admin privilege demotion commands over ADMS
    const commands = [
      "CLEAR ADMIN",
      "DATA CLEAR ADMIN",
      "SET OPTION ClearAdmin=1",
      "DATA UPDATE USERINFO PIN=1\tName=Admin\tPri=0",
      "DATA UPDATE USERINFO PIN=141\tName=Member\tPri=0"
    ];

    for (const command of commands) {
      await prisma.biometricCommand.create({
        data: { tenantId, deviceId: device.id, command }
      });
    }

    return res.json({
      success: true,
      message: `Admin unlock commands queued for "${device.name}". The device menu will unlock automatically on its next poll (10-30 seconds)!`
    });
  } catch (error: any) {
    console.error("Error queueing clear-admin command:", error);
    return res.status(500).json({ success: false, error: "Failed to queue clear admin command" });
  }
});

// Enqueue Block Command
router.post("/biometric/members/:memberId/block", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { memberId } = req.params;

    const member = await prisma.member.findFirst({ where: { id: memberId, tenantId } });
    if (!member) return res.status(404).json({ success: false, error: "Member not found" });

    const pin = member.externalBiometricId || member.memberCode;
    // ZKTeco devices often return -1002 (Failed) if you try to delete USERINFO while FINGERTMP or FACE data exists.
    // Update member status to BLOCKED in our DB
    await prisma.member.update({
      where: { id: member.id },
      data: { status: "BLOCKED" }
    });

    // Get all devices for this tenant and queue the commands
    const devices = await prisma.attendanceDevice.findMany({ where: { tenantId } });
    for (const dev of devices) {
      const commands = buildBlockCommands(dev.deviceType, pin);
      for (const command of commands) {
        await prisma.biometricCommand.create({
          data: { tenantId, deviceId: dev.id, command }
        });
      }
    }

    return res.json({ success: true, message: `Block command queued for ${devices.length} device(s).` });
  } catch (error: any) {
    console.error("Error queueing block command:", error);
    return res.status(500).json({ success: false, error: "Failed to queue block command" });
  }
});

// Enqueue Sync Command
router.post("/biometric/members/:memberId/sync", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { memberId } = req.params;

    const member = await prisma.member.findFirst({ where: { id: memberId, tenantId } });
    if (!member) return res.status(404).json({ success: false, error: "Member not found" });

    const pin = member.externalBiometricId || member.memberCode;
    
    // Update member status to ACTIVE in our DB
    await prisma.member.update({
      where: { id: member.id },
      data: { status: "ACTIVE" }
    });

    // Auto-clear older pending commands for this PIN to prevent queue blocking
    await prisma.biometricCommand.updateMany({
      where: {
        tenantId,
        status: "PENDING",
        OR: [
          { command: { contains: `PIN=${pin}` } },
          { command: { contains: `Pin=${pin}` } },
          { command: { contains: "user Pin=" } }
        ]
      },
      data: { status: "FAILED", updatedAt: new Date() }
    });

    const devices = await prisma.attendanceDevice.findMany({ where: { tenantId } });
    for (const dev of devices) {
      const commands = buildSyncCommands(dev.deviceType, pin, member.firstName);
      for (const command of commands) {
        await prisma.biometricCommand.create({
          data: { tenantId, deviceId: dev.id, command }
        });
      }
    }

    return res.json({ success: true, message: `Sync command queued for ${devices.length} device(s).` });
  } catch (error: any) {
    console.error("Error queueing sync command:", error);
    return res.status(500).json({ success: false, error: "Failed to queue sync command" });
  }
});

// Clear Pending Commands for a Member
router.post("/biometric/members/:memberId/clear-pending", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { memberId } = req.params;

    const member = await prisma.member.findFirst({ where: { id: memberId, tenantId } });
    if (!member) return res.status(404).json({ success: false, error: "Member not found" });

    const pin = member.externalBiometricId || member.memberCode;
    const result = await prisma.biometricCommand.updateMany({
      where: {
        tenantId,
        status: "PENDING",
        OR: [
          { command: { contains: `PIN=${pin}` } },
          { command: { contains: `Pin=${pin}` } },
          { command: { contains: "user Pin=" } }
        ]
      },
      data: { status: "FAILED", updatedAt: new Date() }
    });

    return res.json({ success: true, count: result.count, message: `Cleared ${result.count} stale pending command(s).` });
  } catch (error: any) {
    console.error("Error clearing pending commands:", error);
    return res.status(500).json({ success: false, error: "Failed to clear pending commands" });
  }
});

// Enqueue Fingerprint Enrollment Command for existing member
router.post("/biometric/members/:memberId/enroll", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { memberId } = req.params;

    const member = await prisma.member.findFirst({ where: { id: memberId, tenantId } });
    if (!member) return res.status(404).json({ success: false, error: "Member not found" });

    const pin = member.externalBiometricId || member.memberCode;
    const devices = await prisma.attendanceDevice.findMany({ where: { tenantId } });

    if (devices.length === 0) {
      return res.status(400).json({ success: false, error: "No biometric devices configured for this gym." });
    }

    // Auto-clear older pending commands for this PIN to prevent queue blocking
    await prisma.biometricCommand.updateMany({
      where: {
        tenantId,
        status: "PENDING",
        OR: [
          { command: { contains: `PIN=${pin}` } },
          { command: { contains: `Pin=${pin}` } },
          { command: { contains: "user Pin=" } }
        ]
      },
      data: { status: "FAILED", updatedAt: new Date() }
    });

    const createdCommands = [];
    for (const dev of devices) {
      // 1. Ensure user profile exists on device
      const syncCmds = buildSyncCommands(dev.deviceType, pin, member.firstName);
      for (const command of syncCmds) {
        await prisma.biometricCommand.create({
          data: { tenantId, deviceId: dev.id, command }
        });
      }

      // 2. Queue fingerprint enrollment command
      const enrollCmds = buildEnrollCommands(dev.deviceType, pin, 0);
      for (const command of enrollCmds) {
        const cmdRecord = await prisma.biometricCommand.create({
          data: { tenantId, deviceId: dev.id, command }
        });
        createdCommands.push(cmdRecord);
      }
    }

    return res.json({
      success: true,
      message: `Enrollment command sent to ${devices.length} device(s). Place finger on device sensor 3 times when prompted.`,
      commands: createdCommands,
      pin
    });
  } catch (error: any) {
    console.error("Error queueing enroll command:", error);
    return res.status(500).json({ success: false, error: "Failed to queue enrollment command" });
  }
});

// Enqueue Fingerprint Enrollment for New / Unsaved Member (Temp Enrollment)
router.post("/biometric/enroll-temp", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { pin, firstName } = req.body;

    if (!pin || !firstName) {
      return res.status(400).json({ success: false, error: "Member PIN and First Name are required." });
    }

    const devices = await prisma.attendanceDevice.findMany({ where: { tenantId } });
    if (devices.length === 0) {
      return res.status(400).json({ success: false, error: "No biometric devices configured for this gym." });
    }

    // Auto-clear older pending commands for this PIN to prevent queue blocking
    await prisma.biometricCommand.updateMany({
      where: {
        tenantId,
        status: "PENDING",
        OR: [
          { command: { contains: `PIN=${pin}` } },
          { command: { contains: `Pin=${pin}` } },
          { command: { contains: "user Pin=" } }
        ]
      },
      data: { status: "FAILED", updatedAt: new Date() }
    });

    const createdCommands = [];
    for (const dev of devices) {
      // 1. Ensure user sync
      const syncCmds = buildSyncCommands(dev.deviceType, String(pin), firstName);
      for (const command of syncCmds) {
        await prisma.biometricCommand.create({
          data: { tenantId, deviceId: dev.id, command }
        });
      }

      // 2. Queue enrollment
      const enrollCmds = buildEnrollCommands(dev.deviceType, String(pin), 0);
      for (const command of enrollCmds) {
        const cmdRecord = await prisma.biometricCommand.create({
          data: { tenantId, deviceId: dev.id, command }
        });
        createdCommands.push(cmdRecord);
      }
    }

    return res.json({
      success: true,
      message: `Enrollment command sent to ${devices.length} device(s). Place finger on device sensor 3 times when prompted.`,
      commands: createdCommands,
      pin
    });
  } catch (error: any) {
    console.error("Error queueing temp enroll command:", error);
    return res.status(500).json({ success: false, error: "Failed to queue temp enrollment command" });
  }
});

// Check Single Biometric Command Status (for real-time frontend polling)
router.get("/biometric/commands/:commandId/status", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { commandId } = req.params;

    const commandRecord = await prisma.biometricCommand.findFirst({
      where: { id: commandId, tenantId }
    });

    if (!commandRecord) {
      return res.status(404).json({ success: false, error: "Command record not found" });
    }

    const pinMatch = commandRecord.command.match(/PIN=(\d+)/i) || commandRecord.command.match(/Pin=(\d+)/i);
    const pin = pinMatch ? pinMatch[1] : null;

    let effectiveStatus = commandRecord.status;
    if (pin && effectiveStatus !== "EXECUTED") {
      const minSessionTime = new Date(commandRecord.createdAt.getTime() - 10 * 1000);
      const executedOther = await prisma.biometricCommand.findFirst({
        where: {
          tenantId,
          deviceId: commandRecord.deviceId,
          status: "EXECUTED",
          command: { contains: "ENROLL_FP" },
          createdAt: { gte: minSessionTime },
          OR: [
            { command: { contains: `PIN=${pin}` } },
            { command: { contains: `Pin=${pin}` } }
          ]
        }
      });
      if (executedOther) {
        effectiveStatus = "EXECUTED";
      }
    }

    return res.json({
      success: true,
      status: effectiveStatus,
      command: commandRecord
    });
  } catch (error: any) {
    console.error("Error checking command status:", error);
    return res.status(500).json({ success: false, error: "Failed to check command status" });
  }
});

// Get Biometric Command Logs for a Member
router.get("/biometric/members/:memberId/commands", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { memberId } = req.params;

    const member = await prisma.member.findFirst({ where: { id: memberId, tenantId } });
    if (!member) return res.status(404).json({ success: false, error: "Member not found" });

    const pin = member.externalBiometricId || member.memberCode;

    // Auto-sweep stale transient commands older than 3 minutes for this PIN
    const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await prisma.biometricCommand.updateMany({
      where: {
        tenantId,
        status: "PENDING",
        OR: [
          {
            createdAt: { lt: threeMinAgo },
            OR: [
              { command: { contains: "AC_UNELOCK" } },
              { command: { contains: "AC_UNLOCK" } },
              { command: { contains: "Door1Open" } },
              { command: { contains: "RELAY" } },
              { command: { contains: "REMOTE_UNLOCK" } }
            ]
          },
          {
            createdAt: { lt: sevenDaysAgo }
          }
        ]
      },
      data: { status: "FAILED", updatedAt: new Date() }
    });

    const commands = await prisma.biometricCommand.findMany({
      where: { 
        tenantId, 
        OR: [
          { command: { contains: `PIN=${pin}` } },
          { command: { contains: `Pin=${pin}` } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return res.json({ success: true, commands });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Failed to fetch logs" });
  }
});

// Enqueue Block Command for Staff
router.post("/biometric/staff/:staffId/block", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { staffId } = req.params;

    const staff = await prisma.staff.findFirst({ where: { id: staffId, tenantId } });
    if (!staff) return res.status(404).json({ success: false, error: "Staff member not found" });

    const pin = staff.externalBiometricId;
    if (!pin) {
      return res.status(400).json({ success: false, error: "Staff member does not have a Biometric ID / Device PIN set." });
    }

    await prisma.staff.update({
      where: { id: staff.id },
      data: { isActive: false }
    });

    if (staff.phone) {
      await prisma.member.updateMany({
        where: { tenantId, phone: staff.phone },
        data: { status: "BLOCKED" }
      });
    }

    const devices = await prisma.attendanceDevice.findMany({ where: { tenantId } });
    for (const dev of devices) {
      const commands = buildBlockCommands(dev.deviceType, pin);
      for (const command of commands) {
        await prisma.biometricCommand.create({
          data: { tenantId, deviceId: dev.id, command }
        });
      }
    }

    return res.json({ success: true, message: `Block command queued for ${devices.length} device(s).` });
  } catch (error: any) {
    console.error("Error queueing staff block command:", error);
    return res.status(500).json({ success: false, error: "Failed to queue block command" });
  }
});

// Enqueue Sync Command for Staff
router.post("/biometric/staff/:staffId/sync", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { staffId } = req.params;

    const staff = await prisma.staff.findFirst({ where: { id: staffId, tenantId } });
    if (!staff) return res.status(404).json({ success: false, error: "Staff member not found" });

    const pin = staff.externalBiometricId;
    if (!pin) {
      return res.status(400).json({ success: false, error: "Staff member does not have a Biometric ID / Device PIN set." });
    }

    await prisma.staff.update({
      where: { id: staff.id },
      data: { isActive: true }
    });

    if (staff.phone) {
      await prisma.member.updateMany({
        where: { tenantId, phone: staff.phone },
        data: { status: "ACTIVE" }
      });
    }

    await prisma.biometricCommand.updateMany({
      where: {
        tenantId,
        status: "PENDING",
        OR: [
          { command: { contains: `PIN=${pin}` } },
          { command: { contains: `Pin=${pin}` } },
          { command: { contains: "user Pin=" } }
        ]
      },
      data: { status: "FAILED", updatedAt: new Date() }
    });

    const devices = await prisma.attendanceDevice.findMany({ where: { tenantId } });
    for (const dev of devices) {
      const commands = buildSyncCommands(dev.deviceType, pin, staff.name);
      for (const command of commands) {
        await prisma.biometricCommand.create({
          data: { tenantId, deviceId: dev.id, command }
        });
      }
    }

    return res.json({ success: true, message: `Sync command queued for ${devices.length} device(s).` });
  } catch (error: any) {
    console.error("Error queueing staff sync command:", error);
    return res.status(500).json({ success: false, error: "Failed to queue sync command" });
  }
});

// Clear Pending Commands for Staff
router.post("/biometric/staff/:staffId/clear-pending", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { staffId } = req.params;

    const staff = await prisma.staff.findFirst({ where: { id: staffId, tenantId } });
    if (!staff) return res.status(404).json({ success: false, error: "Staff member not found" });

    const pin = staff.externalBiometricId;
    if (!pin) return res.json({ success: true, count: 0, message: "No Biometric ID set." });

    const result = await prisma.biometricCommand.updateMany({
      where: {
        tenantId,
        status: "PENDING",
        OR: [
          { command: { contains: `PIN=${pin}` } },
          { command: { contains: `Pin=${pin}` } },
          { command: { contains: "user Pin=" } }
        ]
      },
      data: { status: "FAILED", updatedAt: new Date() }
    });

    return res.json({ success: true, count: result.count, message: `Cleared ${result.count} stale pending command(s).` });
  } catch (error: any) {
    console.error("Error clearing pending commands for staff:", error);
    return res.status(500).json({ success: false, error: "Failed to clear pending commands" });
  }
});

// Enqueue Fingerprint Enrollment Command for Staff
router.post("/biometric/staff/:staffId/enroll", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { staffId } = req.params;

    const staff = await prisma.staff.findFirst({ where: { id: staffId, tenantId } });
    if (!staff) return res.status(404).json({ success: false, error: "Staff member not found" });

    const pin = staff.externalBiometricId;
    if (!pin) {
      return res.status(400).json({ success: false, error: "Staff member does not have a Biometric ID / Device PIN set." });
    }

    const devices = await prisma.attendanceDevice.findMany({ where: { tenantId } });
    if (devices.length === 0) {
      return res.status(400).json({ success: false, error: "No biometric devices configured for this gym." });
    }

    await prisma.biometricCommand.updateMany({
      where: {
        tenantId,
        status: "PENDING",
        OR: [
          { command: { contains: `PIN=${pin}` } },
          { command: { contains: `Pin=${pin}` } },
          { command: { contains: "user Pin=" } }
        ]
      },
      data: { status: "FAILED", updatedAt: new Date() }
    });

    const createdCommands = [];
    for (const dev of devices) {
      const syncCmds = buildSyncCommands(dev.deviceType, pin, staff.name);
      for (const command of syncCmds) {
        await prisma.biometricCommand.create({
          data: { tenantId, deviceId: dev.id, command }
        });
      }

      const enrollCmds = buildEnrollCommands(dev.deviceType, pin, 0);
      for (const command of enrollCmds) {
        const cmdRecord = await prisma.biometricCommand.create({
          data: { tenantId, deviceId: dev.id, command }
        });
        createdCommands.push(cmdRecord);
      }
    }

    return res.json({
      success: true,
      message: `Enrollment command sent to ${devices.length} device(s). Place finger on device sensor 3 times when prompted.`,
      commands: createdCommands,
      pin
    });
  } catch (error: any) {
    console.error("Error queueing staff enroll command:", error);
    return res.status(500).json({ success: false, error: "Failed to queue enrollment command" });
  }
});

// Get Biometric Command Logs for Staff
router.get("/biometric/staff/:staffId/commands", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { staffId } = req.params;

    const staff = await prisma.staff.findFirst({ where: { id: staffId, tenantId } });
    if (!staff) return res.status(404).json({ success: false, error: "Staff member not found" });

    const pin = staff.externalBiometricId;
    if (!pin) return res.json({ success: true, commands: [] });

    // Auto-sweep stale pending commands older than 3 minutes for this PIN
    const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000);
    await prisma.biometricCommand.updateMany({
      where: {
        tenantId,
        status: "PENDING",
        createdAt: { lt: threeMinAgo },
        OR: [
          { command: { contains: `PIN=${pin}` } },
          { command: { contains: `Pin=${pin}` } }
        ]
      },
      data: { status: "FAILED", updatedAt: new Date() }
    });

    const commands = await prisma.biometricCommand.findMany({
      where: {
        tenantId,
        OR: [
          { command: { contains: `PIN=${pin}` } },
          { command: { contains: `Pin=${pin}` } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return res.json({ success: true, commands });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Failed to fetch staff biometric logs" });
  }
});

// Remote Unlock Door / Open Relay for Biometric Devices
router.post("/biometric/unlock-door", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { deviceId } = req.body || {};

    let devices;
    if (deviceId) {
      devices = await prisma.attendanceDevice.findMany({ where: { id: deviceId, tenantId } });
    } else {
      devices = await prisma.attendanceDevice.findMany({ where: { tenantId } });
    }

    if (devices.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No biometric devices configured for your gym. Please register a device under Integrations → Biometric."
      });
    }

    // Auto-clear older pending unlock commands for these devices to prevent queue stacking
    for (const dev of devices) {
      await prisma.biometricCommand.updateMany({
        where: {
          tenantId,
          deviceId: dev.id,
          status: "PENDING",
          OR: [
            { command: { contains: "AC_UNELOCK" } },
            { command: { contains: "AC_UNLOCK" } },
            { command: { contains: "Door1Open" } },
            { command: { contains: "RELAY" } },
            { command: { contains: "REMOTE_UNLOCK" } }
          ]
        },
        data: { status: "FAILED", updatedAt: new Date() }
      });
    }

    const createdCommands = [];
    for (const dev of devices) {
      const unlockCmds = buildUnlockCommands(dev.deviceType);
      for (const command of unlockCmds) {
        const cmdRecord = await prisma.biometricCommand.create({
          data: { tenantId, deviceId: dev.id, command }
        });
        createdCommands.push(cmdRecord);
      }
    }

    return res.json({
      success: true,
      message: `Door unlock command queued for ${devices.length} biometric device(s)! The door relay will open on the device's next heartbeat.`,
      devicesCount: devices.length,
      commands: createdCommands
    });
  } catch (error: any) {
    console.error("Error queueing door unlock command:", error);
    return res.status(500).json({ success: false, error: "Failed to queue door unlock command" });
  }
});

// GET All Biometric Command Logs (Door Unlocks, Syncs, Blocks, Fingerprint Enrolls, Clear Admin)
router.get("/biometric/logs", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { deviceId, filter } = req.query;

    // Auto-sweep stale pending commands older than 3 minutes
    const threeMinAgo = new Date(Date.now() - 3 * 60 * 1000);
    await prisma.biometricCommand.updateMany({
      where: {
        tenantId,
        status: "PENDING",
        createdAt: { lt: threeMinAgo }
      },
      data: { status: "FAILED", updatedAt: new Date() }
    });

    let whereClause: any = { tenantId };
    if (deviceId && typeof deviceId === "string") {
      whereClause.deviceId = deviceId;
    }

    if (filter === "UNLOCK") {
      whereClause.OR = [
        { command: { contains: "AC_UNELOCK" } },
        { command: { contains: "AC_UNLOCK" } },
        { command: { contains: "Door1Open" } },
        { command: { contains: "RELAY" } },
        { command: { contains: "REMOTE_UNLOCK" } }
      ];
    } else if (filter === "SYNC_BLOCK") {
      whereClause.OR = [
        { command: { contains: "USERINFO" } },
        { command: { contains: "USER" } },
        { command: { contains: "DELETE" } }
      ];
    }

    const logs = await prisma.biometricCommand.findMany({
      where: whereClause,
      include: {
        device: {
          select: { name: true, deviceSerial: true, deviceType: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return res.json({ success: true, logs });
  } catch (error: any) {
    console.error("Error fetching biometric logs:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch biometric logs" });
  }
});

// Clear All Stale Pending Commands for Tenant
router.post("/biometric/clear-stale", tenantAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const result = await prisma.biometricCommand.updateMany({
      where: {
        tenantId,
        status: "PENDING"
      },
      data: { status: "FAILED", updatedAt: new Date() }
    });

    return res.json({ success: true, count: result.count, message: `Cleared ${result.count} pending command(s).` });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: "Failed to clear pending commands" });
  }
});

export default router;
