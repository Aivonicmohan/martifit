const { PrismaClient } = require("@prisma/client");

const directUrl = "postgresql://postgres:Soh%40Rushi%40143@db.jztpsrjrdjpbdmclxpfb.supabase.co:5432/postgres";
const prisma = new PrismaClient({
  datasources: { db: { url: directUrl } }
});
const TENANT_ID = "df702917-b1c4-4160-8672-85fe981d03f8";

async function main() {
  const plans = await prisma.membershipPlan.findMany({
    where: { tenantId: TENANT_ID }
  });
  console.log("Existing Plans in DB:");
  console.log(JSON.stringify(plans, null, 2));

  const allPlans = await prisma.membershipPlan.findMany();
  console.log("\nAll Plans across system:");
  console.log(JSON.stringify(allPlans, null, 2));
}

main().finally(() => prisma.$disconnect());
