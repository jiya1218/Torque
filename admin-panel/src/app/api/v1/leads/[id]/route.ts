import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await validateAuth(req, 'lead.view')
  if (authError) return authError

  try {
    const { id } = await params
    
    // Validate UUID format to prevent Prisma/DB crash
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json({ error: 'Invalid Lead ID format' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        assignee: { select: { fullName: true } },
        policies: true,
        quotations: true,
        claims: true,
        calls: { orderBy: { createdAt: 'desc' } },
        statusHistories: { orderBy: { changedAt: 'desc' } },
        followUps: { orderBy: { scheduledAt: 'asc' } }
      }
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json(lead)
  } catch (error: any) {
    console.error('Lead Detail GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await validateAuth(req, 'lead.edit')
  if (authError) return authError

  try {
    const { id } = await params
    const body = await req.json()
    
    const data: any = {}
    
    if (body.clientName !== undefined || body.client_name !== undefined) {
      data.clientName = body.clientName !== undefined ? body.clientName : body.client_name
    }
    if (body.clientEmail !== undefined || body.client_email !== undefined) {
      data.clientEmail = body.clientEmail !== undefined ? body.clientEmail : body.client_email
    }
    if (body.clientPhone !== undefined || body.client_phone !== undefined) {
      data.clientPhone = body.clientPhone !== undefined ? String(body.clientPhone) : String(body.client_phone)
    }
    if (body.status !== undefined) {
      data.status = body.status
    }
    if (body.assignedTo !== undefined || body.assigned_to !== undefined) {
      data.assignedTo = body.assignedTo !== undefined ? body.assignedTo : body.assigned_to
    }
    if (body.vehicleNo !== undefined || body.vehicle_no !== undefined) {
      data.vehicleNo = body.vehicleNo !== undefined ? body.vehicleNo : body.vehicle_no
    }
    if (body.registrationDate !== undefined || body.registration_date !== undefined) {
      const val = body.registrationDate !== undefined ? body.registrationDate : body.registration_date
      data.registrationDate = val ? new Date(val) : null
    }
    if (body.expiryDate !== undefined || body.expiry_date !== undefined) {
      const val = body.expiryDate !== undefined ? body.expiryDate : body.expiry_date
      data.expiryDate = val ? new Date(val) : null
    }
    if (body.gvw !== undefined) {
      data.gvw = body.gvw ? String(body.gvw) : null
    }
    if (body.existingAgent !== undefined || body.existing_agent !== undefined) {
      data.existingAgent = body.existingAgent !== undefined ? body.existingAgent : body.existing_agent
    }
    if (body.city !== undefined) {
      data.city = body.city
    }
    if (body.address !== undefined) {
      data.address = body.address
    }
    
    const lead = await prisma.lead.update({
      where: { id },
      data
    })
    
    return NextResponse.json(lead)
  } catch (error) {
    console.error('Lead Detail PUT Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
