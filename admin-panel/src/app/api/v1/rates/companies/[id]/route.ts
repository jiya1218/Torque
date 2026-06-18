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
    const { name, status } = body

    const company = await prisma.companyDetail.findUnique({
      where: { id }
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const updated = await prisma.companyDetail.update({
      where: { id },
      data: {
        ...(name !== undefined && typeof name === 'string' && name.trim() && { name: name.trim() }),
        ...(status !== undefined && typeof status === 'number' && { status })
      }
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('Company PATCH error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
