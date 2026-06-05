const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.role.findMany({
    include: {
      permissions: true
    }
  });

  console.log("Roles and their permissions:");
  for (const r of roles) {
    console.log(`- Role: ${r.name}`);
    console.log(`  Permissions: ${r.permissions.map(p => p.name).join(', ')}`);
  }

  const users = await prisma.user.findMany({
    include: {
      permissions: true,
      role: {
        include: {
          permissions: true
        }
      }
    }
  });

  console.log("\nUsers and their actual permissions:");
  for (const u of users) {
    const rolePerms = u.role?.permissions.map(p => p.name) || [];
    const extraPerms = u.permissions.map(p => p.name) || [];
    const allPerms = Array.from(new Set([...rolePerms, ...extraPerms]));
    console.log(`- User: ${u.fullName} (${u.role?.name || 'No Role'}):`);
    console.log(`  Merged Permissions: ${allPerms.join(', ')}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
