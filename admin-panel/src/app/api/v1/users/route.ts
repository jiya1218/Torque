import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { validateAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const isOnboarding = searchParams.get('onboarding') === 'true'

  let { error, context } = await validateAuth(req, 'users.view')
  
  let isMinimized = false
  if (error) {
    if (isOnboarding) {
      // Validate token generally and check if role is administrative
      const altAuth = await validateAuth(req)
      if (!altAuth.error && altAuth.context) {
        const role = altAuth.context.role?.toUpperCase()
        if (role === 'SUPER ADMIN' || role === 'ADMIN' || role === 'HR MANAGER') {
          context = altAuth.context
          error = undefined
          isMinimized = false
        }
      }
    }

    if (error) {
      // If they don't have users.view, check alternative permissions (e.g. leads page needs to list assignees)
      const altAuth = await validateAuth(req, 'lead.view')
      if (altAuth.error) {
        const altAuth2 = await validateAuth(req, 'crm.view')
        if (altAuth2.error) {
          return error // Return the original 403 Forbidden
        }
        context = altAuth2.context
      } else {
        context = altAuth.context
      }
      isMinimized = true
    }
  }

  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = parseInt(searchParams.get('skip') || '0')

    const isManager = context?.role?.toUpperCase() === 'MANAGER'
    const where: any = {}
    
    // If user is a manager, only show their team
    if (isManager) {
      where.managerId = context!.userId
    }

    const queryArgs: any = {
      where,
      take: limit,
      skip: skip,
      orderBy: { fullName: 'asc' }
    }

    if (isMinimized) {
      queryArgs.select = {
        id: true,
        fullName: true,
        role: { select: { id: true, name: true } }
      }
    } else {
      queryArgs.include = {
        role: { select: { id: true, name: true } },
        manager: { select: { id: true, fullName: true } },
        permissions: { select: { id: true, name: true } },
        documents: true
      }
    }

    const users = await prisma.user.findMany(queryArgs)

    let serializedUsers = users
    if (!isMinimized && users.length > 0) {
      const userIds = users.map(u => u.id)
      const allUserDocs = await prisma.document.findMany({
        where: {
          entityType: 'User',
          entityId: { in: userIds }
        }
      })
      serializedUsers = users.map((u: any) => {
        const uClone = { ...u }
        uClone.documents = allUserDocs.filter(d => d.entityId === u.id)
        return uClone
      })
    }

    return NextResponse.json(serializedUsers)
  } catch (error) {
    console.error('Users GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'users.create')
  if (error) return error

  try {
    const body = await req.json()
    const { 
      fullName, email, password, roleId, managerId, extraPermissionIds,
      highestQualification, dateOfBirth, joiningDate, personalMobile, homeMobile
    } = body

    if (!fullName || !email || !password) {
      return NextResponse.json({ error: 'fullName, email, and password are required' }, { status: 400 })
    }

    const isManager = context?.role?.toUpperCase() === 'MANAGER'
    let finalRoleId = roleId
    let finalIsActive = body.isActive !== undefined ? body.isActive : true // Admins create active users by default

    if (isManager) {
      // 1. Managers can ONLY create Executives
      const executiveRole = await prisma.role.findFirst({ where: { name: 'EXECUTIVE' } })
      finalRoleId = executiveRole?.id || roleId
      // 2. Managers create INACTIVE users (Pending Admin Approval)
      finalIsActive = false
    }

    const finalManagerId = isManager ? context.userId : (managerId || null)

    // 1. Create user in Supabase Auth (so they can log in)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // 2. Create/Update user in Prisma DB (using upsert to handle trigger-created rows)
    const user = await prisma.user.upsert({
      where: { id: authData.user.id },
      update: {
        email,
        fullName,
        roleId: finalRoleId || null,
        managerId: finalManagerId,
        isActive: finalIsActive,
        highestQualification,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        personalMobile,
        homeMobile,
        permissions: extraPermissionIds?.length
          ? { connect: extraPermissionIds.map((id: string) => ({ id })) }
          : undefined
      },
      create: {
        id: authData.user.id,
        email,
        fullName,
        roleId: finalRoleId || null,
        managerId: finalManagerId,
        isActive: finalIsActive,
        highestQualification,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        personalMobile,
        homeMobile,
        permissions: extraPermissionIds?.length
          ? { connect: extraPermissionIds.map((id: string) => ({ id })) }
          : undefined
      },
      include: {
        role: { select: { id: true, name: true } },
        manager: { select: { id: true, fullName: true } },
        permissions: { select: { id: true, name: true } }
      }
    })


    return NextResponse.json(user)
  } catch (error: any) {
    console.error('Users POST Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
