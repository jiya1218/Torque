const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      documents: true,
      role: true
    }
  });

  console.log("All users in DB:");
  for (const u of users) {
    console.log(`- User: ${u.fullName} (${u.email}) id: ${u.id}, active: ${u.isActive}, role: ${u.role?.name}, docs count: ${u.documents.length}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
