import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
    const { context, error } = await validateAuth(req, 'loan.view')
    if (error) return error

    try {
      const { searchParams } = new URL(req.url)
      const status = searchParams.get('status')
      
      const where: any = {}

      // RBAC: Dynamic filtering based on role
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

      if (status && status !== 'all') where.status = status

      const loans = await prisma.loan.findMany({
        where,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: { select: { clientName: true } },
        assignee: { select: { fullName: true } }
      }
    })

    return NextResponse.json(loans)
  } catch (error) {
    console.error('Loans GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error } = await validateAuth(req, 'loan.create')
  if (error) return error

  try {
    const body = await req.json()
    const loan = await prisma.loan.create({
      data: {
        leadId: body.leadId || body.lead_id,
        assignedTo: body.assignedTo || body.assigned_to,
        customerName: body.customerName || body.customer_name,
        loanType: body.loanType || body.loan_type,
        amount: body.amount,
        tenureMonths: body.tenureMonths || body.tenure_months,
        interestRate: body.interestRate || body.interest_rate,
        status: body.status || 'applied',
        conversionStatus: body.conversionStatus || 'Applied',
        bankName: body.bankName || body.bank_name
      }
    })
    return NextResponse.json(loan)
  } catch (error) {
    console.error('Loan POST Error:', error)
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
    const isStatusUpdate = keys.every(k => k === 'status')
    const isConversionUpdate = keys.every(k => k === 'conversionStatus')

    let requiredPermission = 'loan.edit'
    if (isStatusUpdate) {
      requiredPermission = 'loan.update_status'
    } else if (isConversionUpdate) {
      requiredPermission = 'loan.track_conversion'
    }

    const hasPermission = context.permissions.includes(requiredPermission) || context.permissions.includes('loan.edit')
    if (!hasPermission) {
      return NextResponse.json({ error: `Forbidden: Missing ${requiredPermission} permission` }, { status: 403 })
    }

    if (updates.disbursementDate) updates.disbursementDate = new Date(updates.disbursementDate)

    const loan = await prisma.loan.update({
      where: { id },
      data: updates
    })
    return NextResponse.json(loan)
  } catch (error) {
    console.error('Loan PATCH Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
