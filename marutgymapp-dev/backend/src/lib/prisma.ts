import { PrismaClient } from "@prisma/client";

let dbUrl = process.env.DATABASE_URL || "";
if (dbUrl.includes("connection_limit=1")) {
  dbUrl = dbUrl.replace("connection_limit=1", "connection_limit=10");
}
const formattedUrl = dbUrl.includes("pgbouncer=true")
  ? dbUrl
  : dbUrl.includes("?")
  ? `${dbUrl}&pgbouncer=true&connection_limit=10`
  : `${dbUrl}?pgbouncer=true&connection_limit=10`;


const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: formattedUrl,
      },
    },
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
