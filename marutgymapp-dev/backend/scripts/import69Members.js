const { PrismaClient } = require("@prisma/client");

const directUrl = "postgresql://postgres:Soh%40Rushi%40143@db.jztpsrjrdjpbdmclxpfb.supabase.co:5432/postgres";
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: directUrl
    }
  }
});
const TENANT_ID = "df702917-b1c4-4160-8672-85fe981d03f8";

const rawMembers = [
  { code: "196", name: "Manikantha", planName: "Strength", startDateStr: "2026-06-27", endDateStr: "2026-12-26" },
  { code: "278", name: "K.vignankumar", planName: "Cardio & Strength", startDateStr: "2026-06-26", endDateStr: "2026-09-25" },
  { code: "335", name: "Ravi Raja", planName: "Cardio & Strength", startDateStr: "2026-06-26", endDateStr: "2026-09-25" },
  { code: "652", name: "K.ravi", planName: "Strength", startDateStr: "2026-06-25", endDateStr: "2026-09-24" },
  { code: "1484", name: "K.rohith", planName: "Strength", startDateStr: "2026-06-25", endDateStr: "2026-09-24" },
  { code: "1328", name: "Viswanth", planName: "Strength", startDateStr: "2026-06-25", endDateStr: "2026-09-24" },
  { code: "1346", name: "Ramesh", planName: "Strength", startDateStr: "2026-06-20", endDateStr: "2026-09-19" },
  { code: "1483", name: "Nitin", planName: "Cardio & Strength", startDateStr: "2026-06-24", endDateStr: "2026-09-23" },
  { code: "1467", name: "Jaswanth", planName: "Strength", startDateStr: "2026-06-23", endDateStr: "2026-09-22" },
  { code: "868", name: "Subash.k", planName: "Strength", startDateStr: "2026-06-23", endDateStr: "2026-09-22" },
  { code: "1482", name: "Shiva Kumar", planName: "Strength", startDateStr: "2026-06-21", endDateStr: "2026-12-20" },
  { code: "1480", name: "B Lalitha", planName: "Strength + PT", startDateStr: "2026-06-08", endDateStr: "2026-09-17" },
  { code: "1478", name: "Murali", planName: "Cardio & Strength", startDateStr: "2026-06-16", endDateStr: "2027-06-15" },
  { code: "1107", name: "K.narsiingh", planName: "Strength", startDateStr: "2026-06-13", endDateStr: "2026-09-12" },
  { code: "1477", name: "S.kavi", planName: "Cardio & Strength", startDateStr: "2026-06-12", endDateStr: "2026-09-11" },
  { code: "1476", name: "Jhaswanth", planName: "Cardio & Strength", startDateStr: "2026-06-10", endDateStr: "2026-09-09" },
  { code: "1475", name: "Rupesh", planName: "Cardio & Strength", startDateStr: "2026-06-10", endDateStr: "2026-09-09" },
  { code: "1241", name: "Sai", planName: "Strength", startDateStr: "2026-06-01", endDateStr: "2026-08-31" },
  { code: "281", name: "Jagadish G", planName: "Strength", startDateStr: "2026-06-02", endDateStr: "2026-09-01" },
  { code: "1474", name: "Likith", planName: "Cardio & Strength", startDateStr: "2026-06-09", endDateStr: "2026-09-08" },
  { code: "1472", name: "Varshitha", planName: "Cardio & Strength", startDateStr: "2026-06-05", endDateStr: "2026-09-04" },
  { code: "1471", name: "Ashok", planName: "Cardio & Strength + PT", startDateStr: "2026-06-08", endDateStr: "2026-09-07" },
  { code: "1470", name: "Raju", planName: "Cardio & Strength", startDateStr: "2026-06-06", endDateStr: "2026-09-05" },
  { code: "186", name: "Gowri Shankar", planName: "Cardio & Strength", startDateStr: "2026-06-04", endDateStr: "2026-09-03" },
  { code: "1399", name: "Yugandhar", planName: "Strength", startDateStr: "2026-06-03", endDateStr: "2026-09-02" },
  { code: "1398", name: "Kishore", planName: "Strength", startDateStr: "2026-06-03", endDateStr: "2026-09-02" },
  { code: "1414", name: "Satish", planName: "Strength", startDateStr: "2026-06-01", endDateStr: "2026-08-31" },
  { code: "893", name: "Venkatesh", planName: "Strength", startDateStr: "2026-05-20", endDateStr: "2027-05-19" },
  { code: "1462", name: "Lohith", planName: "Cardio & Strength", startDateStr: "2026-05-28", endDateStr: "2027-05-27" },
  { code: "141", name: "Srikanth.a", planName: "Cardio & Strength", startDateStr: "2025-11-20", endDateStr: "2026-11-19" },
  { code: "686", name: "Lakshmi", planName: "Cardio & Strength", startDateStr: "2026-05-11", endDateStr: "2026-09-09" },
  { code: "317", name: "Daanish", planName: "Cardio & Strength", startDateStr: "2026-04-26", endDateStr: "2026-10-25" },
  { code: "162", name: "Kumar", planName: "Cardio & Strength", startDateStr: "2026-04-16", endDateStr: "2027-04-15" },
  { code: "1446", name: "Shiva", planName: "Strength", startDateStr: "2026-03-05", endDateStr: "2026-09-04" },
  { code: "642", name: "V.prakas Rao", planName: "Cardio & Strength", startDateStr: "2026-03-04", endDateStr: "2027-03-03" },
  { code: "1420", name: "Vijaya", planName: "Cardio & Strength", startDateStr: "2026-04-09", endDateStr: "2027-02-20" },
  { code: "53", name: "M Krishna Sai", planName: "Strength", startDateStr: "2026-04-09", endDateStr: "2027-04-08" },
  { code: "1407", name: "Manikanta", planName: "Cardio & Strength", startDateStr: "2026-04-07", endDateStr: "2027-04-06" },
  { code: "1162", name: "Ravi Kiran N", planName: "Strength", startDateStr: "2026-03-16", endDateStr: "2026-09-15" },
  { code: "1008", name: "Siva Kumar", planName: "Cardio & Strength", startDateStr: "2026-03-19", endDateStr: "2027-03-18" },
  { code: "374", name: "Veena Reddy", planName: "Strength", startDateStr: "2026-03-05", endDateStr: "2027-03-04" },
  { code: "631", name: "K.v.ramana", planName: "Strength", startDateStr: "2026-03-10", endDateStr: "2027-03-09" },
  { code: "362", name: "K Srinivasa Rao", planName: "Cardio & Strength", startDateStr: "2026-03-09", endDateStr: "2027-03-08" },
  { code: "1119", name: "Suresh", planName: "Strength", startDateStr: "2026-02-09", endDateStr: "2027-02-08" },
  { code: "280", name: "Bobby", planName: "Cardio & Strength", startDateStr: "2026-02-19", endDateStr: "2027-02-18" },
  { code: "1221", name: "Vamsi Reddy", planName: "Strength", startDateStr: "2025-11-17", endDateStr: "2026-11-16" },
  { code: "166", name: "Murali", planName: "Strength", startDateStr: "2026-01-01", endDateStr: "2026-12-31" },
  { code: "649", name: "M.mohana Rao", planName: "Strength", startDateStr: "2026-03-01", endDateStr: "2027-02-28" },
  { code: "788", name: "T.satish Kumar", planName: "Cardio & Strength", startDateStr: "2025-12-15", endDateStr: "2026-12-14" },
  { code: "706", name: "S Swathi", planName: "Cardio & Strength", startDateStr: "2026-01-08", endDateStr: "2027-01-07" },
  { code: "1425", name: "Jp Sunil Kumar", planName: "Cardio & Strength", startDateStr: "2026-02-07", endDateStr: "2027-02-06" },
  { code: "981", name: "Prakash", planName: "Cardio & Strength", startDateStr: "2026-01-01", endDateStr: "2026-12-31" },
  { code: "568", name: "Chaitanya", planName: "Cardio & Strength", startDateStr: "2025-11-01", endDateStr: "2026-10-31" },
  { code: "74", name: "Prem", planName: "Strength", startDateStr: "2025-12-15", endDateStr: "2026-12-14" },
  { code: "326", name: "Vamsi Teja.d", planName: "Cardio & Strength", startDateStr: "2026-06-01", endDateStr: "2027-07-30" },
  { code: "762", name: "Aravind Kumar", planName: "Cardio & Strength", startDateStr: "2026-01-08", endDateStr: "2027-03-10" },
  { code: "1381", name: "Naresh", planName: "Strength", startDateStr: "2026-01-08", endDateStr: "2027-03-08" },
  { code: "1422", name: "S.sai Kumar", planName: "Cardio & Strength", startDateStr: "2026-01-07", endDateStr: "2027-04-16" },
  { code: "1421", name: "P Krishna Reddy", planName: "Strength", startDateStr: "2025-12-31", endDateStr: "2027-01-29" },
  { code: "443", name: "Rambabu.a", planName: "Cardio & Strength", startDateStr: "2026-01-01", endDateStr: "2026-12-31" },
  { code: "1093", name: "Dinesh Kumar", planName: "Cardio & Strength", startDateStr: "2025-11-18", endDateStr: "2026-12-17" },
  { code: "604", name: "Farooq", planName: "Strength", startDateStr: "2025-11-15", endDateStr: "2026-11-14" },
  { code: "480", name: "A.s.naidu", planName: "Cardio & Strength", startDateStr: "2025-11-08", endDateStr: "2026-11-07" },
  { code: "1340", name: "Prakash", planName: "Cardio & Strength", startDateStr: "2025-10-15", endDateStr: "2026-10-14" },
  { code: "1378", name: "Satya Prasad", planName: "Cardio & Strength", startDateStr: "2025-10-07", endDateStr: "2026-10-06" },
  { code: "685", name: "Pandu Ranga Rao", planName: "Cardio & Strength", startDateStr: "2025-09-01", endDateStr: "2026-08-31" },
  { code: "577", name: "Tulsi Ram Patel", planName: "Cardio & Strength", startDateStr: "2025-09-08", endDateStr: "2026-09-07" },
  { code: "647", name: "Aravind", planName: "Cardio & Strength", startDateStr: "2025-09-03", endDateStr: "2026-09-02" },
  { code: "236", name: "S.praveen Kumar", planName: "Cardio & Strength", startDateStr: "2025-12-18", endDateStr: "2027-02-15" }
];

