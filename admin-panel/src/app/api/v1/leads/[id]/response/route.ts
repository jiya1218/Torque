import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, context } = await validateAuth(req, 'leads.change_status')
  if (error) return error
  const { id: leadId } = await params
  const userId = context!.userId

  try {
    const body = await req.json()
    const { status, notes, followupDate } = body

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    const oldLead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { status: true }
    })

    if (!oldLead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.lead.update({ where: { id: leadId }, data: { status } })

      await tx.leadStatusHistory.create({
        data: {
          leadId,
          userId,
          oldStatus: oldLead.status,
          newStatus: status,
          notes: notes || null
        }
      })

      await tx.call.create({
        data: {
          leadId,
          userId,
          outcome: status,
          notes: notes || null,
          type: 'outbound'
        }
      })

      if (followupDate) {
        await tx.followUp.create({
          data: {
            leadId,
            assignedTo: userId,
            scheduledAt: new Date(followupDate),
            notes: notes || null,
            status: 'pending'
          }
        })
      }
    })

    const nextLead = await prisma.lead.findFirst({
      where: { assignedTo: userId, status: 'New', id: { not: leadId } },
      orderBy: { createdAt: 'asc' },
      select: { id: true }
    })

    return NextResponse.json({ success: true, nextLeadId: nextLead?.id || null })

  } catch (error: any) {
    console.error('Lead Response Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
