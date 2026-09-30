import { PrismaClient } from "@prisma/client";
import * as crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

async function main() {
  console.log("🌱 Starting SaaS Database Seeding in /database...");

  // 1. Seed SaaS Features
  const features = [
    { code: "CORE_GYM_MANAGEMENT", name: "Core Gym Operations", description: "Members, Memberships, Attendance, Finance, Leads", isPremium: false, category: "CORE" },
    { code: "WHATSAPP", name: "WhatsApp Notifications", description: "Basic WhatsApp message sending and receipts", isPremium: false, category: "MESSAGING" },
    { code: "ADVANCED_WHATSAPP", name: "Advanced WhatsApp Automation", description: "Automated trigger-condition-action messaging workflows", isPremium: true, category: "MESSAGING" },
    { code: "BIOMETRIC_API", name: "Biometric Device API", description: "REST API integration with ZKTeco, eSSL, Anviz devices", isPremium: true, category: "INTEGRATION" },
    { code: "BIOMETRIC_DATABASE", name: "Biometric Database Polling", description: "Direct SQL polling from hardware database tables", isPremium: true, category: "INTEGRATION" },
    { code: "CAMERA_ATTENDANCE", name: "Camera & Face Recognition", description: "CCTV/Camera-based automatic attendance detection", isPremium: true, category: "AI_VISION" },
    { code: "AI_VOICE", name: "AI Voice Assistant & Calling", description: "Automated voice renewal calls and AI receptionist", isPremium: true, category: "AI_VOICE" },
    { code: "MULTI_BRANCH", name: "Multi-Branch Management", description: "Manage multiple gym centers from one dashboard", isPremium: true, category: "ENTERPRISE" },
  ];

  for (const f of features) {
    await prisma.feature.upsert({
      where: { code: f.code },
      update: f,
      create: f,
    });
  }

  // 2. Base Plan
  const corePlan = await prisma.plan.upsert({
    where: { code: "CORE" },
    update: {},
    create: {
      name: "Core Gym OS",
      code: "CORE",
      description: "Complete core management system for gym operations",
      priceOneTime: 24000,
      priceAnnual: 24000,
      priceMonthly: 2400,
      maxMembers: 5000,
      maxBranches: 1,
      maxStaff: 20,
    },
  });

  // 3. Super Admin
  const superAdminPassword = await hashPassword("admin123");
  await prisma.user.upsert({
    where: { email: "admin@saas.com" },
    update: {},
    create: {
      email: "admin@saas.com",
      passwordHash: superAdminPassword,
      name: "SaaS Super Admin",
      isSuperAdmin: true,
    },
  });

  // 4. Initial Tenant: Cross Road Fitness
  console.log("🏢 Seeding Tenant: Cross Road Fitness");
  const tenant = await prisma.tenant.upsert({
    where: { slug: "crossroadfitness" },
    update: {},
    create: {
      name: "Cross Road Fitness",
      slug: "crossroadfitness",
      domain: "crossroadfitness.com",
      status: "ACTIVE",
    },
  });

  await prisma.tenantBranding.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      businessName: "Cross Road Fitness",
      logoUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop",
      primaryColor: "#1e40af",
      secondaryColor: "#0f172a",
      contactPhone: "9059059751",
      contactEmail: "support@crossroadfitness.com",
      address: "Cross Road Fitness Center, Main Road, Hyderabad, Telangana",
      website: "https://crossroadfitness.com",
      whatsappNumber: "9059059751",
      supportNumber: "8008048787",
      footerText: "Cross Road Fitness © 2026. All rights reserved.",
    },
  });

  await prisma.tenantSettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      currencySymbol: "₹",
      currencyCode: "INR",
      timezone: "Asia/Kolkata",
      enableWhatsApp: true,
      enableBiometrics: true,
    },
  });

  // Gym Owner User
  const ownerPassword = await hashPassword("crossroad123");
  const ownerUser = await prisma.user.upsert({
    where: { email: "owner@crossroadfitness.com" },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "owner@crossroadfitness.com",
      passwordHash: ownerPassword,
      name: "Sowji (Owner)",
      phone: "9059059751",
    },
  });

  const existingStaff = await prisma.staff.findFirst({ where: { userId: ownerUser.id } });
  if (!existingStaff) {
    await prisma.staff.create({
      data: {
        tenantId: tenant.id,
        userId: ownerUser.id,
        name: "Sowji",
        phone: "9059059751",
        email: "owner@crossroadfitness.com",
        roleTitle: "Gym Owner & Admin",
        department: "MANAGEMENT",
      },
    });
  }

  // Membership Plans
  const planQuarterly = await prisma.membershipPlan.create({
    data: {
      tenantId: tenant.id,
      name: "3 Months Cardio & Strength",
      durationMonths: 3,
      price: 5500,
    },
  });

  // Members
  const membersData = [
    { code: "1489", name: "Balu K", phone: "9701635058" },
    { code: "1488", name: "Geetha M", phone: "8897947323" },
    { code: "1487", name: "Shankar Rao", phone: "8886796669" },
    { code: "1486", name: "Teja P", phone: "9346111940" },
  ];

  for (const m of membersData) {
    const member = await prisma.member.create({
      data: {
        tenantId: tenant.id,
        memberCode: m.code,
        firstName: m.name.split(" ")[0],
        lastName: m.name.split(" ")[1] || "",
        gender: "Male",
        phone: m.phone,
        email: `${m.name.toLowerCase().replace(/\s+/g, "")}@example.com`,
        externalBiometricId: m.code,
      },
    });

    await prisma.membership.create({
      data: {
        tenantId: tenant.id,
        memberId: member.id,
        planId: planQuarterly.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        totalAmount: 5500,
        paidAmount: 5500,
        pendingAmount: 0,
      },
    });
  }

  console.log("✅ Database seeding finished!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
