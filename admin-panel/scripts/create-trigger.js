const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Creating public.handle_new_user function and trigger on auth.users...')

  const sql1 = `
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger AS $$
    BEGIN
      INSERT INTO public.users (id, email, "fullName", "isActive", "createdAt", "updatedAt")
      VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', 'New Employee'),
        true,
        now(),
        now()
      )
      ON CONFLICT (id) DO NOTHING;
      RETURN new;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `

  const sql2 = `
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  `

  const sql3 = `
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  `

  try {
    await prisma.$executeRawUnsafe(sql1)
    console.log('✓ Function created')
    await prisma.$executeRawUnsafe(sql2)
    console.log('✓ Old trigger dropped')
    await prisma.$executeRawUnsafe(sql3)
    console.log('✅ Trigger and Function created successfully!')
  } catch (error) {
    console.error('Error creating database trigger:', error)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
