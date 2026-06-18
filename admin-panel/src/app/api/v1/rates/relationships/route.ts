import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { error } = await validateAuth(req)
  if (error) return error

  try {
    const relations = await prisma.quotationRelationship.findMany({
      where: { status: { in: [1, 2] } },
      include: {
        company: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(relations)
  } catch (err) {
    console.error('Relationships GET error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = context.role?.toUpperCase()
  if (role !== 'SUPER ADMIN' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { companyId, categoryId, percentage, profit, status } = body

    if (!companyId || !categoryId || percentage === undefined || profit === undefined) {
      return NextResponse.json({ error: 'companyId, categoryId, percentage, and profit are required' }, { status: 400 })
    }

    const pct = parseFloat(percentage)
    const prof = parseFloat(profit)

    if (isNaN(pct) || pct < 0 || pct > 100) {
      return NextResponse.json({ error: 'Percentage must be between 0 and 100' }, { status: 400 })
    }
    if (isNaN(prof) || prof < 0) {
      return NextResponse.json({ error: 'Profit must be a positive number' }, { status: 400 })
    }

    // Check duplicate
    const existing = await prisma.quotationRelationship.findFirst({
      where: {
        companyId,
        categoryId,
        status: { in: [1, 2] }
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'Quotation relationship already exists for this Company and Category' }, { status: 400 })
    }

    const relation = await prisma.quotationRelationship.create({
      data: {
        companyId,
        categoryId,
        percentage: pct,
        profit: prof,
        status: status !== undefined ? parseInt(status) : 1,
        addedBy: context.userId,
        updatedBy: context.userId
      }
    })

    return NextResponse.json(relation)
  } catch (err) {
    console.error('Relationship POST error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
