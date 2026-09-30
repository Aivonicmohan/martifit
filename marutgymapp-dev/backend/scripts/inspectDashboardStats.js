const { PrismaClient } = require("@prisma/client");

const directUrl = "postgresql://postgres:Soh%40Rushi%40143@db.jztpsrjrdjpbdmclxpfb.supabase.co:5432/postgres";
const prisma = new PrismaClient({
  datasources: { db: { url: directUrl } }
});
const TENANT_ID = "df702917-b1c4-4160-8672-85fe981d03f8";

async function main() {
  console.log("Calculating actual Dashboard metrics for Cross Road Fitness...");

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0]; // "2026-08-30"

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const next7Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59);

  // 1. Total & Active Members
  const totalMembers = await prisma.member.count({ where: { tenantId: TENANT_ID } });
  const activeMembers = await prisma.member.count({ where: { tenantId: TENANT_ID, status: "ACTIVE" } });

  // 2. Active Member Memberships
  const activeMemberships = await prisma.membership.count({
    where: { tenantId: TENANT_ID, status: "ACTIVE" }
  });

  // 3. Month Collection (Payments in current month + Memberships paid amounts)
  const monthPaymentsAgg = await prisma.payment.aggregate({
    where: {
      tenantId: TENANT_ID,
      createdAt: { gte: startOfMonth, lte: endOfMonth }
    },
    _sum: { amount: true }
  });

  const monthMembershipsAgg = await prisma.membership.aggregate({
    where: {
      tenantId: TENANT_ID,
      createdAt: { gte: startOfMonth, lte: endOfMonth }
    },
    _sum: { paidAmount: true }
  });

  const monthCollection = (monthPaymentsAgg._sum.amount || 0) + (monthMembershipsAgg._sum.paidAmount || 0);

  // 4. Total Outstanding Pending Balance across all memberships
  const pendingBalanceAgg = await prisma.membership.aggregate({
    where: { tenantId: TENANT_ID },
    _sum: { pendingAmount: true }
  });
  const pendingBalance = pendingBalanceAgg._sum.pendingAmount || 0;

  // 5. Today Attendance
  const todayAttendanceCount = await prisma.attendance.count({
    where: {
      tenantId: TENANT_ID,
      date: todayStr
    }
  });

  // 6. Today Renewals (Memberships starting or created today)
  const todayRenewalsCount = await prisma.membership.count({
    where: {
      tenantId: TENANT_ID,
      startDate: { gte: startOfDay, lte: endOfDay }
    }
  });

  // 7. Expiring Memberships in next 7 days
  const expiringMemberships = await prisma.membership.findMany({
    where: {
      tenantId: TENANT_ID,
      status: "ACTIVE",
      endDate: { gte: startOfDay, lte: next7Days }
    },
    include: {
      member: true,
      plan: true
    },
    orderBy: { endDate: "asc" },
    take: 5
  });

  console.log({
    totalMembers,
    activeMembers,
    activeMemberships,
    monthCollection,
    pendingBalance,
    todayAttendanceCount,
    todayRenewalsCount,
    expiringCount: expiringMemberships.length,
    expiringList: expiringMemberships.map(m => ({
      member: `${m.member.firstName} ${m.member.lastName}`,
      code: m.member.memberCode,
      phone: m.member.phone,
      endDate: m.endDate
    }))
  });
}

main().finally(() => prisma.$disconnect());
