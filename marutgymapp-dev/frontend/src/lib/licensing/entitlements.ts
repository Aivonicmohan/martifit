import { prisma } from "../prisma";

export const FEATURES = {
  CORE_GYM_MANAGEMENT: "CORE_GYM_MANAGEMENT",
  WHATSAPP: "WHATSAPP",
  ADVANCED_WHATSAPP: "ADVANCED_WHATSAPP",
  BIOMETRIC_API: "BIOMETRIC_API",
  BIOMETRIC_DATABASE: "BIOMETRIC_DATABASE",
  CAMERA_ATTENDANCE: "CAMERA_ATTENDANCE",
  FACE_RECOGNITION: "FACE_RECOGNITION",
  AI_VOICE: "AI_VOICE",
  MULTI_BRANCH: "MULTI_BRANCH",
} as const;

export async function isFeatureEnabled(tenantId: string, featureCode: string): Promise<boolean> {
  // Check tenant license status first
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { status: true },
  });

  if (!tenant || tenant.status === "SUSPENDED" || tenant.status === "EXPIRED") {
    return false;
  }

  // Core Gym Management is always included for active tenants
  if (featureCode === FEATURES.CORE_GYM_MANAGEMENT) {
    return true;
  }

  const entitlement = await prisma.tenantFeature.findFirst({
    where: {
      tenantId,
      feature: { code: featureCode },
      enabled: true,
    },
  });

  if (!entitlement) return false;
  if (entitlement.expiryDate && new Date(entitlement.expiryDate) < new Date()) {
    return false;
  }

  return true;
}

export async function getTenantFeatures(tenantId: string) {
  const features = await prisma.feature.findMany();
  const entitlements = await prisma.tenantFeature.findMany({
    where: { tenantId },
  });

  const entitlementMap = new Map<string, any>(entitlements.map((e: any) => [e.featureId, e]));

  return features.map((f: any) => {
    const ent = entitlementMap.get(f.id);
    const isCore = f.code === FEATURES.CORE_GYM_MANAGEMENT;
    const isEnabled = isCore || (ent?.enabled ?? false);
    return {
      id: f.id,
      code: f.code,
      name: f.name,
      description: f.description,
      isPremium: f.isPremium,
      category: f.category,
      enabled: isEnabled,
      expiryDate: ent?.expiryDate || null,
    };
  });
}
