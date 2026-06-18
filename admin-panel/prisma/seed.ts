import prisma from '../src/lib/prisma'
import { v4 as uuidv4 } from 'uuid'

const PERMISSIONS = [
  // 1. Authentication & Security (6)
  "auth.login", "auth.logout", "auth.pin_setup", "auth.biometric_enable", "auth.session_manage", "auth.reset_access",
  // 2. Role & Permission Management (6)
  "role.view", "role.create", "role.edit", "role.delete", "role.assign_permissions", "role.manage_users",
  // 3. Lead Management (8)
  "lead.view", "lead.create", "lead.edit", "lead.delete", "lead.assign", "lead.import", "lead.export", "lead.change_status",
  // 4. Rate Calculator (6)
  "rate.view", "rate.calculate", "rate.edit_rules", "rate.manage_addons", "rate.configure_tables", "rate.export",
  // 5. RTO Work Management (6)
  "rto.view", "rto.create", "rto.edit", "rto.delete", "rto.update_status", "rto.track_payment",
  // 5b. Vahan Work Management (6)
  "vahan.view", "vahan.create", "vahan.edit", "vahan.delete", "vahan.update_status", "vahan.track_payment",
  // 6. Fitness Work Management (6)
  "fitness.view", "fitness.create", "fitness.edit", "fitness.delete", "fitness.update_status", "fitness.track_payment",
  // 7. Claims Management (6)
  "claims.view", "claims.create", "claims.edit", "claims.delete", "claims.update_status", "claims.upload_documents",
  // 8. Accounts & Finance (7)
  "accounts.view", "accounts.create_entry", "accounts.edit_entry", "accounts.delete_entry", "accounts.view_reports", "accounts.export", "accounts.manage_salary",
  // 9. HR Management (7)
  "hr.view", "hr.create", "hr.edit", "hr.delete", "hr.manage_attendance", "hr.manage_leave", "hr.view_performance",
  // 10. Loan Department (6)
  "loan.view", "loan.create", "loan.edit", "loan.delete", "loan.update_status", "loan.track_conversion",
  // 11. CRM System (6)
  "crm.view", "crm.create", "crm.edit", "crm.delete", "crm.manage_followups", "crm.view_revenue",
  // 12. Customer Visit Module (6)
  "visit.view", "visit.create", "visit.edit", "visit.delete", "visit.track_location", "visit.manage_followups",
  // 13. Data Management (6)
  "data.view", "data.create", "data.edit", "data.delete", "data.approve_changes", "data.manage_documents",
  // 14. Quotation System (6)
  "quotation.view", "quotation.create", "quotation.edit", "quotation.delete", "quotation.generate_pdf", "quotation.share",
  // 15. Dashboard & Analytics (4)
  "dashboard.view_agent", "dashboard.view_manager", "dashboard.view_admin", "dashboard.export",
  // 16. Notifications (4)
  "notification.view", "notification.send", "notification.manage", "notification.configure",
  // 17. Templates (WhatsApp/SMS) (4)
  "template.view", "template.create", "template.edit", "template.delete",
  // 18. Admin Panel / System Config (2)
  "system.settings_manage", "system.audit_logs_view",
  // 19. Missing Application Permissions (10)
  "users.view", "users.create", "users.edit", "users.delete", "quotations.approve", "settings.manage",
  "policy.view", "policy.create", "policy.edit", "policy.delete"
]

const ROLES = [
  "Super Admin", "Admin", "Manager", "Sales Executive", "Field Executive", "RTO Executive",
  "Claims Executive", "Loan Executive", "CRM Executive", "Accountant", "HR Manager", "Viewer"
]

