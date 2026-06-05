const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { isActive: false },
    include: {
      role: true
    }
  });

  console.log("Pending users and all documents matching their ID in DB:");
  for (const u of users) {
    console.log(`- User: ${u.fullName} (${u.email}) id: ${u.id}`);
    
    // Find documents by entityId
    const docsByEntity = await prisma.document.findMany({
      where: { entityId: u.id }
    });
    console.log(`  Docs by entityId count: ${docsByEntity.length}`);
    for (const d of docsByEntity) {
      console.log(`    * EntityDoc: ${d.fileName} -> ${d.filePath} (uploadedBy: ${d.uploadedBy})`);
    }

    // Find documents by uploadedBy
    const docsByUploadedBy = await prisma.document.findMany({
      where: { uploadedBy: u.id }
    });
    console.log(`  Docs by uploadedBy count: ${docsByUploadedBy.length}`);
    for (const d of docsByUploadedBy) {
      console.log(`    * UploadedDoc: ${d.fileName} -> ${d.filePath} (entityId: ${d.entityId})`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
