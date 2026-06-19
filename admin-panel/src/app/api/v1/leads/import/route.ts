import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

function getRowValueByHeader(row: any, mappedHeader: string | undefined | null): any {
  if (!row || !mappedHeader) return null;

  // 1. Try exact match first
  if (row[mappedHeader] !== undefined && row[mappedHeader] !== null) {
    return row[mappedHeader];
  }

  // 2. Try trimmed match
  const trimmedHeader = String(mappedHeader).trim();
  if (row[trimmedHeader] !== undefined && row[trimmedHeader] !== null) {
    return row[trimmedHeader];
  }

  // 3. Try normalized fuzzy match (remove spaces, dots, dashes, underscores and lowercase)
  const normMapped = trimmedHeader.toLowerCase().replace(/[\s\.\-_]/g, '');
  const rowKeys = Object.keys(row);
  for (const key of rowKeys) {
    const normKey = key.toLowerCase().replace(/[\s\.\-_]/g, '');
    if (normKey === normMapped) {
      return row[key];
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'leads.import')
  if (error) return error

  try {
    const contentType = req.headers.get('content-type') || ''
    let rawData: any[] = []
    let importName = ''
    let mapping: any = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file') as File
      if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
      
      importName = formData.get('importName') as string || ''
      const mappingStr = formData.get('mapping') as string || ''
      if (mappingStr) {
        try { mapping = JSON.parse(mappingStr) } catch {}
      }

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
      importName = body.importName || ''
      mapping = body.mapping || null
    }

    if (rawData.length === 0) {
      return NextResponse.json({ error: 'No data found in the uploaded file. Please check if the file is empty or has a valid header row.' }, { status: 400 })
    }

    // 1. Data Validation & Sanitization
    console.log('[import-leads] Mapping received:', mapping);
    if (rawData.length > 0) {
      console.log('[import-leads] Sample row keys:', Object.keys(rawData[0]));
      console.log('[import-leads] Sample row values:', rawData[0]);
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
      let vehicleNo = ''
      let ownerName = ''
      let contactNo = ''
      let email = null
      let expiryDateStr = ''
      let gvw = null

      if (mapping) {
        vehicleNo = getRowValueByHeader(row, mapping.vehicleNo)
        ownerName = getRowValueByHeader(row, mapping.clientName)
        contactNo = getRowValueByHeader(row, mapping.clientPhone)
        email = getRowValueByHeader(row, mapping.clientEmail)
        expiryDateStr = getRowValueByHeader(row, mapping.expiryDate)
        gvw = getRowValueByHeader(row, mapping.gvw)
      } else {
        // Normalize row keys to lowercase and remove spaces for fuzzy matching
        const normalizedRow: any = {}
        Object.keys(row).forEach(key => {
          if (row[key] !== undefined && row[key] !== null) {
            normalizedRow[key.toLowerCase().replace(/[\s\.\-_]/g, '')] = row[key]
          }
        })

        vehicleNo = normalizedRow['vehiclenumber'] || normalizedRow['vehicleno'] || normalizedRow['vehicle'] || normalizedRow['vehicalnumber'] || normalizedRow['vehical'] || normalizedRow['regno'] || row['Vehicle No'] || row['vehicleNo'] || row['VEHICAL NUMBER']
        ownerName = normalizedRow['ownername'] || normalizedRow['name'] || normalizedRow['clientname'] || row['Owner Name'] || row['clientName'] || row['OWNER NAME']
        contactNo = normalizedRow['phonenumber'] || normalizedRow['contactnumber'] || normalizedRow['phone'] || normalizedRow['contact'] || row['Contact Number'] || row['clientPhone'] || row['PHONE NUMBER']
        expiryDateStr = normalizedRow['insuranceexpirydate'] || normalizedRow['expirydate'] || normalizedRow['expiry'] || row['Insurance Expiry Date'] || row['expiryDate']
        email = normalizedRow['email'] || row['Email'] || row['clientEmail'] || row['EMAIL (OPTIONAL)'] || normalizedRow['emailoptional'] || normalizedRow['email(optional)']
      }

      const cleanVehicleNo = vehicleNo !== undefined && vehicleNo !== null ? String(vehicleNo).trim() : '';
      const cleanOwnerName = ownerName !== undefined && ownerName !== null ? String(ownerName).trim() : '';
      const cleanContactNo = contactNo !== undefined && contactNo !== null ? String(contactNo).trim() : '';

      if (!cleanVehicleNo || !cleanOwnerName || !cleanContactNo) {
        errorRows.push({ 
          row: index + 1, 
          error: `Missing fields: ${!cleanVehicleNo ? 'Vehicle No, ' : ''}${!cleanOwnerName ? 'Name, ' : ''}${!cleanContactNo ? 'Phone' : ''}`,
          data: row 
        })
        return
      }

      const vNo = cleanVehicleNo.toUpperCase()

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
        gvw: gvw ? String(gvw).trim() : null,
        importName: importName ? importName.trim() : null,
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
          OR: [
            { name: { equals: 'Sales Executive', mode: 'insensitive' } },
            { name: { equals: 'EXECUTIVE', mode: 'insensitive' } }
          ]
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

    // Fetch all user names to map assigned ids
    const allUsers = await prisma.user.findMany({
      select: { id: true, fullName: true, email: true }
    })
    const userMap = new Map(allUsers.map(u => [u.id, u.fullName || u.email]))

    const importedLeads = leadsWithAssignment.map(l => ({
      clientName: l.clientName,
      vehicleNo: l.vehicleNo,
      clientPhone: l.clientPhone,
      assignedToName: userMap.get(l.assignedTo) || 'Unassigned'
    }))

    return NextResponse.json({
      success: true,
      stats: {
        total: rawData.length,
        valid: validLeads.length,
        duplicates: rawData.length - validLeads.length - errorRows.length,
        errors: errorRows.length,
        assignedCount: result.count
      },
      importedLeads,
      errorDetails: errorRows.slice(0, 10)
    })

  } catch (error: any) {
    console.error('Lead Import Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
