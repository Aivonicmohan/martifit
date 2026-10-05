const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const devs = await prisma.attendanceDevice.findMany();
  console.log("Devices:", devs.map(d => ({ id: d.id, name: d.name, type: d.deviceType })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
