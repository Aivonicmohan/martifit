const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const cmds = await prisma.biometricCommand.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(cmds, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
