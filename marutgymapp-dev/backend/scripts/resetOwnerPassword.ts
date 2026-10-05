import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/jwt";

const directUrl = "postgresql://postgres:Soh%40Rushi%40143@db.jztpsrjrdjpbdmclxpfb.supabase.co:5432/postgres";
const prisma = new PrismaClient({
  datasources: { db: { url: directUrl } }
});

async function main() {
  console.log("Setting owner@crossroadfitness.com password to 'crossroad123'...");

  const passwordHash = await hashPassword("crossroad123");

  const updated = await prisma.user.update({
    where: { email: "owner@crossroadfitness.com" },
    data: { passwordHash, isActive: true },
  });

  console.log(`Password reset successfully for ${updated.email}!`);
}

main().finally(() => prisma.$disconnect());
