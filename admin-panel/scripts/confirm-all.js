const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Force-confirming all user accounts in auth.users...')

  const result = await prisma.$executeRawUnsafe(
    `UPDATE auth.users 
     SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
         updated_at = NOW()
     WHERE email_confirmed_at IS NULL`
  )

  console.log(`✅ Success! Updated/Confirmed ${result} user(s) in auth.users`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
