import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const membersData = [
  { memberCode: "5", firstName: "Sandeep", phone: "6281118908", gender: "Male" },
  { memberCode: "6", firstName: "Dinesh", phone: "6281177314", gender: "Male" },
  { memberCode: "7", firstName: "Teja", phone: "6281210702", gender: "Male" },
  { memberCode: "8", firstName: "Ishaan", phone: "6281215933", gender: "Male" },
  { memberCode: "9", firstName: "Kasi", phone: "6281242593", gender: "Male" },
  { memberCode: "10", firstName: "Karthik", phone: "6281283636", gender: "Male" },
  { memberCode: "11", firstName: "Purushotham", phone: "6281313825", gender: "Male" },
  { memberCode: "12", firstName: "Pavan", phone: "6281462151", gender: "Male" },
  { memberCode: "13", firstName: "Sasank", phone: "6281494891", gender: "Male" },
  { memberCode: "14", firstName: "Kavya", phone: "6281551148", gender: "Male" },
  { memberCode: "15", firstName: "Prakashgosh", phone: "6294969172", gender: "Male" },
  { memberCode: "16", firstName: "Aditya.k", phone: "6300259159", gender: "Male" },
  { memberCode: "17", firstName: "Shruthika", phone: "6300311277", gender: "Male" },
  { memberCode: "18", firstName: "P.lokesh", phone: "6300313118", gender: "Male" },
  { memberCode: "19", firstName: "Rithwi", phone: "9515200351", gender: "Male" },
  { memberCode: "20", firstName: "Sushmi", phone: "6300458410", gender: "Male" },
  { memberCode: "21", firstName: "Preetham.k", phone: "6300692697", gender: "Male" },
  { memberCode: "22", firstName: "Benny", phone: "6300790699", gender: "Male" },
  { memberCode: "23", firstName: "Sai", phone: "6301251549", gender: "Male" },
  { memberCode: "24", firstName: "Jai Shree", phone: "6301440574", gender: "Male" },
  { memberCode: "25", firstName: "P.dinesh", phone: "6301569144", gender: "Male" },
  { memberCode: "26", firstName: "Caroline", phone: "6301684398", gender: "Male" },
  { memberCode: "27", firstName: "Nvs.janardhanarao", phone: "6301773583", gender: "Male" },
  { memberCode: "28", firstName: "Sunitha", phone: "6301881033", gender: "Male" },
  { memberCode: "29", firstName: "Dm.raju", phone: "6302084889", gender: "Male" },
  { memberCode: "38", firstName: "Mohan Reddy", phone: "6302978445", gender: "Male" }
];

async function main() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    throw new Error("No tenant found");
  }

  for (const data of membersData) {
    const existing = await prisma.member.findFirst({
      where: { tenantId: tenant.id, memberCode: data.memberCode }
    });
    
    if (existing) {
      await prisma.member.update({
        where: { id: existing.id },
        data: {
          firstName: data.firstName,
          phone: data.phone,
          gender: data.gender,
        }
      });
      console.log(`Updated member ${data.memberCode} - ${data.firstName}`);
    } else {
      await prisma.member.create({
        data: {
          tenantId: tenant.id,
          memberCode: data.memberCode,
          firstName: data.firstName,
          lastName: "",
          phone: data.phone,
          gender: data.gender,
          email: `${data.firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}.${data.memberCode}@example.com`,
          status: "ACTIVE",
          externalBiometricId: data.memberCode,
        }
      });
      console.log(`Created member ${data.memberCode} - ${data.firstName}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
