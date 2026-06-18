import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { error } = await validateAuth(req)
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId')
    const categoryId = searchParams.get('categoryId')

    if (!companyId || !categoryId) {
      return NextResponse.json({ error: 'companyId and categoryId are required' }, { status: 400 })
    }

    const relation = await prisma.quotationRelationship.findFirst({
      where: {
        companyId,
        categoryId,
        status: 1 // Must be active
      }
    })

    if (relation) {
      return NextResponse.json({
        qtr_percentage: parseFloat(relation.percentage.toString()),
        qtr_profit: parseFloat(relation.profit.toString())
      })
    }

    return NextResponse.json({
      qtr_percentage: 0,
      qtr_profit: 0
    })
  } catch (err) {
    console.error('Relationship lookup GET error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
