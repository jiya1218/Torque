const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const fs = require('fs')
const path = require('path')

async function main() {
  // Get the user to assign records (prefer rahi.shaikh22@gmail.com)
  let assigneeUser = await prisma.user.findUnique({ where: { email: 'rahi.shaikh22@gmail.com' } })
  if (!assigneeUser) {
    assigneeUser = await prisma.user.findUnique({ where: { email: 'jiya.scalezix@gmail.com' } })
  }
  if (!assigneeUser) {
    assigneeUser = await prisma.user.findFirst()
  }
  if (!assigneeUser) { console.error('No users found in database to assign sample data!'); return }
  const uid = assigneeUser.id

  console.log('Seeding sample data (idempotent)...')

  // 1. CRM / Customers
  const customers = [
    { name: 'Amit Kumar', phone: '9823456781', email: 'amit.kumar@example.com', address: 'Ahmedabad, Gujarat', kycStatus: 'verified', totalRevenue: 125000, policyCount: 3 },
    { name: 'Karan Singh', phone: '9823456782', email: 'karan.singh@example.com', address: 'Mumbai, Maharashtra', kycStatus: 'verified', totalRevenue: 87000, policyCount: 2 },
    { name: 'Meera Iyer', phone: '9823456783', email: 'meera.iyer@example.com', address: 'Chennai, Tamil Nadu', kycStatus: 'pending', totalRevenue: 45000, policyCount: 1 },
    { name: 'Suresh Patel', phone: '9823456784', email: 'suresh.patel@example.com', address: 'Surat, Gujarat', kycStatus: 'verified', totalRevenue: 210000, policyCount: 4 },
    { name: 'Vijay Gupta', phone: '9823456785', email: 'vijay.gupta@example.com', address: 'Delhi, NCR', kycStatus: 'verified', totalRevenue: 95000, policyCount: 2 },
    { name: 'Rohan Das', phone: '9823456786', email: 'rohan.das@example.com', address: 'Kolkata, West Bengal', kycStatus: 'pending', totalRevenue: 32000, policyCount: 1 },
  ]
  for (const c of customers) {
    await prisma.customer.create({ data: c })
  }
  console.log('✓ 6 CRM customers')

  // 2. Leads
  const leads = [
    { clientName: 'Rajesh Sharma', clientPhone: '9876543210', clientEmail: 'rajesh@example.com', status: 'New', assignedTo: uid, vehicleNo: 'GJ-01-AB-1234', city: 'Ahmedabad' },
    { clientName: 'Priya Patel', clientPhone: '9876543211', clientEmail: 'priya@example.com', status: 'Contacted', assignedTo: uid, vehicleNo: 'MH-02-CD-5678', city: 'Mumbai' },
    { clientName: 'Ankit Verma', clientPhone: '9876543212', clientEmail: 'ankit@example.com', status: 'Qualified', assignedTo: uid, vehicleNo: 'DL-03-EF-9012', city: 'Delhi' },
    { clientName: 'Deepa Nair', clientPhone: '9876543213', clientEmail: 'deepa@example.com', status: 'Proposal', assignedTo: uid, vehicleNo: 'KA-04-GH-3456', city: 'Bangalore' },
    { clientName: 'Sanjay Joshi', clientPhone: '9876543214', clientEmail: 'sanjay@example.com', status: 'Won', assignedTo: uid, vehicleNo: 'TN-05-IJ-7890', city: 'Chennai' },
  ]

  // Read demo_leads_40.csv and append to leads
  try {
    const csvPath = path.join(__dirname, '..', 'demo_leads_40.csv')
    if (fs.existsSync(csvPath)) {
      const csvData = fs.readFileSync(csvPath, 'utf-8')
      const lines = csvData.split('\n')
      // Skip header line (index 0)
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        const [ownerName, contactNumber, vehicleNo, expiryDateStr, email] = line.split(',')
        if (ownerName && contactNumber && vehicleNo) {
          let expiryDate = null
          if (expiryDateStr) {
            const [day, month, year] = expiryDateStr.split('/')
            if (day && month && year) {
              expiryDate = new Date(`${year}-${month}-${day}`)
            }
          }
          
          leads.push({
            clientName: ownerName.trim(),
            clientPhone: contactNumber.trim(),
            clientEmail: email ? email.trim() : null,
            status: ['New', 'Contacted', 'Qualified', 'Proposal', 'Won'][i % 5],
            assignedTo: uid,
            vehicleNo: vehicleNo.trim(),
            city: ['Ahmedabad', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai'][i % 5],
            expiryDate: expiryDate
          })
        }
      }
    }
  } catch (err) {
    console.error('Error reading demo_leads_40.csv:', err)
  }

  const createdLeads = []
  for (const l of leads) {
    let lead = await prisma.lead.findFirst({ where: { vehicleNo: l.vehicleNo } })
    if (!lead) {
      lead = await prisma.lead.create({ data: l })
    } else {
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: { assignedTo: uid }
      })
    }
    createdLeads.push(lead)
  }
  console.log(`✓ ${createdLeads.length} Leads`)

  // 3. Claims
  const claims = [
    { customerName: 'Rajesh Sharma', vehicleNumber: 'GJ-01-AB-1234', claimType: 'accident', claimAmount: 45000, status: 'filed', assignedTo: uid, leadId: createdLeads[0].id },
    { customerName: 'Priya Patel', vehicleNumber: 'MH-02-CD-5678', claimType: 'theft', claimAmount: 120000, status: 'under_review', assignedTo: uid, leadId: createdLeads[1].id },
    { customerName: 'Ankit Verma', vehicleNumber: 'DL-03-EF-9012', claimType: 'natural_disaster', claimAmount: 75000, status: 'approved', approvedAmount: 68000, assignedTo: uid, leadId: createdLeads[2].id },
    { customerName: 'Deepa Nair', vehicleNumber: 'KA-04-GH-3456', claimType: 'accident', claimAmount: 32000, status: 'settled', approvedAmount: 30000, assignedTo: uid, leadId: createdLeads[3].id },
  ]
  for (const c of claims) {
    const existing = await prisma.claim.findFirst({ where: { vehicleNumber: c.vehicleNumber, claimType: c.claimType } })
    if (!existing) {
      await prisma.claim.create({ data: c })
    } else {
      await prisma.claim.update({
        where: { id: existing.id },
        data: { assignedTo: uid }
      })
    }
  }
  console.log('✓ 4 Claims')

  // 4. RTO Work
  const rtoItems = [
    { customerName: 'Rajesh Sharma', vehicleNumber: 'GJ-01-AB-1234', workType: 'Transfer', status: 'pending', rtoOffice: 'Ahmedabad RTO', fees: 2500, assignedTo: uid, leadId: createdLeads[0].id },
    { customerName: 'Priya Patel', vehicleNumber: 'MH-02-CD-5678', workType: 'Registration', status: 'in_progress', rtoOffice: 'Mumbai RTO', fees: 5000, assignedTo: uid, leadId: createdLeads[1].id },
    { customerName: 'Ankit Verma', vehicleNumber: 'DL-03-EF-9012', workType: 'NOC', status: 'completed', rtoOffice: 'Delhi RTO', fees: 1500, assignedTo: uid, leadId: createdLeads[2].id },
  ]
  for (const r of rtoItems) {
    const existing = await prisma.rTOWork.findFirst({ where: { vehicleNumber: r.vehicleNumber, workType: r.workType } })
    if (!existing) {
      await prisma.rTOWork.create({ data: r })
    } else {
      await prisma.rTOWork.update({
        where: { id: existing.id },
        data: { assignedTo: uid }
      })
    }
  }
  console.log('✓ 3 RTO tasks')

  // 5. Fitness Work
  const fitnessItems = [
    { customerName: 'Transport Co. A', vehicleNumber: 'GJ-05-YT-2201', status: 'pending', fees: 3500, assignedTo: uid, leadId: createdLeads[0].id },
    { customerName: 'Transport Co. B', vehicleNumber: 'MH-12-XZ-4455', status: 'passed', fees: 4000, assignedTo: uid, leadId: createdLeads[1].id },
    { customerName: 'Transport Co. C', vehicleNumber: 'RJ-07-AB-7890', status: 'failed', fees: 3200, assignedTo: uid, leadId: createdLeads[2].id },
  ]
  for (const f of fitnessItems) {
    const existing = await prisma.fitnessWork.findFirst({ where: { vehicleNumber: f.vehicleNumber } })
    if (!existing) {
      await prisma.fitnessWork.create({ data: f })
    } else {
      await prisma.fitnessWork.update({
        where: { id: existing.id },
        data: { assignedTo: uid }
      })
    }
  }
  console.log('✓ 3 Fitness tasks')

  // 6. Loans
  const loanItems = [
    { customerName: 'Rajesh Sharma', loanType: 'Vehicle', amount: 500000, tenureMonths: 36, interestRate: 8.5, status: 'applied', assignedTo: uid, leadId: createdLeads[0].id },
    { customerName: 'Priya Patel', loanType: 'Personal', amount: 200000, tenureMonths: 24, interestRate: 12.0, status: 'approved', assignedTo: uid, leadId: createdLeads[1].id },
    { customerName: 'Deepa Nair', loanType: 'Vehicle', amount: 800000, tenureMonths: 48, interestRate: 9.0, status: 'disbursed', assignedTo: uid, leadId: createdLeads[3].id },
  ]
  for (const l of loanItems) {
    const existing = await prisma.loan.findFirst({ where: { customerName: l.customerName, loanType: l.loanType, amount: l.amount } })
    if (!existing) {
      await prisma.loan.create({ data: l })
    } else {
      await prisma.loan.update({
        where: { id: existing.id },
        data: { assignedTo: uid }
      })
    }
  }
  console.log('✓ 3 Loans')

  // 7. Finance / Transactions
  const txns = [
    { type: 'income', category: 'Policy Premium', amount: 45000, description: 'Comprehensive policy premium', paymentMethod: 'UPI', status: 'completed', userId: uid },
    { type: 'income', category: 'Policy Premium', amount: 32000, description: 'Third party policy premium', paymentMethod: 'Bank Transfer', status: 'completed', userId: uid },
    { type: 'expense', category: 'Office Rent', amount: 15000, description: 'Monthly office rent', paymentMethod: 'Bank Transfer', status: 'completed', userId: uid },
    { type: 'income', category: 'Commission', amount: 8500, description: 'Agent commission received', paymentMethod: 'UPI', status: 'completed', userId: uid },
    { type: 'expense', category: 'Salary', amount: 25000, description: 'Staff salary payment', paymentMethod: 'Bank Transfer', status: 'completed', userId: uid },
  ]
  for (const t of txns) {
    await prisma.transaction.create({ data: t })
  }
  console.log('✓ 5 Transactions')

  // 8. Visits
  const visitItems = [
    { purpose: 'Policy Renewal Follow-up', scheduledAt: new Date(Date.now() + 86400000), status: 'scheduled', location: 'Ahmedabad, Gujarat', userId: uid, leadId: createdLeads[0].id },
    { purpose: 'Claim Documentation Collection', scheduledAt: new Date(Date.now() - 86400000), status: 'completed', location: 'Mumbai, Maharashtra', userId: uid, leadId: createdLeads[1].id, distanceKm: 12.5 },
    { purpose: 'New Client Meeting', scheduledAt: new Date(), status: 'in_progress', location: 'Delhi, NCR', userId: uid, leadId: createdLeads[2].id },
  ]
  for (const v of visitItems) {
    await prisma.visit.create({ data: v })
  }
  console.log('✓ 3 Visits')

  // 9. Quotations
  const quoteItems = [
    { leadId: createdLeads[0].id, createdBy: uid, amount: 45000, status: 'Draft', details: { customer_name: 'Rajesh Sharma', vehicle_type: 'Car', vehicle_number: 'GJ-01-AB-1234', insurance_type: 'comprehensive' } },
    { leadId: createdLeads[1].id, createdBy: uid, amount: 32000, status: 'Sent', details: { customer_name: 'Priya Patel', vehicle_type: 'Car', vehicle_number: 'MH-02-CD-5678', insurance_type: 'third_party' } },
    { leadId: createdLeads[4].id, createdBy: uid, amount: 67000, status: 'Accepted', details: { customer_name: 'Sanjay Joshi', vehicle_type: 'Truck', vehicle_number: 'TN-05-IJ-7890', insurance_type: 'commercial' } },
  ]
  for (const q of quoteItems) {
    await prisma.quotation.create({ data: q })
  }
  console.log('✓ 3 Quotations')

  console.log('\n✅ All sample data seeded successfully!')
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
