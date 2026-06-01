const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    include: { role: true }
  })
  
  console.log('--- USERS ---')
  for (const u of users) {
    const leadCount = await prisma.lead.count({
      where: { assignedTo: u.id }
    })
    console.log(`ID: ${u.id} | ${u.fullName} (${u.email}) - Role: ${u.role?.name || 'NONE'} - Assigned Leads: ${leadCount}`)
  }

  const unassigned = await prisma.lead.count({
    where: { assignedTo: null }
  })
  console.log(`Unassigned Leads: ${unassigned}`)

  const totalLeads = await prisma.lead.count()
  console.log(`Total Leads: ${totalLeads}`)
  
  if (totalLeads > 0) {
    console.log('\n--- SAMPLE LEADS (First 5) ---')
    const sampleLeads = await prisma.lead.findMany({
      take: 5,
      include: { assignee: true }
    })
    sampleLeads.forEach(l => {
      console.log(`Lead ID: ${l.id} | Name: ${l.clientName} | Vehicle: ${l.vehicleNo} | AssignedTo: ${l.assignedTo} (${l.assignee?.fullName || 'None'})`)
    })
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
