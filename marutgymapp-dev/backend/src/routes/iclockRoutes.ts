import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { buildBlockCommands, buildSyncCommands } from "../lib/biometricProtocolFactory";

const router = Router();
const prisma = new PrismaClient();

// Add middleware to log EVERYTHING hitting /iclock
router.use((req, res, next) => {
  if (req.originalUrl.includes('/cdata') && req.method === 'POST') {
    console.log(`[ADMS RAW] POST ${req.originalUrl} - Received ${req.body ? req.body.length : 0} bytes`);
  } else {
    console.log(`\n[ADMS RAW] Method: ${req.method} | URL: ${req.originalUrl}`);
  }
  next();
});

// The device identifies itself via the SN parameter in the query string
// e.g., /iclock/cdata?SN=XYZ123...

/**
 * Reconciles hardware device state when it powers back on in the morning or reconnects after an offline period.
 */
async function reconcileDeviceState(device: { id: string; tenantId: string; deviceType: string | null; deviceSerial: string | null }) {
  try {
    // 1. Re-activate FAILED sync/block commands created in the last 24 hours while device was offline
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const reactivated = await prisma.biometricCommand.updateMany({
      where: {
        deviceId: device.id,
        status: "FAILED",
        createdAt: { gte: twentyFourHoursAgo },
        OR: [
          { command: { contains: "DATA UPDATE USERINFO" } },
          { command: { contains: "DATA DELETE USERINFO" } },
          { command: { contains: "DATA UPDATE USER" } },
          { command: { contains: "DATA DELETE USER" } }
        ]
      },
      data: { status: "PENDING", updatedAt: new Date() }
    });
    if (reactivated.count > 0) {
      console.log(`[ADMS Reconnect] Re-queued ${reactivated.count} offline failed sync/block command(s) for device ${device.deviceSerial}`);
    }

    // 2. Fetch all active members in tenant and ensure they have a valid pending or executed user sync command
    const activeMembers = await prisma.member.findMany({
      where: { tenantId: device.tenantId, status: "ACTIVE" },
      select: { id: true, memberCode: true, externalBiometricId: true, firstName: true }
    });

    for (const member of activeMembers) {
      const pin = member.externalBiometricId || member.memberCode;
      if (!pin) continue;

      // Check if there is already a PENDING or EXECUTED sync command for this PIN
      const existingCmd = await prisma.biometricCommand.findFirst({
        where: {
          deviceId: device.id,
          OR: [
            { command: { contains: `PIN=${pin}\t` } },
            { command: { contains: `PIN=${pin}` } },
            { command: { contains: `Pin=${pin}` } }
          ],
          status: { in: ["PENDING", "EXECUTED"] }
        }
      });

      if (!existingCmd) {
        const syncCmds = buildSyncCommands(device.deviceType, pin, member.firstName);
        for (const command of syncCmds) {
          await prisma.biometricCommand.create({
            data: { tenantId: device.tenantId, deviceId: device.id, command, status: "PENDING" }
          });
        }
        console.log(`[ADMS Morning Reconnect] Queued missing sync command for active member ${member.firstName} (${pin})`);
      }
    }
  } catch (err) {
    console.error(`[ADMS Reconnect] Error reconciling device state for ${device.deviceSerial}:`, err);
  }
}

// 1. Handshake / Initialization
router.get(["/cdata", "/cdata.aspx", "/cdata.php"], async (req: Request, res: Response) => {
  const sn = req.query.SN as string;
  if (!sn) return res.status(400).send("No SN provided");
  
  console.log(`[ADMS] Handshake requested from Device SN: ${sn}`);

  try {
    const devices = await prisma.attendanceDevice.findMany({ where: { deviceSerial: sn } });
    if (devices.length > 0) {
      const dev = devices[0];
      const prevPing = dev.lastPing;
      const isReconnecting = !prevPing || (Date.now() - new Date(prevPing).getTime() > 15 * 60 * 1000) || dev.status === "OFFLINE";
      await prisma.attendanceDevice.update({
        where: { id: dev.id },
        data: { lastPing: new Date(), status: "ONLINE" }
      });
      if (isReconnecting) {
        console.log(`[ADMS Morning Handshake] Device ${sn} handshaked after offline period. Triggering state reconciliation...`);
        await reconcileDeviceState(dev);
      }
    }
  } catch (err) {
    console.error(`[ADMS] Error handling handshake device update for ${sn}:`, err);
  }
  
  // Basic ADMS handshake response.
  // Tells the device the server time, registry config, and ping intervals (5s polling for low latency).
  const response = `GET OPTION FROM: ${sn}\n` +
                   `ErrorDelay=10\n` +
                   `Delay=5\n` +
                   `TransTimes=00:00;14:00\n` +
                   `TransInterval=1\n` +
                   `TransFlag=11111111\n` +
                   `Realtime=1\n` +
                   `Encrypt=0`;
  
  res.writeHead(200, { 
    'Content-Type': 'text/plain',
    'Content-Length': Buffer.byteLength(response),
    'Cache-Control': 'no-transform'
  });
  res.end(response);
});

