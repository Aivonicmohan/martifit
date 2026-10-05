const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const devs = await prisma.attendanceDevice.findMany();
  console.log("Devices:", devs.map(d => ({ id: d.id, type: d.deviceType })));

  const cmds = await prisma.biometricCommand.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("\nCommands:");
  cmds.forEach(c => {
    console.log(`[${c.status}] ${c.command} | updated: ${c.updatedAt}`);
  });
}
main().catch(console.error).finally(() => prisma.$disconnect());
