import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { error } = await validateAuth(req, 'accounts.view')
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const category = searchParams.get('category')
    
    // Date parsing logic for strict filtering
    const parseDate = (dateStr: string | null, isEnd: boolean) => {
      if (!dateStr) return null
      let d = new Date(dateStr)
      if (isNaN(d.getTime())) return null
      if (isEnd) d.setHours(23, 59, 59, 999)
      else d.setHours(0, 0, 0, 0)
      return d
    }

    const startDate = searchParams.get('startDate') || searchParams.get('from')
    const endDate = searchParams.get('endDate') || searchParams.get('to')
    const from = parseDate(startDate, false)
    const to = parseDate(endDate, true)

    const where: any = {}
    if (type && type !== 'all') where.type = type
    if (category) where.category = category
    if (from || to) {
      where.date = {}
      if (from) where.date.gte = from
      if (to) where.date.lte = to
    }

    const [transactions, summary] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        take: 50,
        include: {
          user: { select: { fullName: true } },
          policy: { select: { policyNumber: true } }
        }
      }),
      prisma.transaction.groupBy({
        by: ['type'],
        _sum: { amount: true },
        where
      })
    ])

    // Format summary for the UI
    const summaryMap = summary.reduce((acc: any, curr) => {
      acc[curr.type] = curr._sum.amount
      return acc
    }, {})

    return NextResponse.json({
      items: transactions,
      summary: summaryMap
    })
  } catch (error) {
    console.error('Transactions GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error } = await validateAuth(req, 'accounts.create_entry')
  if (error) return error

  try {
    const body = await req.json()
    const transaction = await prisma.transaction.create({
      data: {
        userId: body.user_id,
        leadId: body.lead_id,
        policyId: body.policy_id,
        type: body.type,
        category: body.category,
        amount: body.amount,
        status: body.status || 'completed',
        paymentMethod: body.payment_method,
        referenceNumber: body.reference_number,
        description: body.description,
        date: body.date ? new Date(body.date) : new Date()
      }
    })
    return NextResponse.json(transaction)
  } catch (error) {
    console.error('Transaction POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
