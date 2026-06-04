import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { error } = await validateAuth(req, 'data.view')
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')

    const where: any = {}
    if (entityType) where.entityType = entityType
    if (entityId) where.entityId = entityId

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { fullName: true }
        }
      }
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error('Documents GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
