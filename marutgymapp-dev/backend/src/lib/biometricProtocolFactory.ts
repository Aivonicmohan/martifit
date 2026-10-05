/**
 * Centralized Biometric Protocol Factory for Multi-Vendor & Multi-Firmware Hardware Support.
 *
 * Supports isolated protocol drivers for:
 * - ZKTeco Standard (Push 2.0 - USERINFO PIN=...)
 * - ZKTeco Modern (Push 3.0 - user Pin=...)
 * - ZKTeco Full Fields (Push 2.0 with Access Control fields - Card/Grp/TZ)
 * - ZKTeco Strict Timezone (Push 2.0 with Grp/TZ)
 * - ZKTeco Legacy (USER PIN=...)
 * - Realtime Biometric Hardware
 * - Biomax Hardware
 * - Matrix COSEC Hardware
 */

export interface BiometricDeviceRef {
  id: string;
  deviceType?: string | null;
  deviceSerial?: string | null;
}

/**
 * Builds user sync (DATA UPDATE) commands for the specified hardware device protocol.
 */
export function buildSyncCommands(devType: string | null | undefined, pin: string, firstName: string): string[] {
  const safeName = (firstName || "").replace(/[^a-zA-Z0-9]/g, "").substring(0, 24);
  const type = devType || "ZKTeco Standard";

  switch (type) {
    case "ZKTeco Full Fields":
      return [`DATA UPDATE USERINFO PIN=${pin}\tName=${safeName}\tPri=0\tCard=0\tGrp=1\tTZ=0000000000000000`];
    case "ZKTeco Strict Timezone":
      return [`DATA UPDATE USERINFO PIN=${pin}\tName=${safeName}\tPri=0\tGrp=1\tTZ=0000000000000000`];
    case "ZKTeco Legacy":
      return [`DATA UPDATE USER PIN=${pin}\tName=${safeName}\tPri=0`];
    case "Realtime":
    case "Biomax":
    case "Matrix":
    case "ZKTeco Modern":
    case "ZKTeco Standard":
    default:
      return [`DATA UPDATE USERINFO PIN=${pin}\tName=${safeName}\tPri=0`];
  }
}

/**
 * Builds user block (DATA DELETE) commands targeting strictly the single user ID.
 * Avoids table-wide template deletion commands (e.g. DATA DELETE FINGERTMP without filters).
 */
export function buildBlockCommands(devType: string | null | undefined, pin: string): string[] {
  const type = devType || "ZKTeco Standard";

  switch (type) {
    case "ZKTeco Legacy":
      return [`DATA DELETE USER PIN=${pin}`];
    case "Realtime":
    case "Biomax":
    case "Matrix":
    case "ZKTeco Modern":
    case "ZKTeco Full Fields":
    case "ZKTeco Strict Timezone":
    case "ZKTeco Standard":
    default:
      return [`DATA DELETE USERINFO PIN=${pin}`];
  }
}

/**
 * Builds remote fingerprint enrollment trigger commands for the specified hardware device protocol.
 */
export function buildEnrollCommands(devType: string | null | undefined, pin: string, fingerId: number = 0): string[] {
  const type = devType || "ZKTeco Standard";

  switch (type) {
    case "ZKTeco Legacy":
      return [`ENROLL_FP PIN=${pin}\tFID=${fingerId}`];
    case "Realtime":
    case "Biomax":
    case "Matrix":
    case "ZKTeco Modern":
    case "ZKTeco Full Fields":
    case "ZKTeco Strict Timezone":
    case "ZKTeco Standard":
    default:
      return [`ENROLL_FP PIN=${pin}\tFID=${fingerId}\tRETRY=3\tOVERWRITE=1`];
  }
}

/**
 * Builds remote door unlock / relay open commands for the specified hardware device protocol.
 */
export function buildUnlockCommands(devType: string | null | undefined): string[] {
  const type = devType || "ZKTeco Standard";

  switch (type) {
    case "Realtime":
      return ["RELAY 1 5"];
    case "Biomax":
      return ["OPEN_DOOR 1"];
    case "Matrix":
      return ["CONTROL DEVICE REMOTE_UNLOCK"];
    case "ZKTeco Legacy":
    case "ZKTeco Modern":
    case "ZKTeco Full Fields":
    case "ZKTeco Strict Timezone":
    case "ZKTeco Standard":
    default:
      return ["AC_UNELOCK"];
  }
}

