const { PrismaClient } = require("@prisma/client");

const directUrl = "postgresql://postgres:Soh%40Rushi%40143@db.jztpsrjrdjpbdmclxpfb.supabase.co:5432/postgres";
const prisma = new PrismaClient({
  datasources: { db: { url: directUrl } }
});
const TENANT_ID = "df702917-b1c4-4160-8672-85fe981d03f8";

async function main() {
  console.log("Seeding sample staff members for Cross Road Fitness...");

  const count = await prisma.staff.count({ where: { tenantId: TENANT_ID } });
  if (count > 0) {
    console.log(`Found ${count} existing staff members.`);
    return;
  }

  const sampleStaff = [
    {
      tenantId: TENANT_ID,
      name: "Sowji",
      phone: "9849000685",
      email: "owner@crossroadfitness.com",
      gender: "FEMALE",
      staffType: "OWNER",
      roleTitle: "Gym Owner",
      baseSalary: 50000,
      salaryDay: 1,
      dob: new Date("1988-05-15"),
      anniversary: new Date("2012-11-20"),
    },
    {
      tenantId: TENANT_ID,
      name: "Rahul Sharma",
      phone: "9876543210",
      email: "rahul@crossroadfitness.com",
      gender: "MALE",
      staffType: "TRAINER",
      roleTitle: "Head Personal Trainer",
      baseSalary: 25000,
      salaryDay: 5,
      dob: new Date("1994-08-10"),
    },
    {
      tenantId: TENANT_ID,
      name: "Priya Reddy",
      phone: "9988776655",
      email: "priya@crossroadfitness.com",
      gender: "FEMALE",
      staffType: "RECEPTIONIST",
      roleTitle: "Front Desk Receptionist",
      baseSalary: 15000,
      salaryDay: 1,
      dob: new Date("1997-03-22"),
    },
    {
      tenantId: TENANT_ID,
      name: "Suresh Babu",
      phone: "9123456789",
      gender: "MALE",
      staffType: "HOUSE_KEEPING",
      roleTitle: "House Keeping Lead",
      baseSalary: 12000,
      salaryDay: 10,
    }
  ];

  for (const s of sampleStaff) {
    const created = await prisma.staff.create({ data: s });
    console.log(`Created staff: ${created.name} (${created.staffType}) - Salary: ₹${created.baseSalary}`);
  }

  console.log("Sample staff seeding completed successfully!");
}

main().finally(() => prisma.$disconnect());
