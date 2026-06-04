import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    // Check permission: Self or has accounts.manage_salary / hr.view / accounts.view
    const isSelf = userId === context.userId
    const hasSalaryView = context.permissions.some(p => 
      ['accounts.manage_salary', 'hr.view', 'accounts.view'].includes(p)
    )
    if (!isSelf && !hasSalaryView) {
      return NextResponse.json({ error: 'Forbidden: Missing permission to view salary details' }, { status: 403 })
    }
    const month = searchParams.get('month')
    const year = searchParams.get('year')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (userId) {
      where.userId = userId
    }
    if (month) {
      where.month = parseFloat(month)
    }
    if (year) {
      where.year = parseFloat(year)
    }

    const [salaries, total] = await Promise.all([
      prisma.salary.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { fullName: true }
          }
        }
      }),
      prisma.salary.count({ where })
    ])

    return NextResponse.json({ items: salaries, total })
  } catch (error) {
    console.error('Salary GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error } = await validateAuth(req, 'accounts.manage_salary')
  if (error) return error

  try {
    const body = await req.json()
    const salary = await prisma.salary.create({
      data: {
        userId: body.userId,
        month: parseFloat(body.month),
        year: parseFloat(body.year),
        baseAmount: parseFloat(body.baseAmount),
        deductions: parseFloat(body.deductions || 0),
        netAmount: parseFloat(body.netAmount),
        status: body.status || 'Pending'
      }
    })
    return NextResponse.json(salary)
  } catch (error) {
    console.error('Salary POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
