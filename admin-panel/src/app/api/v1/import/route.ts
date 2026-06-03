import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error) return error

  try {
    const body = await req.json()
    const { leads } = body

    if (!leads || !Array.isArray(leads)) {
      return NextResponse.json({ error: 'leads array is required' }, { status: 400 })
    }

    let importedCount = 0
    let updatedCount = 0

    // Process leads sequentially to ensure unique checks
    for (const item of leads) {
      const {
        clientName, clientPhone, clientEmail, vehicleNo,
        expiryDate, registrationDate, gvw, address, city
      } = item

      const clientNameStr = clientName ? String(clientName).trim() : ''
      if (!clientNameStr) continue // Name is required in schema

      const clientPhoneStr = clientPhone ? String(clientPhone).trim() : null
      const clientEmailStr = clientEmail ? String(clientEmail).trim() : null
      const vehicleNoStr = vehicleNo ? String(vehicleNo).trim() : null
      const gvwStr = gvw ? String(gvw).trim() : null
      const addressStr = address ? String(address).trim() : null
      const cityStr = city ? String(city).trim() : null

      const parsedExpiry = expiryDate ? new Date(expiryDate) : null
      const parsedRegDate = registrationDate ? new Date(registrationDate) : null

      // Check if a Lead already exists with the same vehicle registration number or client phone
      let existingLead = null

      if (vehicleNoStr) {
        existingLead = await prisma.lead.findFirst({
          where: { vehicleNo: { equals: vehicleNoStr, mode: 'insensitive' } }
        })
      }

      if (!existingLead && clientPhoneStr) {
        existingLead = await prisma.lead.findFirst({
          where: { clientPhone: { equals: clientPhoneStr } }
        })
      }

      if (existingLead) {
        // Update existing lead
        await prisma.lead.update({
          where: { id: existingLead.id },
          data: {
            clientName: clientNameStr,
            clientEmail: clientEmailStr || existingLead.clientEmail,
            clientPhone: clientPhoneStr || existingLead.clientPhone,
            vehicleNo: vehicleNoStr || existingLead.vehicleNo,
            expiryDate: parsedExpiry || existingLead.expiryDate,
            registrationDate: parsedRegDate || existingLead.registrationDate,
            gvw: gvwStr || existingLead.gvw,
            address: addressStr || existingLead.address,
            city: cityStr || existingLead.city,
            updatedAt: new Date()
          }
        })
        updatedCount++
      } else {
        // Create new lead
        await prisma.lead.create({
          data: {
            clientName: clientNameStr,
            clientPhone: clientPhoneStr,
            clientEmail: clientEmailStr,
            vehicleNo: vehicleNoStr,
            expiryDate: parsedExpiry,
            registrationDate: parsedRegDate,
            gvw: gvwStr,
            address: addressStr,
            city: cityStr,
            status: 'New'
          }
        })
        importedCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${leads.length} leads.`,
      importedCount,
      updatedCount
    })
  } catch (err: any) {
    console.error('Lead Import POST Error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
