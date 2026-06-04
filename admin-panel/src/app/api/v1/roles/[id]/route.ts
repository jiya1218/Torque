import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await validateAuth(req, 'role.view')
  if (error) return error

  try {
    const { id } = await params
    const role = await prisma.role.findUnique({
      where: { id },
      include: { permissions: true, _count: { select: { users: true } } }
    })
    if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    return NextResponse.json(role)
  } catch (error) {
    console.error('Role Detail GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await validateAuth(req, 'role.edit')
  if (error) return error

  try {
    const { id } = await params
    const body = await req.json()
    const { permissionIds, name, description } = body

    const role = await prisma.role.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(permissionIds !== undefined && {
          permissions: {
            set: permissionIds.map((pid: string) => ({ id: pid }))
          }
        })
      },
      include: {
        permissions: true,
        _count: { select: { users: true } }
      }
    })

    return NextResponse.json(role)
  } catch (error) {
    console.error('Role Update PATCH Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await validateAuth(req, 'role.delete')
  if (error) return error

  try {
    const { id } = await params

    // Unassign users before deleting
    await prisma.user.updateMany({
      where: { roleId: id },
      data: { roleId: null }
    })

    await prisma.role.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Role DELETE Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
