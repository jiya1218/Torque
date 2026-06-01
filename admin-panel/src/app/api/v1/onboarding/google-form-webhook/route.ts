import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    // 1. Optional security token verification
    const expectedSecret = process.env.WEBHOOK_SECRET
    if (expectedSecret) {
      const receivedSecret = req.headers.get('x-webhook-secret') || req.nextUrl.searchParams.get('secret')
      if (receivedSecret !== expectedSecret) {
        return NextResponse.json({ error: 'Unauthorized secret token' }, { status: 401 })
      }
    }

    // 2. Parse payload
    const body = await req.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const lowercaseEmail = email.toLowerCase().trim()

    // 3. Find user
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: lowercaseEmail,
          mode: 'insensitive'
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: `User with email ${email} not found` }, { status: 404 })
    }

    // 4. Update user profile to mark onboarding form as completed
    await prisma.user.update({
      where: { id: user.id },
      data: {
        highestQualification: user.highestQualification || 'Submitted via Google Form',
        dateOfBirth: user.dateOfBirth || new Date('2000-01-01'),
        joiningDate: user.joiningDate || new Date(),
        personalMobile: user.personalMobile || 'Submitted via Google Form',
      }
    })

    return NextResponse.json({
      success: true,
      message: `Onboarding form status updated successfully for ${lowercaseEmail}`
    })
  } catch (error: any) {
    console.error('[google-form-webhook] POST Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
