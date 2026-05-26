const fs = require('fs');
const path = require('path');

// 1. Manually load environment variables from .env
const dotenvPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(dotenvPath)) {
  const envConfig = fs.readFileSync(dotenvPath, 'utf8');
  for (const line of envConfig.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let value = parts.slice(1).join('=').trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  }
}

const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('CRITICAL: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from environment!');
  process.exit(1);
}

const prisma = new PrismaClient();
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const adminEmail = 'superadmin@torque.in';
  const adminPassword = 'TorqueSuperAdmin2026!';
  const adminName = 'Super Admin';

  console.log(`Connecting to Supabase at: ${supabaseUrl}`);
  console.log(`Target Super Admin: ${adminEmail}`);

  // 1. Retrieve or create Super Admin role in database
  let superAdminRole = await prisma.role.findUnique({
    where: { name: 'Super Admin' }
  });

  if (!superAdminRole) {
    console.log('Super Admin role not found in database. Let\'s check roles...');
    // Create it if missing
    superAdminRole = await prisma.role.create({
      data: {
        name: 'Super Admin',
        description: 'Super Administrator with full access'
      }
    });
    console.log('Created Super Admin role in Prisma.');
  } else {
    console.log(`Found Super Admin role with ID: ${superAdminRole.id}`);
  }

  // 2. Manage Supabase Auth user
  let supabaseUserId = null;

  // List users in Supabase to check if they already exist
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error('Failed to list Supabase users:', listError);
    process.exit(1);
  }

  const existingAuthUser = users.find(u => u.email.toLowerCase() === adminEmail.toLowerCase());

  if (existingAuthUser) {
    console.log(`Found existing Supabase Auth user with ID: ${existingAuthUser.id}`);
    supabaseUserId = existingAuthUser.id;

    // Update their password to ensure it matches TorqueSuperAdmin2026!
    const { error: updateError } = await supabase.auth.admin.updateUserById(supabaseUserId, {
      password: adminPassword,
      email_confirm: true
    });

    if (updateError) {
      console.error('Failed to update Supabase password:', updateError.message);
    } else {
      console.log('Successfully updated/synced Supabase user password.');
    }
  } else {
    console.log('Creating new user in Supabase Auth...');
    const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: adminName }
    });

    if (createError) {
      console.error('Failed to create Supabase Auth user:', createError.message);
      process.exit(1);
    }

    supabaseUserId = createdUser.user.id;
    console.log(`Successfully created Supabase Auth user with ID: ${supabaseUserId}`);
  }

  // 3. Manage Prisma Database user record
  const existingPrismaUser = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (existingPrismaUser) {
    console.log(`Found existing Prisma user with ID: ${existingPrismaUser.id}`);
    
    // Ensure the ID matches Supabase auth (it must)
    if (existingPrismaUser.id !== supabaseUserId) {
      console.warn(`WARNING: Prisma user ID (${existingPrismaUser.id}) does not match Supabase user ID (${supabaseUserId})! Recreating/Re-linking...`);
      
      // Delete user first
      await prisma.user.delete({ where: { email: adminEmail } });
      
      // Re-create user with correct ID
      await prisma.user.create({
        data: {
          id: supabaseUserId,
          email: adminEmail,
          fullName: adminName,
          roleId: superAdminRole.id,
          isActive: true
        }
      });
      console.log('Re-linked Prisma user to match Supabase Auth UUID.');
    } else {
      // Just update role and active status
      await prisma.user.update({
        where: { id: supabaseUserId },
        data: {
          roleId: superAdminRole.id,
          isActive: true
        }
      });
      console.log('Updated Prisma user role and status.');
    }
  } else {
    console.log('Creating Prisma user record...');
    await prisma.user.create({
      data: {
        id: supabaseUserId,
        email: adminEmail,
        fullName: adminName,
        roleId: superAdminRole.id,
        isActive: true
      }
    });
    console.log('Successfully created Prisma user record linked to Supabase.');
  }

  console.log('\n=============================================');
  console.log('✅ SUPER ADMIN SETUP COMPLETE!');
  console.log(`Email: ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
  console.log('=============================================\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
