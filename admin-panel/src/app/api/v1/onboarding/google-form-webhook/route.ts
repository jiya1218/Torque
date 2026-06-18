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
    const { 
      email,
      personalMobile,
      homeMobile,
      highestQualification,
      dateOfBirth,
      joiningDate,
      // Supporting variations in key names
      adhar, adhaar, aadhaar,
      pan,
      ssc, sscMarksheet,
      qualification, qualificationDoc, qualificationCert,
      leaving, schoolLeaving, leavingCert,
      photo, passportPhoto
    } = body

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

    // 4. Parse documents
    const documentsToCreate: { fileName: string; filePath: string }[] = []
    
    const adharPath = adhar || adhaar || aadhaar
    if (adharPath) documentsToCreate.push({ fileName: 'ADHAR', filePath: adharPath })
    
    const panPath = pan
    if (panPath) documentsToCreate.push({ fileName: 'PAN', filePath: panPath })
    
    const sscPath = ssc || sscMarksheet
    if (sscPath) documentsToCreate.push({ fileName: 'SSC', filePath: sscPath })
    
    const qualPath = qualification || qualificationDoc || qualificationCert
    if (qualPath) documentsToCreate.push({ fileName: 'QUALIFICATION', filePath: qualPath })
    
    const leavingPath = leaving || schoolLeaving || leavingCert
    if (leavingPath) documentsToCreate.push({ fileName: 'LEAVING', filePath: leavingPath })
    
    const photoPath = photo || passportPhoto
    if (photoPath) documentsToCreate.push({ fileName: 'PHOTO', filePath: photoPath })

    // 5. Update user profile and documents in database
    if (documentsToCreate.length) {
      await prisma.document.deleteMany({
        where: {
          entityType: 'User',
          entityId: user.id
        }
      })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        highestQualification: highestQualification || user.highestQualification || 'Submitted via Google Form',
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : (user.dateOfBirth || new Date('2000-01-01')),
        joiningDate: joiningDate ? new Date(joiningDate) : (user.joiningDate || new Date()),
        personalMobile: personalMobile || user.personalMobile || 'Submitted via Google Form',
        homeMobile: homeMobile || user.homeMobile || null,
        documents: documentsToCreate.length ? {
          create: documentsToCreate.map(d => ({
            entityType: 'User',
            entityId: user.id,
            fileName: d.fileName,
            filePath: d.filePath,
            uploadedBy: user.id
          }))
        } : undefined
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
