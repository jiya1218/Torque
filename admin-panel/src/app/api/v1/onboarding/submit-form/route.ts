import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { context, error } = await validateAuth(req, undefined, true)
  if (error) return error

  try {
    const body = await req.json()
    const {
      highestQualification,
      dateOfBirth,
      joiningDate,
      personalMobile,
      homeMobile,
      documents // Array of { type: string, url: string }
    } = body

    if (!highestQualification || !dateOfBirth || !personalMobile) {
      return NextResponse.json({ error: 'highestQualification, dateOfBirth, and personalMobile are required' }, { status: 400 })
    }

    // Update user profile
    const user = await prisma.user.update({
      where: { id: context!.userId },
      data: {
        highestQualification,
        dateOfBirth: new Date(dateOfBirth),
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        personalMobile,
        homeMobile,
        documents: documents?.length ? {
          create: documents.map((doc: any) => ({
            entityType: 'User',
            fileName: doc.type,
            filePath: doc.url
          }))
        } : undefined
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Onboarding form submitted successfully. Profile unlocked!',
      userId: user.id
    })
  } catch (error: any) {
    console.error('[submit-form] POST Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
