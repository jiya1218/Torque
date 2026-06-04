import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { error } = await validateAuth(req, 'crm.view')
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    
    const where: any = {}
    if (status && status !== 'all') {
      where.status = status
    }

    const followUps = await prisma.followUp.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      include: {
        lead: { select: { clientName: true } }
      }
    })

    return NextResponse.json(followUps)
  } catch (error) {
    console.error('Follow-ups GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error } = await validateAuth(req, 'crm.manage_followups')
  if (error) return error

  try {
    const body = await req.json()
    const followUp = await prisma.followUp.create({
      data: {
        leadId: body.lead_id,
        assignedTo: body.assigned_to,
        leadName: body.lead_name,
        type: body.type || 'call',
        scheduledAt: new Date(body.scheduled_at),
        notes: body.notes,
        status: 'pending'
      }
    })
    return NextResponse.json(followUp)
  } catch (error) {
    console.error('Follow-up POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
