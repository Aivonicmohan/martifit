import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const membersData = [
  { memberCode: "30", firstName: "K.gopinadh", phone: "6302115110", gender: "Male" },
  { memberCode: "31", firstName: "M.bhavya", phone: "6302240872", gender: "Female" },
  { memberCode: "32", firstName: "Sanjay.b", phone: "6302367967", gender: "Male" },
  { memberCode: "33", firstName: "Bhavani Sankar", phone: "6302415429", gender: "Male" },
  { memberCode: "34", firstName: "M.vikash", phone: "6302446897", gender: "Male" },
  { memberCode: "35", firstName: "B Divya Teja", phone: "6302666710", gender: "Female" },
  { memberCode: "36", firstName: "Pavani A", phone: "6302756526", gender: "Male" },
  { memberCode: "37", firstName: "Sampath", phone: "6302808212", gender: "Male" },
  { memberCode: "39", firstName: "Sai P", phone: "6303039981", gender: "Male" },
  { memberCode: "40", firstName: "Hima Bindhu", phone: "6303200979", gender: "Female" },
  { memberCode: "41", firstName: "Mihira.p", phone: "6303365295", gender: "Male" },
  { memberCode: "42", firstName: "Srinivas", phone: "6303502723", gender: "Male" },
  { memberCode: "43", firstName: "P.mehul", phone: "6303649587", gender: "Male" },
  { memberCode: "44", firstName: "lvl.bholanath", phone: "6303670617", gender: "Male" },
  { memberCode: "45", firstName: "B.vamsi", phone: "6303721160", gender: "Male" },
  { memberCode: "46", firstName: "B.santoshi", phone: "6303734841", gender: "Male" },
  { memberCode: "47", firstName: "M.raviteja", phone: "6303790255", gender: "Male" },
  { memberCode: "48", firstName: "D. Rajesh", phone: "6304243648", gender: "Male" },
  { memberCode: "49", firstName: "Haritha.s", phone: "6304678962", gender: "Male" },
  { memberCode: "50", firstName: "K. Dinesh", phone: "6304744962", gender: "Male" },
  { memberCode: "51", firstName: "Pavan Kumar", phone: "6304885905", gender: "Male" },
  { memberCode: "52", firstName: "Yugandhar", phone: "6304998358", gender: "Male" },
  { memberCode: "53", firstName: "M Krishna Sai", phone: "6305073294", gender: "Male" },
  { memberCode: "54", firstName: "Harsavardhan", phone: "6305106160", gender: "Male" },
  { memberCode: "55", firstName: "L.dheeraj", phone: "6305316727", gender: "Male" },
  { memberCode: "56", firstName: "Bharath Kumar", phone: "6305433245", gender: "Male" },
  { memberCode: "57", firstName: "Rukmini", phone: "6305875439", gender: "Male" },
  { memberCode: "58", firstName: "S. Rohith", phone: "6305904850", gender: "Male" },
  { memberCode: "59", firstName: "Tejaswini", phone: "6305967336", gender: "Female" },
  { memberCode: "60", firstName: "Shubham", phone: "6306165318", gender: "Male" },
  { memberCode: "61", firstName: "J.rahul", phone: "6309310648", gender: "Male" },
  { memberCode: "62", firstName: "Bharath.p", phone: "6370760407", gender: "Male" }
];

async function main() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error("No tenant found");

  // Create or Update new members from screenshots 30-62
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
          status: "EXPIRED",
          externalBiometricId: data.memberCode,
        }
      });
      console.log(`Created member ${data.memberCode} - ${data.firstName} with status EXPIRED`);
    }
  }

  // Find all members in the DB who have NO active membership
  const membersWithoutActivePlan = await prisma.member.findMany({
    where: {
      tenantId: tenant.id,
      memberships: {
        none: { status: "ACTIVE" }
      }
    }
  });

  // Mark them as EXPIRED
  for (const member of membersWithoutActivePlan) {
    if (member.status !== "EXPIRED") {
      await prisma.member.update({
        where: { id: member.id },
        data: { status: "EXPIRED" }
      });
      console.log(`Marked member ${member.memberCode} - ${member.firstName} as EXPIRED due to no active plan`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
