const { PrismaClient } = require('@prisma/client')

const connectionString = process.env.DATABASE_URL.replace('5432', '6543');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionString
    }
  }
})

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      fullName: true,
      isActive: true,
      role: {
        select: {
          name: true
        }
      }
    }
  })
  console.log('--- USERS AND ROLES ---')
  console.log(JSON.stringify(users, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
