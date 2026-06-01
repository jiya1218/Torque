const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const authUsers = await prisma.$queryRawUnsafe(
    "SELECT id, email FROM auth.users WHERE email IN ('rahi.shaikh22@gmail.com', 'admin@toque.com', 'jiya.scalezix@gmail.com')"
  )
  console.log('--- AUTH USERS ---')
  console.log(authUsers)

  const publicUsers = await prisma.user.findMany({
    where: {
      email: { in: ['rahi.shaikh22@gmail.com', 'admin@toque.com', 'jiya.scalezix@gmail.com'] }
    }
  })
  console.log('\n--- PUBLIC USERS ---')
  publicUsers.forEach(u => {
    console.log(`Email: ${u.email} | ID: ${u.id}`)
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
