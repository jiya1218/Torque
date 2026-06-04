import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'quotations.create')
  if (error) return error

  try {
    const body = await req.json()
    const role = context!.role
    const userId = context!.userId

    const quotation = await prisma.quotation.create({
      data: {
        leadId: body.lead_id,
        createdBy: userId,
        amount: body.amount,
        status: role === 'EXECUTIVE' ? 'Approval Pending' : (body.status || 'Draft'),
        details: body.details || {}
      }
    })
    return NextResponse.json(quotation)
  } catch (error) {
    console.error('Quotation POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req, 'quotation.view')
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const leadId = searchParams.get('lead_id')
    
    const where: any = {}
    if (leadId) where.leadId = leadId

    // RBAC: Dynamic filtering based on role
    if (context && context.role === 'EXECUTIVE') {
      where.createdBy = context.userId
    } else if (context && context.role === 'MANAGER') {
      const team = await prisma.user.findMany({
        where: { managerId: context.userId },
        select: { id: true }
      })
      const teamIds = team.map(t => t.id)
      where.createdBy = { in: [context.userId, ...teamIds] }
    }

    const quotations = await prisma.quotation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: { select: { clientName: true } },
        creator: { select: { fullName: true } }
      }
    })

    return NextResponse.json(quotations)
  } catch (error) {
    console.error('Quotations GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

