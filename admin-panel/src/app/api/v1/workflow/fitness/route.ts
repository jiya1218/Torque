import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const { context, error } = await validateAuth(req, 'fitness.view')
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

      const fitness = await prisma.fitnessWork.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { lead: { select: { clientName: true } } }
      })
      return NextResponse.json(fitness)
  } catch (error) {
    console.error('Fitness GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error } = await validateAuth(req, 'fitness.create')
  if (error) return error

  try {
    const data = await req.json()
    const fitness = await prisma.fitnessWork.create({
      data: {
        leadId: data.lead_id,
        assignedTo: data.assigned_to,
        customerName: data.customer_name,
        vehicleNumber: data.vehicle_number,
        status: data.status || 'pending',
        testDate: data.test_date ? new Date(data.test_date) : null,
        fees: data.fees
      }
    })
    return NextResponse.json(fitness)
  } catch (error) {
    console.error('Fitness POST Error:', error)
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
    const isStatusOnly = keys.every(k => k === 'status')
    const requiredPermission = isStatusOnly ? 'fitness.update_status' : 'fitness.edit'

    const hasPermission = context.permissions.includes(requiredPermission) || context.permissions.includes('fitness.edit')
    if (!hasPermission) {
      return NextResponse.json({ error: `Forbidden: Missing ${requiredPermission} permission` }, { status: 403 })
    }

    if (updates.testDate) updates.testDate = new Date(updates.testDate)
    if (updates.expiryDate) updates.expiryDate = new Date(updates.expiryDate)

    const fitness = await prisma.fitnessWork.update({
      where: { id },
      data: updates
    })
    return NextResponse.json(fitness)
  } catch (error) {
    console.error('Fitness PATCH Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
