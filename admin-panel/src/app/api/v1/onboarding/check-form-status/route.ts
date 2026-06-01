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

    // Check if the required personal details are missing
    let requiresForm = !user.highestQualification || !user.personalMobile || !user.dateOfBirth

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
          
          // Import PapaParse dynamically or parse simple lines
          const Papa = require('papaparse')
          const parsed = Papa.parse(csvText)
          const emails = new Set<string>()
          
          if (parsed.data && Array.isArray(parsed.data)) {
            for (const row of parsed.data) {
              if (Array.isArray(row)) {
                for (const cell of row) {
                  if (typeof cell === 'string' && cell.includes('@')) {
                    emails.add(cell.toLowerCase().trim())
                  }
                }
              }
            }
          }

          if (emails.has(user.email.toLowerCase().trim())) {
            // Update database profile
            await prisma.user.update({
              where: { id: user.id },
              data: {
                highestQualification: 'Submitted via Google Form',
                dateOfBirth: new Date('2000-01-01'),
                joiningDate: new Date(),
                personalMobile: 'Submitted via Google Form',
              }
            })
            requiresForm = false
          }
        }
      } catch (err) {
        console.error('[check-form-status] Error fetching or parsing Google Sheet responses:', err)
      }
    }

    return NextResponse.json({ requiresForm })
  } catch (error: any) {
    console.error('[check-form-status] GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
