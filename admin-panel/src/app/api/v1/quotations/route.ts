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

    const finalAmount = body.rate !== undefined ? body.rate : body.amount

    const quotation = await prisma.quotation.create({
      data: {
        leadId: body.lead_id || body.leadId,
        createdBy: userId,
        amount: finalAmount,
        status: role === 'EXECUTIVE' ? 'Approval Pending' : (body.status || 'Draft'),
        details: body.details || {},
        rate: body.rate !== undefined ? body.rate : null,
        benefit: body.benefit !== undefined ? body.benefit : null,
        companyId: body.companyId || null,
        categoryId: body.categoryId || null,
        netPremium: body.netPremium !== undefined ? body.netPremium : null,
        totalPremium: body.totalPremium !== undefined ? body.totalPremium : null,
        percentage: body.percentage !== undefined ? body.percentage : null,
        profit: body.profit !== undefined ? body.profit : null
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
        creator: { select: { fullName: true } },
        company: { select: { name: true } },
        category: { select: { name: true } }
      }
    })

    return NextResponse.json(quotations)
  } catch (error) {
    console.error('Quotations GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