async function main() {
  console.log('🌱 Starting seed with 106 permissions...')

  // 1. Create all permissions
  const permissionMap: Record<string, any> = {}
  
  for (const name of PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: { name },
      update: {},
      create: {
        id: uuidv4(),
        name,
        description: `Can ${name.split('.')[1]} ${name.split('.')[0]}`
      }
    })
    permissionMap[name] = perm
  }

  const allPermissions = Object.values(permissionMap)

  // ─────────────────────────────────────────────────────────
  // Role Permission Map — fine-grained per job role
  // ─────────────────────────────────────────────────────────
  const ROLE_PERMISSION_MAP: Record<string, string[]> = {
    "Super Admin": PERMISSIONS, // All 106 permissions

    "Admin": PERMISSIONS.filter(p => !p.startsWith("system.")), // All except system config

    "Manager": [
      // Full visibility + management, no delete for sensitive data
      "dashboard.view_agent", "dashboard.view_manager", "dashboard.export",
      "lead.view", "lead.create", "lead.edit", "lead.assign", "lead.import", "lead.export", "lead.change_status",
      "crm.view", "crm.create", "crm.edit", "crm.manage_followups", "crm.view_revenue",
      "quotation.view", "quotation.create", "quotation.edit", "quotation.generate_pdf", "quotation.share",
      "claims.view", "claims.create", "claims.edit", "claims.update_status",
      "loan.view", "loan.create", "loan.edit", "loan.update_status", "loan.track_conversion",
      "rto.view", "rto.create", "rto.edit", "rto.update_status", "rto.track_payment",
      "vahan.view", "vahan.create", "vahan.edit", "vahan.update_status", "vahan.track_payment",
      "fitness.view", "fitness.create", "fitness.edit", "fitness.update_status",
      "visit.view", "visit.create", "visit.edit", "visit.manage_followups",
      "hr.view", "hr.view_performance",
      "accounts.view", "accounts.view_reports", "accounts.export",
      "notification.view", "notification.send",
      "data.view", "data.create", "data.manage_documents",
      "template.view",
      "users.view", "users.create", "users.edit"
    ],

    "Sales Executive": [
      "dashboard.view_agent",
      "lead.view", "lead.create", "lead.edit", "lead.change_status", "lead.assign",
      "quotation.view", "quotation.create", "quotation.edit", "quotation.share", "quotation.generate_pdf",
      "crm.view", "crm.create", "crm.edit", "crm.manage_followups",
      "visit.view", "visit.create", "visit.manage_followups",
      "notification.view",
      "data.view",
    ],



    "Field Executive": [
      "dashboard.view_agent",
      "lead.view", "lead.create", "lead.edit",
      "visit.view", "visit.create", "visit.track_location", "visit.manage_followups",
      "crm.view",
      "notification.view",
    ],

    "RTO Executive": [
      "dashboard.view_agent",
      "rto.view", "rto.create", "rto.edit", "rto.update_status", "rto.track_payment",
      "vahan.view", "vahan.create", "vahan.edit", "vahan.update_status", "vahan.track_payment",
      "lead.view",
      "notification.view",
    ],

    "Claims Executive": [
      "dashboard.view_agent",
      "claims.view", "claims.create", "claims.edit", "claims.update_status", "claims.upload_documents",
      "lead.view",
      "data.manage_documents",
      "notification.view",
    ],

    "Loan Executive": [
      "dashboard.view_agent",
      "loan.view", "loan.create", "loan.edit", "loan.update_status", "loan.track_conversion",
      "lead.view",
      "notification.view",
    ],

    "CRM Executive": [
      "dashboard.view_agent",
      "crm.view", "crm.create", "crm.edit", "crm.manage_followups", "crm.view_revenue",
      "lead.view",
      "visit.view", "visit.create",
      "notification.view",
    ],

    "Accountant": [
      "accounts.view", "accounts.create_entry", "accounts.edit_entry", "accounts.view_reports", "accounts.export",
      "dashboard.view_agent",
      "notification.view",
    ],

    "HR Manager": [
      "dashboard.view_admin", "dashboard.view_manager", "dashboard.view_agent", "dashboard.export",
      "lead.view", "lead.create", "lead.edit", "lead.delete", "lead.assign", "lead.import", "lead.export", "lead.change_status",
      "crm.view", "crm.create", "crm.edit", "crm.delete", "crm.manage_followups", "crm.view_revenue",
      "quotation.view", "quotation.create", "quotation.edit", "quotation.delete", "quotation.generate_pdf", "quotation.share",
      "claims.view", "claims.create", "claims.edit", "claims.delete", "claims.update_status", "claims.upload_documents",
      "loan.view", "loan.create", "loan.edit", "loan.delete", "loan.update_status", "loan.track_conversion",
      "rto.view", "rto.create", "rto.edit", "rto.delete", "rto.update_status", "rto.track_payment",
      "vahan.view", "vahan.create", "vahan.edit", "vahan.delete", "vahan.update_status", "vahan.track_payment",
      "fitness.view", "fitness.create", "fitness.edit", "fitness.delete", "fitness.update_status", "fitness.track_payment",
      "visit.view", "visit.create", "visit.edit", "visit.delete", "visit.track_location", "visit.manage_followups",
      "users.view", "users.create", "users.edit", "users.delete",
      "role.view", "role.create", "role.edit", "role.delete", "role.assign_permissions", "role.manage_users",
      "hr.view", "hr.create", "hr.edit", "hr.delete", "hr.manage_attendance", "hr.manage_leave", "hr.view_performance",
      "accounts.view", "accounts.create_entry", "accounts.edit_entry", "accounts.delete_entry", "accounts.view_reports", "accounts.export", "accounts.manage_salary",
      "data.view", "data.create", "data.edit", "data.delete", "data.approve_changes", "data.manage_documents",
      "template.view", "template.create", "template.edit", "template.delete",
      "notification.view", "notification.send", "notification.manage", "notification.configure",
      "system.settings_manage", "system.audit_logs_view", "quotations.approve", "settings.manage",
      "policy.view", "policy.create", "policy.edit", "policy.delete"
    ],

    "Viewer": [
      "dashboard.view_agent",
      "lead.view", "crm.view", "quotation.view", "claims.view",
      "loan.view", "rto.view", "fitness.view", "vahan.view",
      "notification.view",
    ],
  }

  // 2. Create roles and assign permissions
  for (const roleName of ROLES) {
    const rolePermNames = ROLE_PERMISSION_MAP[roleName] || []
    const rolePermissions = allPermissions.filter(p => rolePermNames.includes(p.name))

    await prisma.role.upsert({
      where: { name: roleName },
      update: {
        permissions: {
          set: rolePermissions.map(p => ({ id: p.id }))
        }
      },
      create: {
        id: uuidv4(),
        name: roleName,
        permissions: {
          connect: rolePermissions.map(p => ({ id: p.id }))
        }
      }
    })
    console.log(`  ✓ ${roleName} (${rolePermissions.length} permissions)`)
  }

  console.log(`\n✅ Seeding complete! Created/Updated ${PERMISSIONS.length} permissions (including Vahan Work) and ${ROLES.length} roles.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
