import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export async function POST(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'leads.create')
  if (error) return error

  try {
    const contentType = req.headers.get('content-type') || ''
    let rawData: any[] = []

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File
      if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
      
      const fileName = file.name.toLowerCase()
      
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        rawData = XLSX.utils.sheet_to_json(worksheet)
      } else {
        const text = await file.text()
        const { data } = Papa.parse(text, { header: true, skipEmptyLines: true })
        rawData = data
      }
    } else {
      const body = await req.json()
      rawData = Array.isArray(body.leads) ? body.leads : []
    }

    if (rawData.length === 0) {
      return NextResponse.json({ error: 'No data found in the uploaded file. Please check if the file is empty or has a valid header row.' }, { status: 400 })
    }

    // 1. Data Validation & Sanitization
    const validLeads: any[] = []
    const errorRows: any[] = []
    const vehicleNumbers = new Set<string>()

    // Fetch existing vehicle numbers to prevent duplicates
    const existingLeads = await prisma.lead.findMany({
      select: { vehicleNo: true }
    })
    const existingVehicles = new Set(existingLeads.map(l => l.vehicleNo).filter(Boolean))

    rawData.forEach((row, index) => {
      // Normalize row keys to lowercase and remove spaces for fuzzy matching
      const normalizedRow: any = {}
      Object.keys(row).forEach(key => {
        if (row[key] !== undefined && row[key] !== null) {
          normalizedRow[key.toLowerCase().replace(/[\s\.\-_]/g, '')] = row[key]
        }
      })

      const vehicleNo = normalizedRow['vehiclenumber'] || normalizedRow['vehicleno'] || normalizedRow['vehicle'] || normalizedRow['vehicalnumber'] || normalizedRow['vehical'] || normalizedRow['regno'] || row['Vehicle No'] || row['vehicleNo'] || row['VEHICAL NUMBER']
      const ownerName = normalizedRow['ownername'] || normalizedRow['name'] || normalizedRow['clientname'] || row['Owner Name'] || row['clientName'] || row['OWNER NAME']
      const contactNo = normalizedRow['phonenumber'] || normalizedRow['contactnumber'] || normalizedRow['phone'] || normalizedRow['contact'] || row['Contact Number'] || row['clientPhone'] || row['PHONE NUMBER']
      let expiryDateStr = normalizedRow['insuranceexpirydate'] || normalizedRow['expirydate'] || normalizedRow['expiry'] || row['Insurance Expiry Date'] || row['expiryDate']
      
      const email = normalizedRow['email'] || row['Email'] || row['clientEmail'] || row['EMAIL (OPTIONAL)'] || normalizedRow['emailoptional'] || normalizedRow['email(optional)']

      if (!vehicleNo || !ownerName || !contactNo) {
        errorRows.push({ 
          row: index + 1, 
          error: `Missing fields: ${!vehicleNo ? 'Vehicle No, ' : ''}${!ownerName ? 'Name, ' : ''}${!contactNo ? 'Phone' : ''}`,
          data: row 
        })
        return
      }

      const vNo = String(vehicleNo).trim().toUpperCase()

      if (vehicleNumbers.has(vNo) || existingVehicles.has(vNo)) {
        errorRows.push({ row: index + 1, error: `Duplicate Vehicle No in file or system: ${vNo}` })
        return
      }

      vehicleNumbers.add(vNo)
      
      // Default expiry date to 1 year from now if not provided
      let expiryDate = new Date()
      expiryDate.setFullYear(expiryDate.getFullYear() + 1)
      
      if (expiryDateStr) {
        const parsed = new Date(expiryDateStr)
        if (!isNaN(parsed.getTime())) {
          expiryDate = parsed
        }
      }
      
      validLeads.push({
        vehicleNo: vNo,
        clientName: String(ownerName).trim(),
        clientPhone: String(contactNo).trim(),
        clientEmail: email ? String(email).trim() : null,
        expiryDate: expiryDate,
        status: 'New'
      })
    })

    if (validLeads.length === 0) {
      const duplicateCount = errorRows.filter(e => e.error.includes('Duplicate')).length
      const invalidCount = errorRows.length - duplicateCount
      const headersFound = rawData.length > 0 ? Object.keys(rawData[0]).join(', ') : 'None'
      
      let errorMsg = 'No new leads were imported.'
      if (duplicateCount > 0 && invalidCount === 0) {
        errorMsg = `All leads in the file already exist in the system (${duplicateCount} duplicates found).`
      } else if (invalidCount > 0) {
        errorMsg = `No valid leads found. ${invalidCount} rows had missing information.\n\nDetected Headers: ${headersFound}\nRequired: Name, Phone, and Vehicle No.`
      }

      return NextResponse.json({ 
        error: errorMsg,
        stats: { total: rawData.length, valid: 0, errors: errorRows.length, duplicates: duplicateCount },
        errorDetails: errorRows.slice(0, 10)
      }, { status: 400 })
    }

    // 2. Fetch Active Sales Executives
    const salesExecutives = await prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          name: {
            equals: 'Sales Executive',
            mode: 'insensitive'
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      },
      select: {
        id: true
      }
    })

    if (salesExecutives.length === 0) {
      return NextResponse.json({ 
        error: 'No active Sales Executives found to assign leads to.',
        stats: { total: rawData.length, valid: validLeads.length, errors: errorRows.length }
      }, { status: 400 })
    }

    // Find the last assigned lead to continue the round-robin sequence from where it left off
    const lastAssignedLead = await prisma.lead.findFirst({
      where: {
        assignedTo: { not: null }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    let nextIndex = 0
    if (lastAssignedLead && lastAssignedLead.assignedTo) {
      const lastId = lastAssignedLead.assignedTo
      const foundIndex = salesExecutives.findIndex(se => se.id === lastId)
      if (foundIndex !== -1) {
        nextIndex = (foundIndex + 1) % salesExecutives.length
      }
    }

    // 3. Round Robin Assignment
    const leadsWithAssignment = validLeads.map((lead) => {
      const assignee = salesExecutives[nextIndex]
      nextIndex = (nextIndex + 1) % salesExecutives.length
      return {
        ...lead,
        assignedTo: assignee.id
      }
    })

    // 4. Batch Create Leads
    const result = await prisma.lead.createMany({
      data: leadsWithAssignment,
      skipDuplicates: true
    })

    return NextResponse.json({
      success: true,
      stats: {
        total: rawData.length,
        valid: validLeads.length,
        duplicates: rawData.length - validLeads.length - errorRows.length,
        errors: errorRows.length,
        assignedCount: result.count
      },
      errorDetails: errorRows.slice(0, 10)
    })

  } catch (error: any) {
    console.error('Lead Import Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
