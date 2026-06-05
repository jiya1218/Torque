import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req, undefined, true)
  if (error) return error

  try {
    const user = await prisma.user.findUnique({
      where: { id: context!.userId },
      include: { role: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Admins and Super Admins do not need to fill out the onboarding form
    const roleUpper = user.role?.name?.toUpperCase() || ''
    const isAdminRole = roleUpper === 'SUPER ADMIN' || roleUpper === 'ADMIN'

    if (isAdminRole) {
      return NextResponse.json({ requiresForm: false })
    }

    // Check if the required personal details are missing (only for inactive/new joiners)
    // Existing active staff members never need to fill out the onboarding form
    // Also require form re-submission if an admin remark exists.
    let requiresForm = false
    if (!user.isActive) {
      requiresForm = !user.highestQualification || !user.personalMobile || !user.dateOfBirth || !!user.onboardingRemark
    }

    // If details are missing, check the Google Sheets responses sheet if URL is configured
    const sheetUrl = process.env.GOOGLE_SHEET_RESPONSES_URL
    if (requiresForm && sheetUrl) {
      try {
        const getGoogleSheetCsvUrl = (url: string): string => {
          if (url.includes('output=csv') || url.includes('format=csv')) {
            return url
          }
          const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
          if (match && match[1]) {
            return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`
          }
          return url
        }

        const csvUrl = getGoogleSheetCsvUrl(sheetUrl)
        
        // Fetch with a 3-second timeout to avoid blocking page loads
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)
        
        const response = await fetch(csvUrl, { signal: controller.signal })
        clearTimeout(timeoutId)

        if (response.ok) {
          const csvText = await response.text()
          const Papa = require('papaparse')
          const parsed = Papa.parse(csvText)
          
          if (parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0) {
            const headers = (parsed.data[0] as string[]).map(h => (h || '').toLowerCase().trim());
            
            // Find indices of headers dynamically
            const emailIndex = headers.findIndex(h => h.includes('email') || h.includes('username'));
            const mobileIndex = headers.findIndex(h => h.includes('mobile') || h.includes('phone') || h.includes('contact'));
            const homeMobileIndex = headers.findIndex(h => h.includes('alternative') || h.includes('home mobile'));
            const qualificationIndex = headers.findIndex(h => h.includes('qualification') || h.includes('degree'));
            const dobIndex = headers.findIndex(h => h.includes('birth') || h.includes('dob'));
            const joiningIndex = headers.findIndex(h => h.includes('joining') || h.includes('join'));
            
            const adharIndex = headers.findIndex(h => h.includes('adhar') || h.includes('adhaar') || h.includes('aadhaar'));
            const panIndex = headers.findIndex(h => h.includes('pan'));
            const sscIndex = headers.findIndex(h => h.includes('ssc') || h.includes('marksheet') || h.includes('10th'));
            const qualDocIndex = headers.findIndex(h => h.includes('qualification cert') || h.includes('qualification doc') || h.includes('degree cert') || (h.includes('qualification') && h !== 'highest qualification'));
            const leavingIndex = headers.findIndex(h => h.includes('leaving') || h.includes('school leaving'));
            const photoIndex = headers.findIndex(h => h.includes('photo') || h.includes('passport'));

            const targetEmail = user.email.toLowerCase().trim()

            for (let i = 1; i < parsed.data.length; i++) {
              const row = parsed.data[i];
              if (!Array.isArray(row)) continue;

              const emailVal = emailIndex !== -1 ? row[emailIndex]?.toLowerCase()?.trim() : '';
              if (emailVal === targetEmail) {
                // Found matched user row in spreadsheet!
                const personalMobile = mobileIndex !== -1 && row[mobileIndex]?.trim() ? row[mobileIndex].trim() : 'Submitted via Google Form';
                const homeMobile = homeMobileIndex !== -1 && row[homeMobileIndex]?.trim() ? row[homeMobileIndex].trim() : null;
                const highestQualification = qualificationIndex !== -1 && row[qualificationIndex]?.trim() ? row[qualificationIndex].trim() : 'Submitted via Google Form';
                
                let dateOfBirth = new Date('2000-01-01');
                if (dobIndex !== -1 && row[dobIndex]) {
                  const parsedDate = new Date(row[dobIndex]);
                  if (!isNaN(parsedDate.getTime())) dateOfBirth = parsedDate;
                }
                
                let joiningDate = new Date();
                if (joiningIndex !== -1 && row[joiningIndex]) {
                  const parsedDate = new Date(row[joiningIndex]);
                  if (!isNaN(parsedDate.getTime())) joiningDate = parsedDate;
                }

                // Collect documents
                const documentsToCreate: { fileName: string; filePath: string }[] = [];
                
                const adharUrl = adharIndex !== -1 ? row[adharIndex]?.trim() : '';
                if (adharUrl && adharUrl.startsWith('http')) documentsToCreate.push({ fileName: 'ADHAR', filePath: adharUrl });

                const panUrl = panIndex !== -1 ? row[panIndex]?.trim() : '';
                if (panUrl && panUrl.startsWith('http')) documentsToCreate.push({ fileName: 'PAN', filePath: panUrl });

                const sscUrl = sscIndex !== -1 ? row[sscIndex]?.trim() : '';
                if (sscUrl && sscUrl.startsWith('http')) documentsToCreate.push({ fileName: 'SSC', filePath: sscUrl });

                const qualUrl = qualDocIndex !== -1 ? row[qualDocIndex]?.trim() : '';
                if (qualUrl && qualUrl.startsWith('http')) documentsToCreate.push({ fileName: 'QUALIFICATION', filePath: qualUrl });

                const leavingUrl = leavingIndex !== -1 ? row[leavingIndex]?.trim() : '';
                if (leavingUrl && leavingUrl.startsWith('http')) documentsToCreate.push({ fileName: 'LEAVING', filePath: leavingUrl });

                const photoUrl = photoIndex !== -1 ? row[photoIndex]?.trim() : '';
                if (photoUrl && photoUrl.startsWith('http')) documentsToCreate.push({ fileName: 'PHOTO', filePath: photoUrl });

                // Delete old documents
                if (documentsToCreate.length) {
                  await prisma.document.deleteMany({
                    where: {
                      entityType: 'User',
                      entityId: user.id
                    }
                  });
                }

                // Update user details and add documents relations
                await prisma.user.update({
                  where: { id: user.id },
                  data: {
                    highestQualification,
                    dateOfBirth,
                    joiningDate,
                    personalMobile,
                    homeMobile,
                    onboardingRemark: null,
                    onboardingUpdated: false,
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
                });

                requiresForm = false;
                break;
              }
            }
          }
        }
      } catch (err) {
        console.error('[check-form-status] Error fetching or parsing Google Sheet responses:', err)
      }
    }

    return NextResponse.json({ requiresForm, onboardingRemark: user.onboardingRemark })
  } catch (error: any) {
    console.error('[check-form-status] GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
