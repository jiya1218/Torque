const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const authUsers = await prisma.$queryRawUnsafe(
    "SELECT id, email, email_confirmed_at, confirmed_at, last_sign_in_at, confirmed_at IS NOT NULL as is_confirmed FROM auth.users"
  )
  console.log('--- AUTH USERS CONFIRMATION STATUS ---')
  console.log(authUsers)
}

main().catch(console.error).finally(() => prisma.$disconnect())
