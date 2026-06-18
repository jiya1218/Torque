import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = context.role?.toUpperCase()
  if (role !== 'SUPER ADMIN' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const { companyId, categoryId, percentage, profit, status } = body

    const relation = await prisma.quotationRelationship.findUnique({
      where: { id }
    })

    if (!relation) {
      return NextResponse.json({ error: 'Quotation relationship not found' }, { status: 404 })
    }

    const data: any = {
      updatedBy: context.userId
    }

    if (companyId !== undefined) data.companyId = companyId
    if (categoryId !== undefined) data.categoryId = categoryId
    if (percentage !== undefined) {
      const pct = parseFloat(percentage)
      if (isNaN(pct) || pct < 0 || pct > 100) {
        return NextResponse.json({ error: 'Percentage must be between 0 and 100' }, { status: 400 })
      }
      data.percentage = pct
    }
    if (profit !== undefined) {
      const prof = parseFloat(profit)
      if (isNaN(prof) || prof < 0) {
        return NextResponse.json({ error: 'Profit must be a positive number' }, { status: 400 })
      }
      data.profit = prof
    }
    if (status !== undefined) data.status = parseInt(status)

    // Check duplicate if companyId or categoryId changed
    if ((companyId && companyId !== relation.companyId) || (categoryId && categoryId !== relation.categoryId)) {
      const cmp = companyId || relation.companyId
      const ctg = categoryId || relation.categoryId
      const existing = await prisma.quotationRelationship.findFirst({
        where: {
          id: { not: id },
          companyId: cmp,
          categoryId: ctg,
          status: { in: [1, 2] }
        }
      })
      if (existing) {
        return NextResponse.json({ error: 'Another relationship already exists for this Company and Category' }, { status: 400 })
      }
    }

    const updated = await prisma.quotationRelationship.update({
      where: { id },
      data
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('Relationship PATCH error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = context.role?.toUpperCase()
  if (role !== 'SUPER ADMIN' && role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
  }

  try {
    const { id } = await params

    const relation = await prisma.quotationRelationship.findUnique({
      where: { id }
    })

    if (!relation) {
      return NextResponse.json({ error: 'Quotation relationship not found' }, { status: 404 })
    }

    // Soft delete by setting status to 3
    const deleted = await prisma.quotationRelationship.update({
      where: { id },
      data: {
        status: 3,
        updatedBy: context.userId
      }
    })

    return NextResponse.json({ success: true, deleted })
  } catch (err) {
    console.error('Relationship DELETE error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
