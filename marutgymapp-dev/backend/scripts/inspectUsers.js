const { PrismaClient } = require("@prisma/client");

const directUrl = "postgresql://postgres:Soh%40Rushi%40143@db.jztpsrjrdjpbdmclxpfb.supabase.co:5432/postgres";
const prisma = new PrismaClient({
  datasources: { db: { url: directUrl } }
});
const TENANT_ID = "df702917-b1c4-4160-8672-85fe981d03f8";

async function main() {
  const users = await prisma.user.findMany({
    include: { tenant: true }
  });
  console.log("All Registered Users in DB:");
  users.forEach(u => {
    console.log(`Email: ${u.email} | Name: ${u.name} | Tenant: ${u.tenant?.name}`);
  });
}

main().finally(() => prisma.$disconnect());
