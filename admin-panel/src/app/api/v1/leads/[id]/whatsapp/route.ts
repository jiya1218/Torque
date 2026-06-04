import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, context } = await validateAuth(req, 'whatsapp.send')
  if (error) return error
  const { id: leadId } = await params
  const userId = context!.userId

  try {
    const log = await prisma.leadWhatsAppLog.create({
      data: { leadId, userId }
    })

    // Also update lead status to 'Contacted' if it was 'New'
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { status: true }
    })
    
    if (lead && lead.status === 'New') {
      await prisma.lead.update({
        where: { id: leadId },
        data: { status: 'Contacted' }
      })
    }

    return NextResponse.json({ success: true, logId: log.id })
  } catch (error: any) {
    console.error('WhatsApp Log Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
