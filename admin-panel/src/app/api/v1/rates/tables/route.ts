import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { error } = await validateAuth(req, 'rate.view')
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const provider = searchParams.get('provider')
    const vehicleType = searchParams.get('vehicleType')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (provider) {
      where.provider = { contains: provider, mode: 'insensitive' }
    }
    if (vehicleType) {
      where.vehicleType = { contains: vehicleType, mode: 'insensitive' }
    }

    const [tables, total] = await Promise.all([
      prisma.rateTable.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        include: {
          rules: true
        }
      }),
      prisma.rateTable.count({ where })
    ])

    return NextResponse.json({ items: tables, total })
  } catch (error) {
    console.error('RateTable GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error } = await validateAuth(req, 'rate.configure_tables')
  if (error) return error

  try {
    const body = await req.json()
    const table = await prisma.rateTable.create({
      data: {
        provider: body.provider,
        vehicleType: body.vehicleType,
        basePremium: parseFloat(body.basePremium),
        isActive: body.isActive !== undefined ? body.isActive : true
      }
    })
    return NextResponse.json(table)
  } catch (error) {
    console.error('RateTable POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
