const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const cmds = await prisma.biometricCommand.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log(cmds);
}
main().catch(console.error).finally(() => prisma.$disconnect());
