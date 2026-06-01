const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Finding public.users without corresponding auth.users...')

  // Get all users in public.users who don't exist in auth.users
  const orphanedUsers = await prisma.$queryRawUnsafe(`
    SELECT id, email, "fullName" FROM public.users
    WHERE id NOT IN (SELECT id FROM auth.users)
  `)

  console.log(`Found ${orphanedUsers.length} orphaned users:`)
  console.log(orphanedUsers)

  if (orphanedUsers.length === 0) {
    console.log('No orphaned users to delete.')
    return
  }

  for (const user of orphanedUsers) {
    console.log(`Cleaning up references for user: ${user.fullName} (${user.email})...`)
    try {
      // Clean up relations to avoid foreign key violations
      // 1. Delete notifications
      await prisma.notification.deleteMany({ where: { userId: user.id } })
      // 2. Delete attendance
      await prisma.attendance.deleteMany({ where: { userId: user.id } })
      // 3. Delete salary records
      await prisma.salary.deleteMany({ where: { userId: user.id } })
      // 4. Delete lead assignments
      await prisma.leadAssignment.deleteMany({ where: { userId: user.id } })
      // 5. Delete activity logs
      await prisma.activityLog.deleteMany({ where: { userId: user.id } })
      // 6. Delete WhatsApp logs
      await prisma.leadWhatsAppLog.deleteMany({ where: { userId: user.id } })
      // 7. Delete status histories
      await prisma.leadStatusHistory.deleteMany({ where: { userId: user.id } })
      
      // 8. Delete leave requests / approvals
      await prisma.leaveRequest.deleteMany({ where: { userId: user.id } })
      await prisma.leaveRequest.updateMany({ where: { approvedBy: user.id }, data: { approvedBy: null } })
      
      // 9. Nullify manager references in public.users
      await prisma.user.updateMany({ where: { managerId: user.id }, data: { managerId: null } })
      
      // 10. Nullify assignments on leads, claims, loans, rto, fitness, visits, etc.
      await prisma.lead.updateMany({ where: { assignedTo: user.id }, data: { assignedTo: null } })
      await prisma.claim.updateMany({ where: { assignedTo: user.id }, data: { assignedTo: null } })
      await prisma.loan.updateMany({ where: { assignedTo: user.id }, data: { assignedTo: null } })
      await prisma.rTOWork.updateMany({ where: { assignedTo: user.id }, data: { assignedTo: null } })
      await prisma.fitnessWork.updateMany({ where: { assignedTo: user.id }, data: { assignedTo: null } })
      await prisma.visit.updateMany({ where: { userId: user.id }, data: { userId: null } })
      await prisma.transaction.updateMany({ where: { userId: user.id }, data: { userId: null } })
      await prisma.quotation.updateMany({ where: { createdBy: user.id }, data: { createdBy: null } })

      // Now delete the user
      await prisma.user.delete({ where: { id: user.id } })
      console.log(`✓ Successfully deleted ${user.email}`)
    } catch (err) {
      console.error(`Error deleting user ${user.email}:`, err)
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
