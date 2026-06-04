import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  // Public endpoint for new employee registration

  try {
    const body = await req.json()
    const { 
      fullName, email, password, roleId,
      highestQualification, dateOfBirth, joiningDate, personalMobile, homeMobile,
      documents // Array of { type: string, url: string }
    } = body

    if (!fullName || !email || !password) {
      return NextResponse.json({ error: 'fullName, email, and password are required' }, { status: 400 })
    }

    // 1. Create user in Supabase Auth
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
        roleId: roleId || null,
        isActive: false, // Wait for admin approval
        highestQualification,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        personalMobile,
        homeMobile,
        documents: documents?.length ? {
          create: documents.map((doc: any) => ({
            entityType: 'User',
            entityId: authData.user.id,
            fileName: doc.type,
            filePath: doc.url,
            uploadedBy: authData.user.id
          }))
        } : undefined
      },
      create: {
        id: authData.user.id,
        email,
        fullName,
        roleId: roleId || null,
        isActive: false, // Wait for admin approval
        highestQualification,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        personalMobile,
        homeMobile,
        documents: documents?.length ? {
          create: documents.map((doc: any) => ({
            entityType: 'User',
            entityId: authData.user.id,
            fileName: doc.type,
            filePath: doc.url,
            uploadedBy: authData.user.id
          }))
        } : undefined
      }
    })

    return NextResponse.json({
      message: 'Onboarding application submitted. Please wait for admin approval.',
      userId: user.id
    })
  } catch (error: any) {
    console.error('Onboarding POST Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
