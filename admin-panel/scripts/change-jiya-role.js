const { PrismaClient } = require('@prisma/client')
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// 1. Manually parse .env file
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const matched = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (matched) {
      const key = matched[1]
      let value = matched[2] || ''
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1)
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1)
      }
      process.env[key] = value
    }
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in env!');
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const prisma = new PrismaClient()

async function main() {
  const email = 'jiya.scalezix@gmail.com'
  const newPassword = '123456'

  // A. Find user in public schema
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true }
  })

  if (!user) {
    console.error(`Error: User with email ${email} not found in public database!`);
    return;
  }

  console.log(`Found public user: ${user.fullName} (${user.email}) with ID: ${user.id}`)

  // B. Find "HR Manager" role
  const hrRole = await prisma.role.findUnique({
    where: { name: 'HR Manager' }
  })

  if (!hrRole) {
    console.error('Error: "HR Manager" role not found in database!');
    return;
  }

  // C. Update user role in public.users
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { roleId: hrRole.id },
    include: { role: true }
  })
  console.log(`Successfully updated role in public database to: ${updatedUser.role?.name}`)

  // D. Update password in Supabase Auth schema
  console.log('Updating password in Supabase Auth...')
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    password: newPassword
  })

  if (error) {
    console.error('Failed to update password in Supabase Auth:', error.message)
  } else {
    console.log('Successfully updated password in Supabase Auth!')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
