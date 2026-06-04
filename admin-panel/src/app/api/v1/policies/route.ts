import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { error } = await validateAuth(req, 'policy.view')
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    
    const fromParam = searchParams.get('startDate') || searchParams.get('from')
    const toParam = searchParams.get('endDate') || searchParams.get('to')
    
    const where: any = {}
    if (status && status !== 'all') where.status = status

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

    const policies = await prisma.policy.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: { select: { clientName: true, vehicleNo: true } }
      }
    })

    return NextResponse.json(policies)
  } catch (error) {
    console.error('Policies GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error } = await validateAuth(req, 'policy.create')
  if (error) return error

  try {
    const body = await req.json()
    const policy = await prisma.policy.create({
      data: {
        leadId: body.lead_id,
        policyNumber: body.policy_number,
        provider: body.provider,
        type: body.type,
        premiumAmount: body.premium_amount,
        status: body.status || 'Active',
        startDate: new Date(body.start_date),
        endDate: new Date(body.end_date)
      }
    })
    return NextResponse.json(policy)
  } catch (error) {
    console.error('Policy POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
