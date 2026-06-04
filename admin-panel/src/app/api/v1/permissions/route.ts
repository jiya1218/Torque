import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { error } = await validateAuth(req, 'role.view')
  if (error) return error

  try {
    const permissions = await prisma.permission.findMany({
      orderBy: { name: 'asc' }
    })
    return NextResponse.json(permissions)
  } catch (error) {
    console.error('Permissions GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
