import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')

    // Check permission: Self or has hr.view / hr.manage_leave
    const isSelf = userId === context.userId
    const hasHRView = context.permissions.some(p => ['hr.view', 'hr.manage_leave'].includes(p))
    if (!isSelf && !hasHRView) {
      return NextResponse.json({ error: 'Forbidden: Missing permission to view leaves' }, { status: 403 })
    }
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (status && status !== 'all') {
      where.status = status
    }
    if (userId) {
      where.userId = userId
    }

    const [leaves, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { fullName: true }
          },
          approver: {
            select: { fullName: true }
          }
        }
      }),
      prisma.leaveRequest.count({ where })
    ])

    return NextResponse.json({ items: leaves, total })
  } catch (error) {
    console.error('Leaves GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()

    // Check permission: Self or has hr.manage_leave
    const isSelf = body.userId === context.userId
    const hasHRManage = context.permissions.includes('hr.manage_leave')
    if (!isSelf && !hasHRManage) {
      return NextResponse.json({ error: 'Forbidden: Missing permission to request leaves for others' }, { status: 403 })
    }

    // Force status to Pending if user does not have hr.manage_leave
    if (!hasHRManage && body.status && body.status.toLowerCase() !== 'pending') {
      body.status = 'Pending'
    }
    const leave = await prisma.leaveRequest.create({
      data: {
        userId: body.userId,
        type: body.type,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        reason: body.reason,
        status: body.status || 'Pending'
      }
    })
    return NextResponse.json(leave)
  } catch (error) {
    console.error('Leaves POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
