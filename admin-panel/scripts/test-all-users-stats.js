const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testUser(userId, roleName, permissions) {
  try {
    const roleUpper = roleName ? roleName.toUpperCase() : ''
    const effectiveView = permissions.includes('dashboard.view_admin') ? 'admin'
        : permissions.includes('dashboard.view_manager') ? 'manager'
        : 'agent'

    const now = new Date()
    const today = new Date(now.getTime() + (5.5 * 60 * 60 * 1000))
    today.setUTCHours(0, 0, 0, 0)
    const istMidnightInUtc = new Date(today.getTime() - (5.5 * 60 * 60 * 1000))
    const dateFilter = undefined
    const todayFilter = { gte: istMidnightInUtc }

    if (effectiveView === 'agent') {
      const [myLeads, myLeadsToday, myFollowupsPending, myCallsToday, myQuotations] = await Promise.all([
        prisma.lead.count({ where: { assignedTo: userId, createdAt: dateFilter } }),
        prisma.lead.count({ where: { assignedTo: userId, createdAt: todayFilter } }),
        prisma.followUp.count({ where: { assignedTo: userId, status: 'pending' } }),
        prisma.call.count({ where: { userId, createdAt: dateFilter || todayFilter } }),
        prisma.quotation.count({ where: { createdBy: userId, createdAt: dateFilter } })
      ])
      console.log(`User ${userId} (${roleName}) [Agent view] stats calculated successfully!`)
    } else if (effectiveView === 'manager') {
      const team = await prisma.user.findMany({
        where: { managerId: userId },
        select: { id: true }
      })
      const teamIds = team.map(t => t.id)
      const [totalLeads, activeLeads, wonLeads, lostLeads] = await Promise.all([
        prisma.lead.count({ where: { assignedTo: { in: teamIds }, createdAt: dateFilter } }),
        prisma.lead.count({ where: { assignedTo: { in: teamIds }, status: { in: ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation'] }, createdAt: dateFilter } }),
        prisma.lead.count({ where: { assignedTo: { in: teamIds }, status: 'Won', createdAt: dateFilter } }),
        prisma.lead.count({ where: { assignedTo: { in: teamIds }, status: 'Lost', createdAt: dateFilter } }),
      ])
      console.log(`User ${userId} (${roleName}) [Manager view] stats calculated successfully!`)
    } else {
      const [totalLeads, newLeadsToday, totalPolicies, activePolicies, totalQuotations] = await Promise.all([
        prisma.lead.count({ where: { createdAt: dateFilter } }),
        prisma.lead.count({ where: { createdAt: todayFilter } }),
        prisma.policy.count({ where: { createdAt: dateFilter } }),
        prisma.policy.count({ where: { status: 'Active', createdAt: dateFilter } }),
        prisma.quotation.count({ where: { createdAt: dateFilter } }),
      ])
      console.log(`User ${userId} (${roleName}) [Admin view] stats calculated successfully!`)
    }
  } catch (err) {
    console.error(`FAILED for user ${userId} (${roleName}):`, err)
  }
}

async function main() {
  const users = await prisma.user.findMany({
    include: {
      role: {
        include: { permissions: true }
      },
      permissions: true
    }
  })
  
  for (const user of users) {
    const rolePermNames = user.role?.permissions.map(p => p.name) || []
    const extraPermNames = user.permissions.map(p => p.name) || []
    const permissions = Array.from(new Set([...rolePermNames, ...extraPermNames]))
    await testUser(user.id, user.role?.name || 'No Role', permissions)
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
