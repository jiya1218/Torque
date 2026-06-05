const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Updating documents with null uploadedBy...");
  
  const docsToUpdate = await prisma.document.findMany({
    where: {
      entityType: 'User',
      uploadedBy: null
    }
  });

  console.log(`Found ${docsToUpdate.length} documents to update.`);

  let updatedCount = 0;
  for (const doc of docsToUpdate) {
    if (doc.entityId) {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: doc.entityId }
      });
      if (user) {
        await prisma.document.update({
          where: { id: doc.id },
          data: { uploadedBy: doc.entityId }
        });
        updatedCount++;
      } else {
        console.log(`Skipping doc ${doc.id} because user ${doc.entityId} does not exist in users table.`);
      }
    }
  }

  console.log(`Successfully updated ${updatedCount} documents.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
