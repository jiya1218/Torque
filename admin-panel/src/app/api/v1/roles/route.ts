import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const { error } = await validateAuth(req, 'role.view')
  if (error) return error

  try {
    const roles = await prisma.role.findMany({
      include: {
        _count: {
          select: {
            users: true
          }
        },
        permissions: {
          select: {
            name: true,
            description: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })
    return NextResponse.json(roles)
  } catch (error: any) {
    console.error('GET /api/v1/roles error:', error)
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 })
  }
}
