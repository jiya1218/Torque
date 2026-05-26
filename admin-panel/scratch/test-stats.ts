import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Running leads/stats Prisma query...')
    const [
      totalLeads,
      assignedLeads,
      unassignedLeads,
      convertedLeads,
      pendingFollowups,
      notInterestedLeads,
      employeeStats
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { assignedTo: { not: null } } }),
      prisma.lead.count({ where: { assignedTo: null } }),
      prisma.lead.count({ where: { status: 'Converted' } }),
      prisma.lead.count({ where: { status: 'Follow-up' } }),
      prisma.lead.count({ where: { status: 'Not Interested' } }),
      prisma.user.findMany({
        where: {
          role: {
            name: { notIn: ['ADMIN'] }
          }
        },
        select: {
          id: true,
          fullName: true,
          _count: {
            select: {
              assignedLeads: true,
              calls: true,
            }
          },
          assignedLeads: {
            select: {
              status: true
            }
          }
        }
      })
    ])

    console.log('Query successful!')
    console.log('Total Leads:', totalLeads)
    console.log('Employee Stats Count:', employeeStats.length)
  } catch (error: any) {
    console.error('Prisma query failed with error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
