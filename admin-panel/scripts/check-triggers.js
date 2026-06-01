const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const triggers = await prisma.$queryRawUnsafe(
    "SELECT trigger_name, event_manipulation, event_object_table, action_statement FROM information_schema.triggers"
  )
  console.log('--- TRIGGERS ---')
  console.log(triggers)

  const pgTriggers = await prisma.$queryRawUnsafe(
    "SELECT tgname FROM pg_trigger"
  )
  console.log('\n--- PG TRIGGERS ---')
  console.log(pgTriggers.map(t => t.tgname).filter(name => !name.startsWith('pg_') && !name.startsWith('sql_')))
}

main().catch(console.error).finally(() => prisma.$disconnect())
