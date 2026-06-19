import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'leads.view')
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const importName = searchParams.get('importName')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const fromParam = searchParams.get('startDate') || searchParams.get('from')
    const toParam = searchParams.get('endDate') || searchParams.get('to')
    
    const where: any = {}
    if (importName) {
      where.importName = importName
    }
    
    if (fromParam || toParam) {
      where.createdAt = {}
      if (fromParam) {
        const d = new Date(fromParam)
        d.setHours(0, 0, 0, 0)
        if (!isNaN(d.getTime())) where.createdAt.gte = d
      }
      if (toParam) {
        const d = new Date(toParam)
        d.setHours(23, 59, 59, 999)
        if (!isNaN(d.getTime())) where.createdAt.lte = d
      }
    }

    // RBAC: Dynamic filtering based on role
    const roleUpper = context?.role?.toUpperCase() || ''
    const isExecutive = roleUpper.endsWith('EXECUTIVE') || roleUpper === 'VIEWER'
    
    if (isExecutive) {
      where.assignedTo = context!.userId
    } else if (roleUpper === 'MANAGER') {
      const team = await prisma.user.findMany({
        where: { managerId: context!.userId },
        select: { id: true }
      })
      const teamIds = team.map(t => t.id)
      // Manager sees their own leads + team leads
      where.assignedTo = { in: [context!.userId, ...teamIds] }
    }
    // Admin / Super Admin sees everything (no assignedTo filter)


    if (status && status !== 'all') {
      where.status = status
    }
    if (search) {
      const searchFilter = [
        { clientName: { contains: search, mode: 'insensitive' } },
        { clientPhone: { contains: search, mode: 'insensitive' } },
        { vehicleNo: { contains: search, mode: 'insensitive' } }
      ]
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchFilter }]
        delete where.OR
      } else {
        where.OR = searchFilter
      }
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          assignee: {
            select: { fullName: true }
          }
        }
      }),
      prisma.lead.count({ where })
    ])

    return NextResponse.json({
      leads,
      pagination: {
        total,
        limit,
        offset
      }
    })
  } catch (error) {
    console.error('Leads GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'leads.create')
  if (error) return error

  try {
    const body = await req.json()
    const roleUpper = context?.role?.toUpperCase() || ''
    const isExecutive = roleUpper.includes('EXECUTIVE') || roleUpper === 'VIEWER'

    let status = body.status || 'New'
    let assignedTo = body.assignedTo || body.assigned_to

    if (isExecutive) {
      status = 'Pending'
      assignedTo = null // only admin will assign the lead
    }

    const lead = await prisma.lead.create({
      data: {
        clientName: body.clientName || body.client_name,
        clientEmail: body.clientEmail || body.client_email,
        clientPhone: (body.clientPhone || body.client_phone) ? String(body.clientPhone || body.client_phone) : undefined,
        vehicleNo: body.vehicleNo || body.vehicle_no,
        gvw: body.gvw !== undefined ? String(body.gvw) : undefined,
        status,
        assignedTo
      }
    })
    return NextResponse.json(lead)
  } catch (error: any) {
    console.error('Lead POST Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
