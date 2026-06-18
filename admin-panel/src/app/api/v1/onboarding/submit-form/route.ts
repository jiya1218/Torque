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

    console.log(`[submit-form] User ${context!.userId} submitting with ${documents?.length || 0} documents`)

    // Check if the user previously had a revision remark from the admin
    const existingUser = await prisma.user.findUnique({
      where: { id: context!.userId },
      select: { onboardingRemark: true }
    })
    const hadRemark = !!existingUser?.onboardingRemark

    // Delete existing onboarding documents for this user if they are uploading new ones
    if (documents?.length) {
      await prisma.document.deleteMany({
        where: {
          entityType: 'User',
          entityId: context!.userId
        }
      });
    }

    // Update user profile (without documents)
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
      }
    })

    // Create documents separately to avoid Prisma relation conflicts
    if (documents?.length) {
      await prisma.document.createMany({
        data: documents.map((doc: any) => ({
          entityType: 'User',
          entityId: context!.userId,
          fileName: doc.type,
          filePath: doc.url,
          uploadedBy: context!.userId
        }))
      })
    }

    // Archive webhook forwarding to Google Drive Apps Script
    const webhookUrl = process.env.GOOGLE_DRIVE_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            email: user.email,
            fullName: user.fullName,
            highestQualification,
            dateOfBirth,
            joiningDate,
            personalMobile,
            homeMobile,
            documents
          })
        });
      } catch (webhookErr) {
        console.error('[submit-form] Google Drive webhook failed:', webhookErr);
      }
    }

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
