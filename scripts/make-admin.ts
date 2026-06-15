// Promote a user to admin so they can access /admin.
//   npm run make-admin -- you@example.com
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run make-admin -- <email>");
    process.exit(1);
  }
  const user = await prisma.user.update({
    where: { email },
    data: { role: "admin" },
    select: { email: true, role: true, shortId: true },
  });
  console.log("✓ Promoted:", JSON.stringify(user));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("Failed (is the email registered? log in once first):", e.message);
  await prisma.$disconnect();
  process.exit(1);
});
