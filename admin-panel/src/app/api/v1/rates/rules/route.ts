import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { error } = await validateAuth(req, 'rate.view')
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const rateTableId = searchParams.get('rateTableId')

    const where: any = {}
    if (rateTableId) {
      where.rateTableId = rateTableId
    }

    const rules = await prisma.rateRule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(rules)
  } catch (error) {
    console.error('RateRule GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error } = await validateAuth(req, 'rate.edit_rules')
  if (error) return error

  try {
    const body = await req.json()
    const rule = await prisma.rateRule.create({
      data: {
        rateTableId: body.rateTableId,
        condition: body.condition, // JSON object expected
        modifierType: body.modifierType,
        modifierValue: parseFloat(body.modifierValue)
      }
    })
    return NextResponse.json(rule)
  } catch (error) {
    console.error('RateRule POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
