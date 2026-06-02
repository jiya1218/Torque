const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Locating Telecaller role in database...')
  
  // 1. Find Telecaller role
  const telecallerRole = await prisma.role.findFirst({
    where: { name: { equals: 'Telecaller', mode: 'insensitive' } }
  })

  if (!telecallerRole) {
    console.log('ℹ️ Telecaller role does not exist in the database. No cleanup needed!')
    return
  }

  console.log(`Found role: ${telecallerRole.name} (ID: ${telecallerRole.id})`)

  // 2. Find any alternative role to reassign users (e.g., Sales Executive)
  const salesExecutiveRole = await prisma.role.findFirst({
    where: { name: { equals: 'Sales Executive', mode: 'insensitive' } }
  })

  // 3. Find users assigned to Telecaller
  const affectedUsers = await prisma.user.findMany({
    where: { roleId: telecallerRole.id }
  })

  if (affectedUsers.length > 0) {
    console.log(`⚠️ Found ${affectedUsers.length} users assigned to Telecaller role. Reassigning...`)
    
    for (const u of affectedUsers) {
      const nextRoleName = salesExecutiveRole ? 'Sales Executive' : 'Direct/None'
      const nextRoleId = salesExecutiveRole ? salesExecutiveRole.id : null
      
      await prisma.user.update({
        where: { id: u.id },
        data: { roleId: nextRoleId }
      })
      console.log(`  ✓ Reassigned ${u.fullName} (${u.email}) to ${nextRoleName}`)
    }
  }

  // 4. Delete Telecaller role associations from permissions mapping
  // Note: Prisma relations connect/disconnect are handled. When deleting the Role record, Prisma automatically handles the join table deletions for implicit many-to-many rolePermissions!
  console.log('🗑️ Deleting Telecaller role from PostgreSQL...')
  
  await prisma.role.delete({
    where: { id: telecallerRole.id }
  })

  console.log('✅ Telecaller role successfully removed from database!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
