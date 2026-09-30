const { PrismaClient } = require("@prisma/client");

const directUrl = "postgresql://postgres:Soh%40Rushi%40143@db.jztpsrjrdjpbdmclxpfb.supabase.co:5432/postgres";
const prisma = new PrismaClient({
  datasources: { db: { url: directUrl } }
});
const TENANT_ID = "df702917-b1c4-4160-8672-85fe981d03f8";

const OFFICIAL_PRICES = {
  "STRENGTH": {
    1: 2000,
    3: 4000,
    6: 6500,
    12: 11000
  },
  "CARDIO & STRENGTH": {
    1: 2500,
    3: 5000,
    6: 8500,
    12: 13000
  },
  "STRENGTH + PT": {
    1: 5000,
    3: 11000,
    6: 18000,
    12: 30000
  },
  "CARDIO & STRENGTH + PT": {
    1: 6000,
    3: 16000,
    6: 25000,
    12: 40000
  }
};

function normalizePlanName(name) {
  if (!name) return "CARDIO & STRENGTH";
  const upper = name.toUpperCase().trim();
  if (upper.includes("CARDIO") && upper.includes("PT")) return "CARDIO & STRENGTH + PT";
  if (upper.includes("STRENGTH") && upper.includes("PT")) return "STRENGTH + PT";
  if (upper.includes("CARDIO")) return "CARDIO & STRENGTH";
  if (upper.includes("STRENGTH")) return "STRENGTH";
  return "CARDIO & STRENGTH";
}

function getDurationMonths(startDate, endDate) {
  const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 45) return 1;
  if (diffDays <= 130) return 3;
  if (diffDays <= 220) return 6;
  return 12;
}

async function main() {
  console.log("Applying official gym pricing structure to all memberships...");

  // Fetch or create matching MembershipPlan records in DB
  const dbPlans = await prisma.membershipPlan.findMany({
    where: { tenantId: TENANT_ID }
  });

  const planIdMap = {};
  for (const [pName, tiers] of Object.entries(OFFICIAL_PRICES)) {
    for (const [dur, price] of Object.entries(tiers)) {
      const durInt = parseInt(dur);
      let match = dbPlans.find(
        p => p.name.toUpperCase().trim() === pName && p.durationMonths === durInt
      );

      if (!match) {
        match = await prisma.membershipPlan.create({
          data: {
            tenantId: TENANT_ID,
            name: pName,
            durationMonths: durInt,
            price: price,
            description: `${durInt} Months ${pName} membership plan`,
            isActive: true
          }
        });
      } else if (match.price !== price) {
        match = await prisma.membershipPlan.update({
          where: { id: match.id },
          data: { price: price }
        });
      }

      planIdMap[`${pName}_${durInt}`] = match.id;
    }
  }

  const memberships = await prisma.membership.findMany({
    where: { tenantId: TENANT_ID },
    include: { plan: true, member: true }
  });

  let updatedCount = 0;

  for (const m of memberships) {
    const rawName = m.plan ? m.plan.name : "CARDIO & STRENGTH";
    const normName = normalizePlanName(rawName);
    const durMonths = getDurationMonths(new Date(m.startDate), new Date(m.endDate));
    
    const correctPrice = OFFICIAL_PRICES[normName][durMonths] || OFFICIAL_PRICES["CARDIO & STRENGTH"][3];
    const targetPlanId = planIdMap[`${normName}_${durMonths}`];

    await prisma.membership.update({
      where: { id: m.id },
      data: {
        planId: targetPlanId || m.planId,
        totalAmount: correctPrice,
        paidAmount: correctPrice,
        pendingAmount: 0
      }
    });

    updatedCount++;
    console.log(`[Member #${m.member.memberCode} ${m.member.firstName}] ${normName} (${durMonths}M) -> ₹${correctPrice}`);
  }

  console.log(`SUCCESS! Corrected pricing for ${updatedCount} memberships.`);
}

main()
  .catch(e => {
    console.error("Error applying pricing:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
