import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, context } = await validateAuth(req, 'leads.view')
  if (error) return error
  const { id: leadId } = await params
  const userId = context!.userId

  try {
    const body = await req.json()
    const { text } = body

    if (!text) {
      return NextResponse.json({ error: 'Suggestion text is required' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { status: true }
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Save as status history timeline item
    const history = await prisma.leadStatusHistory.create({
      data: {
        leadId,
        userId,
        oldStatus: lead.status,
        newStatus: 'Suggestion',
        notes: text
      }
    })

    return NextResponse.json({ success: true, history })
  } catch (error: any) {
    console.error('Lead Suggestion Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
