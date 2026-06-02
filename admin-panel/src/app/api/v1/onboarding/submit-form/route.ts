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

    // Check if the user previously had a revision remark from the admin
    const existingUser = await prisma.user.findUnique({
      where: { id: context!.userId },
      select: { onboardingRemark: true }
    })
    const hadRemark = !!existingUser?.onboardingRemark

    // Update user profile
    const user = await prisma.user.update({
      where: { id: context!.userId },
      data: {
        highestQualification,
        dateOfBirth: new Date(dateOfBirth),
        joiningDate: joiningDate ? new Date(joiningDate) : null,
        personalMobile,
        homeMobile,
        onboardingRemark: null,
        onboardingUpdated: hadRemark,
        documents: documents?.length ? {
          create: documents.map((doc: any) => ({
            entityType: 'User',
            entityId: context!.userId,
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
