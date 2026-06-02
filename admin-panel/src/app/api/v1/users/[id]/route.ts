import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        role: { include: { permissions: true } },
        permissions: true,
        documents: true
      }
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    return NextResponse.json(user)
  } catch (error) {
    console.error('User GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json()
    const { roleId, managerId, isActive, extraPermissionIds } = body

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(body.fullName !== undefined && { fullName: body.fullName }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.personalMobile !== undefined && { personalMobile: body.personalMobile }),
        ...(roleId !== undefined && { roleId: roleId || null }),
        ...(managerId !== undefined && { managerId: managerId || null }),
        ...(isActive !== undefined && { isActive }),
        ...(isActive === true && { onboardingUpdated: false }),
        ...(body.onboardingRemark !== undefined && { onboardingRemark: body.onboardingRemark, onboardingUpdated: false }),
        ...(body.restore === true && { deletedAt: null, isActive: true }),
        ...(extraPermissionIds !== undefined && {
          permissions: {
            set: extraPermissionIds.map((id: string) => ({ id }))
          }
        })
      },
      include: {
        role: { select: { id: true, name: true } },
        manager: { select: { id: true, fullName: true } },
        permissions: { select: { id: true, name: true } }
      }
    })


    return NextResponse.json(user)
  } catch (error) {
    console.error('User PATCH Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url)
    const permanent = searchParams.get('permanent') === 'true'

    if (permanent) {
      // 1. Delete from Supabase Auth first
      await supabaseAdmin.auth.admin.deleteUser(id)
      // 2. Delete from Prisma DB
      await prisma.user.delete({ where: { id } })
    } else {
      // Soft delete: Just set deletedAt
      await prisma.user.update({
        where: { id },
        data: { deletedAt: new Date(), isActive: false }
      })
    }

    return NextResponse.json({ success: true, permanent })
  } catch (error) {
    console.error('User DELETE Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
