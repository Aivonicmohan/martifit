import { prisma } from "../prisma";

export interface BiometricLogRecord {
  deviceUserId: string;
  timestamp: Date;
  eventType: "CHECK_IN" | "CHECK_OUT";
  rawDeviceId?: string;
}

export interface BiometricSyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsFailed: number;
  errorMessage?: string;
}

export interface IBiometricAdapter {
  testConnection(): Promise<boolean>;
  fetchRecentLogs(lastSyncTime?: Date): Promise<BiometricLogRecord[]>;
}

export class ApiBiometricAdapter implements IBiometricAdapter {
  constructor(private config: { apiBaseUrl?: string | null; apiKey?: string | null }) {}

  async testConnection(): Promise<boolean> {
    if (!this.config.apiBaseUrl) return false;
    // Simulate successful REST API ping
    return true;
  }

  async fetchRecentLogs(lastSyncTime?: Date): Promise<BiometricLogRecord[]> {
    // Simulated REST API log pull from Biometric Device Gateway
    return [];
  }
}

export class DatabaseBiometricAdapter implements IBiometricAdapter {
  constructor(
    private config: {
      dbType?: string | null;
      dbHost?: string | null;
      dbPort?: number | null;
      dbName?: string | null;
      tableName?: string | null;
      deviceUserIdColumn?: string | null;
      timestampColumn?: string | null;
    }
  ) {}

  async testConnection(): Promise<boolean> {
    if (!this.config.dbHost || !this.config.tableName) return false;
    return true;
  }

  async fetchRecentLogs(lastSyncTime?: Date): Promise<BiometricLogRecord[]> {
    // Simulated database query mapping from external biometric table
    return [];
  }
}

export async function processBiometricLogs(
  tenantId: string,
  integrationId: string,
  logs: BiometricLogRecord[]
): Promise<BiometricSyncResult> {
  let processed = 0;
  let failed = 0;

  for (const log of logs) {
    try {
      // Find matching member by externalBiometricId or memberCode
      const member = await prisma.member.findFirst({
        where: {
          tenantId,
          OR: [
            { externalBiometricId: log.deviceUserId },
            { memberCode: log.deviceUserId },
          ],
        },
      });

      if (!member) {
        failed++;
        continue;
      }

      const dateStr = log.timestamp.toISOString().split("T")[0];

      if (log.eventType === "CHECK_IN") {
        await prisma.attendance.create({
          data: {
            tenantId,
            memberId: member.id,
            checkInTime: log.timestamp,
            date: dateStr,
            status: "PRESENT",
            method: "BIOMETRIC_API",
          },
        });
      } else {
        // Find existing attendance today to update checkOutTime
        const existing = await prisma.attendance.findFirst({
          where: { tenantId, memberId: member.id, date: dateStr },
          orderBy: { checkInTime: "desc" },
        });

        if (existing) {
          await prisma.attendance.update({
            where: { id: existing.id },
            data: { checkOutTime: log.timestamp },
          });
        }
      }

      processed++;
    } catch {
      failed++;
    }
  }

  // Record sync log
  await prisma.biometricSyncLog.create({
    data: {
      tenantId,
      integrationId,
      status: failed > 0 && processed === 0 ? "FAILED" : "SUCCESS",
      recordsProcessed: processed,
      recordsFailed: failed,
      syncedAt: new Date(),
    },
  });

  await prisma.biometricIntegration.update({
    where: { id: integrationId },
    data: { lastSyncAt: new Date() },
  });

  return {
    success: true,
    recordsProcessed: processed,
    recordsFailed: failed,
  };
}
