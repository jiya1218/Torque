const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Let's find any pending user or a user with documents to inspect
  const doc = await prisma.document.findFirst({
    where: { entityType: 'User' }
  });
  
  if (!doc) {
    console.log("No documents found with entityType 'User' in the database.");
    return;
  }
  
  const id = '655f5d9a-a3e1-4366-91ab-eef490da9fbc';
  console.log(`Inspecting user ID: ${id}`);
  
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      role: true,
      permissions: true,
      documents: true
    }
  });
  
  if (!user) {
    console.log("User not found in database.");
    return;
  }
  
  console.log("Prisma User relation documents count:", user.documents ? user.documents.length : 'undefined');

  const userDocs = await prisma.document.findMany({
    where: {
      entityType: 'User',
      entityId: id
    }
  });
  console.log("Separately queried documents count:", userDocs.length);

  // Test object serialization
  const userObj = {
    ...user,
    documents: userDocs
  };
  
  console.log("Attached documents in plain cloned object count:", userObj.documents.length);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
