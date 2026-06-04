import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { error } = await validateAuth(req, 'rate.view')
  if (error) return error

  try {
    const addons = await prisma.addon.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(addons)
  } catch (error) {
    console.error('Addon GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error } = await validateAuth(req, 'rate.manage_addons')
  if (error) return error

  try {
    const body = await req.json()
    const addon = await prisma.addon.create({
      data: {
        name: body.name,
        description: body.description,
        priceType: body.priceType, // "percentage" or "flat"
        priceValue: parseFloat(body.priceValue),
        isActive: body.isActive !== undefined ? body.isActive : true
      }
    })
    return NextResponse.json(addon)
  } catch (error) {
    console.error('Addon POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
