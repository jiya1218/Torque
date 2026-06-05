const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      documents: true,
      role: true
    }
  });
  console.log("Users and their documents count:");
  for (const u of users) {
    console.log(`- User: ${u.fullName} (id: ${u.id}, email: ${u.email}, active: ${u.isActive}, role: ${u.role?.name})`);
    console.log(`  Documents:`);
    if (u.documents.length === 0) {
      console.log("    None");
    }
    for (const d of u.documents) {
      console.log(`    * ${d.fileName}: ${d.filePath} (uploadedBy: ${d.uploadedBy}, entityId: ${d.entityId})`);
    }
  }

  const allDocs = await prisma.document.findMany();
  console.log("\nAll documents in DB count:", allDocs.length);
  for (const d of allDocs) {
    console.log(`* ID: ${d.id}, entityType: ${d.entityType}, entityId: ${d.entityId}, fileName: ${d.fileName}, filePath: ${d.filePath}, uploadedBy: ${d.uploadedBy}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
