import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env variables
dotenv.config()

const prisma = new PrismaClient()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Key');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function main() {
  const email = 'admin@toque.com'
  const password = 'Admin@123'

  console.log(`Starting Super Admin creation for ${email}...`)

  // 1. Get or create Super Admin role
  let role = await prisma.role.findFirst({
    where: { name: 'Super Admin' }
  })

  if (!role) {
    console.log('Super Admin role not found. Creating one...')
    role = await prisma.role.create({
      data: { name: 'Super Admin', description: 'System Super Admin' }
    })
  }

  // 2. Link all permissions to Super Admin role
  const allPermissions = await prisma.permission.findMany()
  console.log(`Linking ${allPermissions.length} permissions to Super Admin role...`)
  await prisma.role.update({
    where: { id: role.id },
    data: {
      permissions: {
        set: allPermissions.map(p => ({ id: p.id }))
      }
    }
  })

  // 3. Check if user already exists in Supabase
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
  if (listError) {
    console.error('Failed to list Supabase users:', listError)
    process.exit(1)
  }

  const existingAuthUser = users.find(u => u.email === email)
  if (existingAuthUser) {
    console.log('User already exists in Supabase Auth. Deleting for a clean setup...')
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id)
    if (deleteError) {
      console.error('Failed to delete Supabase Auth user:', deleteError)
      process.exit(1)
    }
  }

  // 4. Check if user already exists in Prisma DB
  const existingPrismaUser = await prisma.user.findUnique({
    where: { email }
  })
  if (existingPrismaUser) {
    console.log('User already exists in Prisma DB. Deleting for a clean setup...')
    // Delete any dependent logs/records to avoid FK errors
    await prisma.leadWhatsAppLog.deleteMany({ where: { userId: existingPrismaUser.id } })
    await prisma.leadStatusHistory.deleteMany({ where: { userId: existingPrismaUser.id } })
    await prisma.call.deleteMany({ where: { userId: existingPrismaUser.id } })
    await prisma.user.delete({
      where: { id: existingPrismaUser.id }
    })
  }

  // 5. Create user in Supabase Auth
  console.log('Creating user in Supabase Auth...')
  const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Super Admin' }
  })

  if (createError || !authData.user) {
    console.error('Failed to create Supabase user:', createError)
    process.exit(1)
  }

  console.log(`Supabase Auth user created successfully. ID: ${authData.user.id}`)

  // 6. Create user in Prisma DB
  console.log('Creating user in Prisma DB...')
  const newUser = await prisma.user.create({
    data: {
      id: authData.user.id,
      email,
      fullName: 'Super Admin',
      roleId: role.id,
      isActive: true
    }
  })

  console.log(`Super Admin user created successfully in Prisma DB!`)
  console.log(`Credentials:`)
  console.log(`- Email: ${email}`)
  console.log(`- Password: ${password}`)
  console.log(`You can now log in instantly on both the Web Dashboard and the Mobile App!`)
}

main()
  .catch(err => {
    console.error('Critical Error:', err)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
