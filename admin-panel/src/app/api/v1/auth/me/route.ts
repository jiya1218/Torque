import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  console.log('[auth/me] GET request received');
  const { context, error } = await validateAuth(req, undefined, true)
  if (error) return error

  try {
    const user = await prisma.user.findUnique({
      where: { id: context!.userId },
      include: {
        role: {
          include: {
            permissions: {
              select: { name: true }
            }
          }
        },
        permissions: {
          select: { name: true }
        }
      }
    })
    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
