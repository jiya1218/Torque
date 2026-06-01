const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Creating public.handle_deleted_user function and trigger on auth.users...')

  const sql1 = `
    CREATE OR REPLACE FUNCTION public.handle_deleted_user()
    RETURNS trigger AS $$
    BEGIN
      -- Nullify manager reference for users reporting to this user
      UPDATE public.users SET "managerId" = NULL WHERE "managerId" = old.id;
      
      -- Nullify assignments and tracking fields
      UPDATE public.leads SET "assignedTo" = NULL WHERE "assignedTo" = old.id;
      UPDATE public.claims SET "assignedTo" = NULL WHERE "assignedTo" = old.id;
      UPDATE public.loans SET "assignedTo" = NULL WHERE "assignedTo" = old.id;
      UPDATE public.rto_work SET "assignedTo" = NULL WHERE "assignedTo" = old.id;
      UPDATE public.fitness_work SET "assignedTo" = NULL WHERE "assignedTo" = old.id;
      UPDATE public.visits SET "userId" = NULL WHERE "userId" = old.id;
      UPDATE public.transactions SET "userId" = NULL WHERE "userId" = old.id;
      UPDATE public.quotations SET "createdBy" = NULL WHERE "createdBy" = old.id;
      UPDATE public.leave_requests SET "approvedBy" = NULL WHERE "approvedBy" = old.id;

      -- Delete child/logs records
      DELETE FROM public.notifications WHERE "userId" = old.id;
      DELETE FROM public.attendance WHERE "userId" = old.id;
      DELETE FROM public.salaries WHERE "userId" = old.id;
      DELETE FROM public.lead_assignments WHERE "userId" = old.id;
      DELETE FROM public.activity_logs WHERE "userId" = old.id;
      DELETE FROM public.lead_whatsapp_logs WHERE "userId" = old.id;
      DELETE FROM public.lead_status_history WHERE "userId" = old.id;
      DELETE FROM public.leave_requests WHERE "userId" = old.id;

      -- Finally delete the user profile itself
      DELETE FROM public.users WHERE id = old.id;
      RETURN old;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  `

  const sql2 = `
    DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
  `

  const sql3 = `
    CREATE TRIGGER on_auth_user_deleted
      AFTER DELETE ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_user();
  `

  try {
    await prisma.$executeRawUnsafe(sql1)
    console.log('✓ Delete function created')
    await prisma.$executeRawUnsafe(sql2)
    console.log('✓ Old delete trigger dropped')
    await prisma.$executeRawUnsafe(sql3)
    console.log('✅ Delete trigger and function created successfully!')
  } catch (error) {
    console.error('Error creating database delete trigger:', error)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
