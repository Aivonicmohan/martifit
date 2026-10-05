const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const membersData = [
  { name: "Samuel", externalBiometricId: "1389", gender: "Male", phone: "7416512388" },
  { name: "Bhavya", externalBiometricId: "1388", gender: "Female", phone: "9014136579" },
  { name: "Rishi", externalBiometricId: "1387", gender: "Male", phone: "8121944308" },
  { name: "Kiran Kumar", externalBiometricId: "1386", gender: "Male", phone: "9705414046" },
  { name: "Laxmi Kanth", externalBiometricId: "1385", gender: "Male", phone: "7396086216" },
  { name: "Elia", externalBiometricId: "1384", gender: "Male", phone: "7815909025" },
  { name: "Leena", externalBiometricId: "1383", gender: "Female", phone: "7207255811" },
  { name: "Deepak", externalBiometricId: "1382", gender: "Male", phone: "8367043497" },
  { name: "Naresh", externalBiometricId: "1381", gender: "Male", phone: "8331852446" },
  { name: "Jaswanth", externalBiometricId: "1380", gender: "Male", phone: "7569812539" },
  { name: "Joyson", externalBiometricId: "1379", gender: "Male", phone: "7989644046" },
  { name: "Satya Prasad", externalBiometricId: "1378", gender: "Male", phone: "8142728936" },
  { name: "Teresa Kumar", externalBiometricId: "1377", gender: "Female", phone: "7036932029" },
  { name: "N Raja Dileep", externalBiometricId: "1376", gender: "Male", phone: "8074627301" },
  { name: "Karthik", externalBiometricId: "1375", gender: "Male", phone: "9849397358" },
  { name: "Vishwanth", externalBiometricId: "1374", gender: "Male", phone: "9492906475" },
  { name: "Ravi Teja", externalBiometricId: "1373", gender: "Male", phone: "9392512303" },
  { name: "Swapna", externalBiometricId: "1372", gender: "Female", phone: "8247865863" },
  { name: "Sai Kiran", externalBiometricId: "1371", gender: "Male", phone: "8897931847" },
  { name: "Siddhu", externalBiometricId: "1370", gender: "Male", phone: "8886280824" },
  { name: "Naidu", externalBiometricId: "1369", gender: "Male", phone: "9966980830" },
  { name: "Dd.rao", externalBiometricId: "1368", gender: "Male", phone: "9440826282" },
  { name: "Kalyan", externalBiometricId: "1367", gender: "Male", phone: "6300197876" },
  { name: "Balaji", externalBiometricId: "1366", gender: "Male", phone: "7997295414" },
  { name: "Umesh", externalBiometricId: "1365", gender: "Male", phone: "6300128050" },
  { name: "Teja", externalBiometricId: "1364", gender: "Male", phone: "9515377504" },
  { name: "Srinivas", externalBiometricId: "1363", gender: "Male", phone: "6300868934" },
  { name: "Ajay Kumar", externalBiometricId: "1362", gender: "Male", phone: "9030995395" },
  { name: "Hari", externalBiometricId: "1361", gender: "Male", phone: "8919438178" },
  { name: "Karthik", externalBiometricId: "1360", gender: "Male", phone: "9515920981" },
  { name: "Jagadeesh", externalBiometricId: "1359", gender: "Male", phone: "9390317356" },
  { name: "Chaandra Kanth", externalBiometricId: "1358", gender: "Male", phone: "8328004569" },
  { name: "Samal", externalBiometricId: "1357", gender: "Male", phone: "9556746561" }
];

async function main() {
  const defaultTenant = await prisma.tenant.findFirst();
  if (!defaultTenant) {
    console.error("No tenant found.");
    return;
  }
  const tenantId = defaultTenant.id;
  let added = 0;
  let skipped = 0;

  for (const m of membersData) {
    const existing = await prisma.member.findFirst({
      where: { tenantId, phone: m.phone }
    });
    if (existing) {
      skipped++;
      console.log(`Skipping duplicate phone: ${m.phone} (${m.name})`);
      continue;
    }

    const nameParts = m.name.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    await prisma.member.create({
      data: {
        tenantId,
        firstName,
        lastName,
        gender: m.gender,
        phone: m.phone,
        externalBiometricId: m.externalBiometricId,
        status: "ACTIVE",
        memberCode: "MEM-" + Math.floor(100000 + Math.random() * 900000)
      }
    });
    added++;
    console.log(`Added: ${m.name}`);
  }

  console.log(`\nFinished! Added: ${added}, Skipped: ${skipped}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
