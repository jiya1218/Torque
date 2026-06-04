import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    const managers = await prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          OR: [
            { name: { contains: 'manager', mode: 'insensitive' } },
            { name: { contains: 'hr', mode: 'insensitive' } },
          ],
          NOT: [
            { name: { contains: 'admin', mode: 'insensitive' } },
            { name: { contains: 'super', mode: 'insensitive' } }
          ]
        }
      },
      select: {
        id: true,
        fullName: true,
        role: {
          select: { name: true }
        }
      },
      orderBy: {
        fullName: 'asc'
      }
    })

    return NextResponse.json({ roles, managers })
  } catch (error: any) {
    console.error('[signup-metadata] GET Error:', error)
    return NextResponse.json({ error: 'Failed to fetch signup metadata' }, { status: 500 })
  }
}