// 2. Fetch Commands (Polling)
router.get(["/getrequest", "/getrequest.aspx", "/getrequest.php"], async (req: Request, res: Response) => {
  const sn = req.query.SN as string;
  if (!sn) return res.status(400).send("No SN provided");
  
  let device = null;
  // Update lastPing time for the device
  try {
    const devices = await prisma.attendanceDevice.findMany({
      where: { deviceSerial: sn }
    });
    if (devices.length > 0) {
      device = devices[0];
      const prevPing = device.lastPing;
      const isReconnecting = !prevPing || (Date.now() - new Date(prevPing).getTime() > 15 * 60 * 1000) || device.status === "OFFLINE";

      await prisma.attendanceDevice.update({
        where: { id: device.id },
        data: { lastPing: new Date(), status: "ONLINE" }
      });

      if (isReconnecting) {
        console.log(`[ADMS Morning Reconnect] Device ${sn} reconnected after offline period. Triggering device state reconciliation...`);
        await reconcileDeviceState(device);
      }
    }
  } catch (err) {
    console.error(`[ADMS] Failed to update lastPing for SN: ${sn}`, err);
  }

  // Check for pending commands
  if (device) {
    try {
      // Auto-sweep expired memberships for this tenant and queue block commands if needed
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch active staff for this tenant to ensure staff members are never auto-blocked
      const activeStaffList = await prisma.staff.findMany({
        where: { tenantId: device.tenantId, isActive: true },
        select: { id: true, phone: true, email: true, externalBiometricId: true }
      });
      const activeStaffPhones = new Set(activeStaffList.map(s => s.phone).filter(Boolean));
      const activeStaffEmails = new Set(activeStaffList.map(s => s.email?.toLowerCase()).filter(Boolean));
      const activeStaffBiometricIds = new Set(activeStaffList.map(s => s.externalBiometricId).filter(Boolean));

      const expiredMembers = await prisma.member.findMany({
        where: {
          tenantId: device.tenantId,
          status: { notIn: ["BLOCKED"] },
          OR: [
            { status: "EXPIRED" },
            {
              memberships: {
                some: {
                  status: "ACTIVE",
                  endDate: { lt: today }
                }
              }
            }
          ]
        },
        select: { id: true, memberCode: true, externalBiometricId: true, status: true, phone: true, email: true, group: true, source: true }
      });

      for (const m of expiredMembers) {
        // Skip active staff members
        const isStaff =
          (m.phone && activeStaffPhones.has(m.phone)) ||
          (m.email && activeStaffEmails.has(m.email.toLowerCase())) ||
          (m.externalBiometricId && activeStaffBiometricIds.has(m.externalBiometricId)) ||
          (m.memberCode && activeStaffBiometricIds.has(m.memberCode)) ||
          (m.group && /STAFF|TRAINER|OWNER|MAID|RECEPTIONIST|HOUSEKEEPING|MANAGER|CLEANER/i.test(m.group)) ||
          (m.source && /STAFF|EMPLOYEE/i.test(m.source));

        if (isStaff) {
          continue;
        }

        if (m.status !== "EXPIRED") {
          await prisma.member.update({ where: { id: m.id }, data: { status: "EXPIRED" } });
        }
        const pin = m.externalBiometricId || m.memberCode;
        if (pin) {
          const hasBlockCmd = await prisma.biometricCommand.findFirst({
            where: {
              deviceId: device.id,
              command: { contains: `PIN=${pin}` }
            }
          });
          if (!hasBlockCmd) {
            const blockCmds = buildBlockCommands(device.deviceType, pin);
            for (const command of blockCmds) {
              await prisma.biometricCommand.create({
                data: { tenantId: device.tenantId, deviceId: device.id, command }
              });
            }
          }
        }
      }

      // Auto-cleanup any old malformed or expired pending commands
      const allPending = await prisma.biometricCommand.findMany({
        where: { deviceId: device.id, status: "PENDING" },
        orderBy: { createdAt: "asc" }
      });

      const now = Date.now();
      const failedIds: string[] = [];
      const validPendingCmds: typeof allPending = [];

      for (const cmd of allPending) {
        const cmdStr = cmd.command || "";
        const isMalformed = 
          cmdStr.includes("user Pin=") || 
          cmdStr.includes("Pin=") || 
          cmdStr.startsWith("DATA UPDATE user ") ||
          cmdStr.startsWith("DATA DELETE user ");
          
        const ageMs = now - new Date(cmd.createdAt).getTime();

        // Real-time door unlock commands expire after 3 minutes.
        // Member sync (DATA UPDATE) and block (DATA DELETE) commands ONLY expire if older than 7 days,
        // ensuring commands created overnight while device is turned off remain PENDING until morning boot!
        const isTransientUnlock = 
          cmdStr.includes("AC_UNELOCK") || 
          cmdStr.includes("AC_UNLOCK") || 
          cmdStr.includes("Door1Open") || 
          cmdStr.includes("RELAY") || 
          cmdStr.includes("REMOTE_UNLOCK");

        const isExpired = isTransientUnlock 
          ? ageMs > 3 * 60 * 1000 // > 3 minutes for transient door unlock
          : ageMs > 7 * 24 * 60 * 60 * 1000; // > 7 days for user sync/block

        if (isMalformed || isExpired) {
          failedIds.push(cmd.id);
        } else {
          validPendingCmds.push(cmd);
        }
      }

      if (failedIds.length > 0) {
        await prisma.biometricCommand.updateMany({
          where: { id: { in: failedIds } },
          data: { status: "FAILED", updatedAt: new Date() }
        });
        console.log(`[ADMS] Auto-failed ${failedIds.length} malformed or expired pending command(s) for device ${sn}`);
      }

      // Auto-sort validPendingCmds so HIGH PRIORITY real-time commands (Door Unlocks & Fingerprint Enrolls) jump to the FRONT of the queue!
      validPendingCmds.sort((a, b) => {
        const isPriorityA = 
          a.command.includes("AC_UNELOCK") || 
          a.command.includes("AC_UNLOCK") || 
          a.command.includes("Door1Open") || 
          a.command.includes("RELAY") || 
          a.command.includes("REMOTE_UNLOCK") ||
          a.command.includes("ENROLL_FP");

        const isPriorityB = 
          b.command.includes("AC_UNELOCK") || 
          b.command.includes("AC_UNLOCK") || 
          b.command.includes("Door1Open") || 
          b.command.includes("RELAY") || 
          b.command.includes("REMOTE_UNLOCK") ||
          b.command.includes("ENROLL_FP");

        if (isPriorityA && !isPriorityB) return -1;
        if (!isPriorityA && isPriorityB) return 1;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      const pendingCmds = validPendingCmds.slice(0, 50);

      if (pendingCmds.length > 0) {
        const cmdLines = pendingCmds.map((cmd) => {
          const numericId = Math.abs(
            cmd.id.split("").reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
          ) % 899999 + 100000;
          console.log(`[ADMS] Sending command to ${sn} (Numeric ID: ${numericId}): ${cmd.command}`);
          return `C:${numericId}:${cmd.command}`;
        });

        // Immediately update Door Unlock commands to EXECUTED upon sending to the hardware device in GET response
        const unlockCmdIds = pendingCmds
          .filter(c => 
            c.command.includes("AC_UNELOCK") || 
            c.command.includes("AC_UNLOCK") || 
            c.command.includes("Door1Open") || 
            c.command.includes("RELAY") || 
            c.command.includes("REMOTE_UNLOCK")
          )
          .map(c => c.id);

        if (unlockCmdIds.length > 0) {
          await prisma.biometricCommand.updateMany({
            where: { id: { in: unlockCmdIds } },
            data: { status: "EXECUTED", updatedAt: new Date() }
          });
          console.log(`[ADMS] Marked ${unlockCmdIds.length} door unlock command(s) as EXECUTED upon delivery to device ${sn}`);
        }

        const cmdResponse = cmdLines.join("\n");
        res.writeHead(200, { 
          'Content-Type': 'text/plain',
          'Content-Length': Buffer.byteLength(cmdResponse),
          'Cache-Control': 'no-transform'
        });
        return res.end(cmdResponse);
      }
    } catch (err) {
      console.error(`[ADMS] Error fetching commands for SN: ${sn}`, err);
    }
  }

  // If no commands, return OK
  res.writeHead(200, { 
    'Content-Type': 'text/plain',
    'Content-Length': 2,
    'Cache-Control': 'no-transform'
  });
  res.end("OK");
});

// 3. Receive Data (Attendance Logs)
router.post(["/cdata", "/cdata.aspx", "/cdata.php"], async (req: Request, res: Response) => {
  const sn = req.query.SN as string;
  const table = req.query.table as string; // typically 'ATTLOG' for attendance
  
  if (!sn) return res.status(400).send("No SN provided");
  
  // The body is plain text.
  const body = req.body as string;
  if (!body) {
    res.writeHead(200, { 
      'Content-Type': 'text/plain',
      'Content-Length': 2,
      'Cache-Control': 'no-transform'
    });
    return res.end("OK");
  } // Device sends empty POST sometimes
  
  try {
    if (table === "BIODATA" || table === "TEMPLATEV10" || table === "OPERLOG" || table === "FP" || table === "USER" || table === "options") {
      console.log(`[ADMS] Biometric template/user data uploaded for table=${table} from SN ${sn}`);
      const device = await prisma.attendanceDevice.findFirst({ where: { deviceSerial: sn } });
      if (device) {
        const pinMatch = body.match(/PIN=(\d+)/i) || body.match(/Pin=(\d+)/i) || body.match(/^(\d+)\t/m);
        const pin = pinMatch ? pinMatch[1] : null;

        if (pin) {
          console.log(`[ADMS] Detected biometric fingerprint upload for PIN=${pin} from SN ${sn}`);
          const pendingEnroll = await prisma.biometricCommand.findMany({
            where: {
              deviceId: device.id,
              status: "PENDING",
              command: { contains: "ENROLL_FP" }
            }
          });

          for (const cmd of pendingEnroll) {
            if (cmd.command.includes(`PIN=${pin}`) || cmd.command.includes(`Pin=${pin}`) || pendingEnroll.length === 1) {
              await prisma.biometricCommand.update({
                where: { id: cmd.id },
                data: { status: "EXECUTED", updatedAt: new Date() }
              });
              console.log(`[ADMS] Marked ENROLL_FP command ${cmd.id} as EXECUTED upon receiving template upload`);
            }
          }

          const member = await prisma.member.findFirst({
            where: {
              tenantId: device.tenantId,
              OR: [
                { memberCode: pin },
                { externalBiometricId: pin }
              ]
            }
          });

          if (member && !member.externalBiometricId) {
            await prisma.member.update({
              where: { id: member.id },
              data: { externalBiometricId: pin }
            });
            console.log(`[ADMS] Linked member ${member.firstName} externalBiometricId to ${pin}`);
          }
        }
      }
    }

    if (table === "ATTLOG") {
      const lines = body.split("\n").filter(l => l.trim().length > 0);
      for (const line of lines) {
        // Parse ZKTeco ADMS log line
        // Format: PIN [tab] Time [tab] Status [tab] VerifyType [tab] WorkCode ...
        const parts = line.split("\t");
        if (parts.length >= 2) {
          const pin = parts[0].trim(); // Usually maps to Member Code
          const timeStr = parts[1].trim(); // e.g. '2026-09-04 09:00:00'
          
          // Attempt to find the tenant that owns this device
          const device = await prisma.attendanceDevice.findFirst({
            where: { deviceSerial: sn }
          });
          
          if (device) {
             const pinClean = parseInt(pin, 10).toString();
             // Find member by externalBiometricId or memberCode (checking both raw and zero-stripped)
             // 1. Strict match: Priority to externalBiometricId
             let member = await prisma.member.findFirst({
               where: {
                 tenantId: device.tenantId,
                 OR: [
                   { externalBiometricId: pin },
                   { externalBiometricId: pinClean }
                 ]
               }
             });

             // 2. Fallback match: Use memberCode ONLY if externalBiometricId is not set
             if (!member) {
               member = await prisma.member.findFirst({
                 where: {
                   tenantId: device.tenantId,
                   AND: [
                     {
                       OR: [
                         { memberCode: pin },
                         { memberCode: pinClean }
                       ]
                     },
                     {
                       OR: [
                         { externalBiometricId: null },
                         { externalBiometricId: "" }
                       ]
                     }
                   ]
                 }
               });
             }

             // 3. Staff match: Check if pin matches an active Staff member in prisma.staff
             if (!member) {
               const staffMatch = await prisma.staff.findFirst({
                 where: {
                   tenantId: device.tenantId,
                   isActive: true,
                   OR: [
                     { externalBiometricId: pin },
                     { externalBiometricId: pinClean },
                     { phone: pin },
                     { phone: pinClean }
                   ]
                 }
               });

               if (staffMatch) {
                 console.log(`[ADMS] Biometric punch matched active staff member: ${staffMatch.name} (${pin})`);
                 member = await prisma.member.findFirst({
                   where: { tenantId: device.tenantId, phone: staffMatch.phone }
                 });

                 if (!member) {
                   member = await prisma.member.create({
                     data: {
                       tenantId: device.tenantId,
                       memberCode: pin,
                       externalBiometricId: pin,
                       firstName: staffMatch.name,
                       lastName: `(${staffMatch.roleTitle || "Staff"})`,
                       gender: staffMatch.gender || "MALE",
                       phone: staffMatch.phone,
                       email: staffMatch.email,
                       group: staffMatch.staffType || "Staff",
                       source: "STAFF",
                       status: "ACTIVE"
                     }
                   });
                 }
               }
             }

             if (member) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // Determine if this person is a registered active staff member
                const activeStaffList = await prisma.staff.findMany({
                  where: { tenantId: device.tenantId, isActive: true },
                  select: { id: true, phone: true, email: true }
                });
                const activeStaffPhones = new Set(activeStaffList.map(s => s.phone).filter(Boolean));
                const activeStaffEmails = new Set(activeStaffList.map(s => s.email?.toLowerCase()).filter(Boolean));

                const isStaff =
                  (member.phone && activeStaffPhones.has(member.phone)) ||
                  (member.email && activeStaffEmails.has(member.email.toLowerCase())) ||
                  (member.group && /STAFF|TRAINER|OWNER|MAID|RECEPTIONIST|HOUSEKEEPING|MANAGER|CLEANER/i.test(member.group)) ||
                  (member.source && /STAFF|EMPLOYEE/i.test(member.source));

                // A) Check if explicitly BLOCKED
                if (member.status === "BLOCKED") {
                    console.log(`[ADMS] Ignoring punch for explicitly BLOCKED member/staff: ${member.id}`);
                    try {
                      const pinToBlock = member.externalBiometricId || member.memberCode;
                      const wipeCmds = buildBlockCommands(device.deviceType, pinToBlock);
                      for (const command of wipeCmds) {
                        await prisma.biometricCommand.create({
                          data: { tenantId: device.tenantId, deviceId: device.id, command }
                        });
                      }
                    } catch (wipeErr) {
                      console.error("[ADMS] Failed to auto-queue block command for member:", wipeErr);
                    }
                    continue; // Skip processing this punch
                }

                // B) If NOT staff, enforce membership plan expiration check
                if (!isStaff) {
                    const activeMembership = await prisma.membership.findFirst({
                      where: { memberId: member.id, status: "ACTIVE" },
                      orderBy: { endDate: "desc" }
                    });
                    const isMembershipExpired = activeMembership?.endDate ? new Date(activeMembership.endDate) < today : false;
                    const isExpired = member.status === "EXPIRED" || isMembershipExpired;

                    if (isExpired) {
                        console.log(`[ADMS] Ignoring punch for expired member: ${member.id}`);
                        if (isMembershipExpired && member.status !== "EXPIRED") {
                          await prisma.member.update({
                            where: { id: member.id },
                            data: { status: "EXPIRED" }
                          });
                        }

                        try {
                          const pinToBlock = member.externalBiometricId || member.memberCode;
                          const wipeCmds = buildBlockCommands(device.deviceType, pinToBlock);
                          for (const command of wipeCmds) {
                            await prisma.biometricCommand.create({
                              data: { tenantId: device.tenantId, deviceId: device.id, command }
                            });
                          }
                        } catch (wipeErr) {
                          console.error("[ADMS] Failed to auto-queue block command for member:", wipeErr);
                        }
                        continue; // Skip processing this punch
                    }
                } else {
                    console.log(`[ADMS] Authorized biometric punch for active STAFF member: ${member.firstName} (${pin})`);
                }

                // Device sends time in local timezone (IST). Parse it with +05:30 to avoid UTC shifts

                // Device sends time in local timezone (IST). Parse it with +05:30 to avoid UTC shifts
                const isoTimeStr = timeStr.replace(" ", "T") + "+05:30";
                const parsedCheckInTime = new Date(isoTimeStr);
                const parsedDateStr = isoTimeStr.split("T")[0];

                // Check if this attendance already exists to prevent duplicates
                const exists = await prisma.attendance.findFirst({
                    where: {
                        memberId: member.id,
                        date: parsedDateStr,
                        checkInTime: parsedCheckInTime
                    }
                });

                if (!exists) {
                    await prisma.attendance.create({
                    data: {
                        tenantId: device.tenantId,
                        memberId: member.id,
                        checkInTime: parsedCheckInTime,
                        date: parsedDateStr,
                        method: "BIOMETRIC",
                        deviceId: sn,
                        status: "PRESENT"
                    }
                    });
                    console.log(`[ADMS] Attendance saved for member ${member.firstName} (${pin})`);
                }
             } else {
                 console.warn(`[ADMS] Unknown PIN/MemberCode ${pin} scanned on device ${sn}`);
             }
          }
        }
      }
    }
  } catch (error) {
    console.error("[ADMS] Error processing cdata:", error);
  }
  
  // Always acknowledge with "OK" so the device deletes the log from its memory
  res.writeHead(200, { 
    'Content-Type': 'text/plain',
    'Content-Length': 2,
    'Cache-Control': 'no-transform'
  });
  res.end("OK");
});

// 4. Command Confirmation
router.post(["/devicecmd", "/devicecmd.aspx", "/devicecmd.php"], async (req: Request, res: Response) => {
  const sn = req.query.SN as string;
  
  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  console.log(`[ADMS] Command confirmation from ${sn}: query=`, req.query, `body=`, body);
  
  try {
    let cmdId = (req.query.ID as string) || "";
    let retCode = (req.query.Return as string) || "";

    if (typeof req.body === 'string') {
      if (!cmdId) {
        const idMatch = req.body.match(/ID=(\d+)/i);
        if (idMatch) cmdId = idMatch[1];
      }
      if (!retCode) {
        const retMatch = req.body.match(/Return=(-?\d+)/i);
        if (retMatch) retCode = retMatch[1];
      }
    }

    if (sn) {
      const device = await prisma.attendanceDevice.findFirst({
        where: { deviceSerial: sn }
      });

      if (device) {
        const pendingCmds = await prisma.biometricCommand.findMany({
          where: { deviceId: device.id, status: "PENDING" },
          orderBy: { createdAt: "asc" }
        });

        if (pendingCmds.length > 0) {
          const lines = (body || "").split(/\r?\n/).filter((l) => l.trim().length > 0);
          let processedCount = 0;

          for (const line of lines) {
            const idMatch = line.match(/ID=(\d+)/i);
            const retMatch = line.match(/Return=(-?\d+)/i);
            const lineCmdId = idMatch ? idMatch[1] : cmdId;
            const lineRetCode = retMatch ? retMatch[1] : retCode;

            if (lineCmdId) {
              const matchedCmd = pendingCmds.find((c) => {
                const numId = (
                  Math.abs(c.id.split("").reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)) %
                    899999 +
                  100000
                ).toString();
                return numId === lineCmdId || c.id.startsWith(lineCmdId);
              });

              if (matchedCmd) {
                const newStatus = lineRetCode === "0" || lineRetCode === "200" ? "EXECUTED" : "FAILED";
                await prisma.biometricCommand.update({
                  where: { id: matchedCmd.id },
                  data: { status: newStatus, updatedAt: new Date() }
                });
                processedCount++;
                console.log(
                  `[ADMS] Updated command ${matchedCmd.id} (${matchedCmd.command}) status to ${newStatus} (Return code: ${lineRetCode})`
                );
              }
            }
          }

          if (processedCount === 0) {
            const oldestCmd = pendingCmds[0];
            const newStatus = retCode === "0" || retCode === "200" ? "EXECUTED" : "FAILED";
            await prisma.biometricCommand.update({
              where: { id: oldestCmd.id },
              data: { status: newStatus, updatedAt: new Date() }
            });
            console.log(`[ADMS] Fallback updated oldest pending command ${oldestCmd.id} (${oldestCmd.command}) to ${newStatus}`);
          }
        }
      }
    }
  } catch (err) {
    console.error("[ADMS] Error processing devicecmd:", err);
  }

  res.writeHead(200, { 
    'Content-Type': 'text/plain',
    'Content-Length': 2,
    'Cache-Control': 'no-transform'
  });
  res.end("OK");
});

export default router;