async function main() {
  console.log("Starting fast direct import of 69 Cross Road Fitness members...");

  const planMap = {};
  const planTypes = [
    { name: "Strength", price: 1500, durationMonths: 3 },
    { name: "Cardio & Strength", price: 2500, durationMonths: 3 },
    { name: "Strength + PT", price: 4000, durationMonths: 3 },
    { name: "Cardio & Strength + PT", price: 5000, durationMonths: 3 }
  ];

  for (const p of planTypes) {
    let existingPlan = await prisma.membershipPlan.findFirst({
      where: { tenantId: TENANT_ID, name: p.name }
    });

    if (!existingPlan) {
      existingPlan = await prisma.membershipPlan.findFirst({
        where: { name: p.name }
      });
    }

    if (!existingPlan) {
      existingPlan = await prisma.membershipPlan.create({
        data: {
          tenantId: TENANT_ID,
          name: p.name,
          description: `${p.name} membership plan`,
          durationMonths: p.durationMonths,
          price: p.price,
          joiningFee: 0,
          isActive: true
        }
      });
    }

    planMap[p.name] = existingPlan.id;
  }

  const defaultPlanId = Object.values(planMap)[0];
  let createdCount = 0;
  let updatedCount = 0;

  for (const mData of rawMembers) {
    const planId = planMap[mData.planName] || defaultPlanId;
    const startDate = new Date(mData.startDateStr);
    const endDate = new Date(mData.endDateStr);
    const nameParts = mData.name.trim().split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || ".";

    let member = await prisma.member.findFirst({
      where: {
        tenantId: TENANT_ID,
        OR: [
          { memberCode: mData.code },
          { firstName: { equals: firstName, mode: "insensitive" } }
        ]
      }
    });

    if (!member) {
      member = await prisma.member.create({
        data: {
          tenantId: TENANT_ID,
          memberCode: mData.code,
          firstName,
          lastName,
          gender: "Male",
          phone: `98490${mData.code.padStart(5, "0")}`,
          status: "ACTIVE",
          joiningDate: startDate
        }
      });
      createdCount++;
    } else {
      updatedCount++;
    }

    const existingMembership = await prisma.membership.findFirst({
      where: { memberId: member.id }
    });

    if (!existingMembership) {
      await prisma.membership.create({
        data: {
          tenantId: TENANT_ID,
          memberId: member.id,
          planId,
          startDate,
          endDate,
          status: "ACTIVE",
          totalAmount: 2500,
          paidAmount: 2500,
          pendingAmount: 0
        }
      });
    } else {
      await prisma.membership.update({
        where: { id: existingMembership.id },
        data: {
          planId,
          startDate,
          endDate,
          status: "ACTIVE"
        }
      });
    }
  }

  console.log(`SUCCESS! Created: ${createdCount}, Updated: ${updatedCount}, Total Processed: ${rawMembers.length}`);
}

main()
  .catch((e) => {
    console.error("Error during import:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
