import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    
    // Check permission: Self or has hr.view / hr.manage_attendance
    const isSelf = userId === context.userId
    const hasHRView = context.permissions.some(p => ['hr.view', 'hr.manage_attendance'].includes(p))
    if (!isSelf && !hasHRView) {
      return NextResponse.json({ error: 'Forbidden: Missing permission to view attendance' }, { status: 403 })
    }
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (userId) {
      where.userId = userId
    }

    const [attendance, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { date: 'desc' },
        include: {
          user: {
            select: { fullName: true }
          }
        }
      }),
      prisma.attendance.count({ where })
    ])

    return NextResponse.json({ items: attendance, total })
  } catch (error) {
    console.error('Attendance GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    
    // Check permission: Self or has hr.manage_attendance
    const isSelf = body.userId === context.userId
    const hasHRManage = context.permissions.includes('hr.manage_attendance')
    if (!isSelf && !hasHRManage) {
      return NextResponse.json({ error: 'Forbidden: Missing permission to submit attendance' }, { status: 403 })
    }
    const attendance = await prisma.attendance.create({
      data: {
        userId: body.userId,
        date: new Date(body.date),
        status: body.status,
        checkInTime: body.checkInTime ? new Date(body.checkInTime) : null,
        checkOutTime: body.checkOutTime ? new Date(body.checkOutTime) : null,
      }
    })
    return NextResponse.json(attendance)
  } catch (error) {
    console.error('Attendance POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
