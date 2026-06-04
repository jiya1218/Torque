import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error) return error

  // User must have crm.create, crm.manage_followups, leads.edit, or lead.edit
  const hasPermission = context!.permissions.some(p => 
    ['crm.create', 'crm.manage_followups', 'leads.edit', 'lead.edit'].includes(p)
  )
  if (!hasPermission) {
    return NextResponse.json({ error: 'Forbidden: Missing permission to log calls' }, { status: 403 })
  }

  try {
    const body = await req.json()
    
    // Create the call log
    const call = await prisma.call.create({
      data: {
        leadId: body.lead_id,
        userId: body.user_id,
        type: body.type || 'outbound',
        outcome: body.outcome,
        duration: body.duration,
        notes: body.notes
      }
    })

    // Business Logic: Auto-update lead status to 'Contacted' if it was 'New'
    const lead = await prisma.lead.findUnique({ where: { id: body.lead_id } })
    if (lead && lead.status === 'New') {
      await prisma.lead.update({
        where: { id: body.lead_id },
        data: { status: 'Contacted' }
      })
    }

    // Business Logic: Log activity
    await prisma.activityLog.create({
      data: {
        userId: body.user_id,
        action: 'logged_call',
        entityType: 'lead',
        entityId: body.lead_id,
        metadata: { outcome: body.outcome }
      }
    })

    return NextResponse.json(call)
  } catch (error) {
    console.error('Call POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { error } = await validateAuth(req, 'crm.view')
  if (error) return error

  try {
    const calls = await prisma.call.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        lead: { select: { clientName: true } },
        user: { select: { fullName: true } }
      }
    })
    return NextResponse.json(calls)
  } catch (error) {
    console.error('Calls GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
