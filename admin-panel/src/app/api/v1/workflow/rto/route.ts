import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
    const { context, error } = await validateAuth(req, 'rto.view')
    if (error) return error

    try {
      const where: any = {}
      
      if (context && context.role === 'EXECUTIVE') {
        where.assignedTo = context.userId
      } else if (context && context.role === 'MANAGER') {
        const team = await prisma.user.findMany({
          where: { managerId: context.userId },
          select: { id: true }
        })
        const teamIds = team.map(t => t.id)
        where.assignedTo = { in: [context.userId, ...teamIds] }
      }

      const rto = await prisma.rTOWork.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { 
          lead: { select: { clientName: true } },
          assignee: { select: { fullName: true } }
        }
      })
      return NextResponse.json(rto)
  } catch (error) {
    console.error('RTO GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error } = await validateAuth(req, 'rto.create')
  if (error) return error

  try {
    const data = await req.json()
    const rto = await prisma.rTOWork.create({
      data: {
        leadId: data.leadId || data.lead_id,
        assignedTo: data.assignedTo || data.assigned_to,
        customerName: data.customerName || data.customer_name,
        vehicleNumber: data.vehicleNumber || data.vehicle_number,
        workType: data.workType || data.work_type,
        status: data.status || 'pending',
        rtoOffice: data.rtoOffice || data.rto_office,
        fees: data.fees,
        paymentStatus: data.paymentStatus || 'Pending',
        paymentAmount: data.paymentAmount,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null
      }
    })
    return NextResponse.json(rto)
  } catch (error) {
    console.error('RTO POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await req.json()
    const { id, ...updates } = data

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    const keys = Object.keys(updates)
    const isPaymentUpdate = keys.some(k => ['paymentStatus', 'paymentAmount', 'paymentDate'].includes(k))
    const isStatusUpdate = keys.every(k => k === 'status')

    let requiredPermission = 'rto.edit'
    if (isPaymentUpdate) {
      requiredPermission = 'rto.track_payment'
    } else if (isStatusUpdate) {
      requiredPermission = 'rto.update_status'
    }

    const hasPermission = context.permissions.includes(requiredPermission) || context.permissions.includes('rto.edit')
    if (!hasPermission) {
      return NextResponse.json({ error: `Forbidden: Missing ${requiredPermission} permission` }, { status: 403 })
    }

    if (updates.dueDate) updates.dueDate = new Date(updates.dueDate)
    if (updates.paymentDate) updates.paymentDate = new Date(updates.paymentDate)
    if (updates.completionDate) updates.completionDate = new Date(updates.completionDate)

    const rto = await prisma.rTOWork.update({
      where: { id },
      data: updates
    })
    return NextResponse.json(rto)
  } catch (error) {
    console.error('RTO PATCH Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
