import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const users = [
  ["admin", "Administrator", "admin@dsr.com", "admin123", Role.ADMIN, "", "", "", "Full"],
  ["dc", "District Commissioner (Jalandhar)", "dc@dsr.com", "dc123", Role.DISTRICT_OWNER, "Jalandhar", "", "", "District review"],
  ["officer", "Geology Officer", "officer@dsr.com", "officer123", Role.OFFICER, "Jalandhar", "", "", "Legacy data entry"],
  ["reviewer", "State Reviewer", "reviewer@dsr.com", "reviewer123", Role.REVIEWER, "", "", "", "Legacy reviewer"],
  ["iit@demo.com", "IIT Ropar Survey Team", "iit@demo.com", "password123", Role.IIT_ROPAR, "", "", "", "Front matter + Chapters 1-4 + Review"],
  ["sdlc@demo.com", "SDLC Committee", "sdlc@demo.com", "password123", Role.SDLC, "Jalandhar", "", "", "District-level SDLC data"],
  ["sdo@demo.com", "Sub-Divisional Officer", "sdo@demo.com", "password123", Role.SDO, "Jalandhar", "Block A", "", "Chapters 5-10"],
  ["je@demo.com", "Junior Engineer Field Team", "je@demo.com", "password123", Role.JE, "Jalandhar", "Block A", "Field Data", "Field data"],
  ["axen@demo.com", "Assistant Executive Engineer", "axen@demo.com", "password123", Role.AXEN, "Jalandhar", "", "Section A", "Assigned section"],
  ["gis@demo.com", "GIS Team", "gis@demo.com", "password123", Role.GIS, "", "", "", "Plates + Graphs + Annexures + Review"],
  ["reviewer1@gov.in", "Government Reviewer 1", "reviewer1@gov.in", "password123", Role.REVIEWER_1, "", "", "", "Govt review"],
  ["reviewer2@gov.in", "Government Reviewer 2", "reviewer2@gov.in", "password123", Role.REVIEWER_2, "", "", "", "Govt review"],
  ["admin@demo.com", "Portal Administrator", "admin@demo.com", "password123", Role.ADMIN, "", "", "", "Full"]
] as const;

async function main() {
  for (const [username, fullName, email, password, role, district, blockName, sectionName, accessScope] of users) {
    await prisma.user.upsert({
      where: { username },
      update: {},
      create: {
        username,
        fullName,
        email,
        password: await bcrypt.hash(password, 10),
        role,
        district,
        blockName,
        sectionName,
        accessScope,
        active: true
      }
    });
  }
}

main()
  .then(async () => {
    console.log("Seed users created.");
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
