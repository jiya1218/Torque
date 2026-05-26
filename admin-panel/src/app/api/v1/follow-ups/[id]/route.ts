import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await validateAuth(req)
  if (error) return error

  try {
    const id = params.id
    const body = await req.json().catch(() => ({}))
    const status = body.status || 'completed'

    const updatedFollowup = await prisma.followUp.update({
      where: { id },
      data: {
        status,
        completedAt: status === 'completed' ? new Date() : null,
      },
    })

    return NextResponse.json(updatedFollowup)
  } catch (error: any) {
    console.error('Follow-up PATCH Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
