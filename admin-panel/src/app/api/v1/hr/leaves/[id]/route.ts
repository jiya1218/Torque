import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { context, error } = await validateAuth(req, 'hr.manage_leave')
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const body = await req.json()
    
    const isApproved = body.status === 'Approved' || body.status === 'Rejected'
    
    const leave = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: body.status,
        approvedBy: isApproved ? context.userId : null,
        approvedAt: isApproved ? new Date() : null
      }
    })
    
    return NextResponse.json(leave)
  } catch (error) {
    console.error('Leaves PUT Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
