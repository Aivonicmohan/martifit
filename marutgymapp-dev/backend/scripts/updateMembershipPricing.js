const { PrismaClient } = require("@prisma/client");

const directUrl = "postgresql://postgres:Soh%40Rushi%40143@db.jztpsrjrdjpbdmclxpfb.supabase.co:5432/postgres";
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: directUrl
    }
  }
});
const TENANT_ID = "df702917-b1c4-4160-8672-85fe981d03f8";

// Pricing structure matrix by Plan Name & Duration Tiers
const PRICING_MATRIX = {
  "Strength": {
    1: 1500,
    3: 4000,
    6: 7000,
    12: 12000
  },
  "Cardio & Strength": {
    1: 2000,
    3: 5500,
    6: 9500,
    12: 16000
  },
  "Strength + PT": {
    1: 3500,
    3: 9000,
    6: 16000,
    12: 28000
  },
  "Cardio & Strength + PT": {
    1: 4500,
    3: 12000,
    6: 20000,
    12: 35000
  }
};

function getDurationMonths(startDate, endDate) {
  const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 45) return 1;
  if (diffDays <= 130) return 3;
  if (diffDays <= 220) return 6;
  return 12;
}

async function main() {
  console.log("Updating membership packages and pricing based on duration...");

  const memberships = await prisma.membership.findMany({
    where: { tenantId: TENANT_ID },
    include: {
      plan: true,
      member: true
    }
  });

  let updatedCount = 0;

  for (const m of memberships) {
    const planName = m.plan ? m.plan.name : "Cardio & Strength";
    const durationTier = getDurationMonths(new Date(m.startDate), new Date(m.endDate));
    
    // Get tier pricing or fallback
    const planPricing = PRICING_MATRIX[planName] || PRICING_MATRIX["Cardio & Strength"];
    const calculatedPrice = planPricing[durationTier] || planPricing[3];

    // Ensure plan model durationMonths match if needed or update membership totalAmount & paidAmount
    await prisma.membership.update({
      where: { id: m.id },
      data: {
        totalAmount: calculatedPrice,
        paidAmount: calculatedPrice,
        pendingAmount: 0
      }
    });

    updatedCount++;
    console.log(`[Member #${m.member.memberCode} ${m.member.firstName}] Plan: ${planName} | Duration: ${durationTier} Months -> Price: ₹${calculatedPrice}`);
  }

  console.log(`SUCCESS! Updated pricing for ${updatedCount} memberships.`);
}

main()
  .catch((e) => {
    console.error("Error updating pricing:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
