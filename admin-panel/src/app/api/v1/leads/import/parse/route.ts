import { NextRequest, NextResponse } from 'next/server'
import { validateAuth } from '@/lib/auth-guard'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

export async function POST(req: NextRequest) {
  const { error } = await validateAuth(req, 'leads.import')
  if (error) return error

  try {
    const contentType = req.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Multipart/form-data required' }, { status: 400 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()
    let headers: string[] = []

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      
      const range = XLSX.utils.decode_range(worksheet['!ref'] || '')
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: range.s.r, c: col })
        const cell = worksheet[cellRef]
        if (cell && cell.v !== undefined) {
          headers.push(String(cell.v).trim())
        }
      }
    } else {
      const text = await file.text()
      const parseResult = Papa.parse(text, { preview: 1 })
      if (parseResult.data && parseResult.data.length > 0) {
        headers = (parseResult.data[0] as string[]).map(h => String(h).trim()).filter(Boolean)
      }
    }

    return NextResponse.json({ headers })
  } catch (err: any) {
    console.error('Import parse error:', err)
    return NextResponse.json({ error: err.message || 'Failed to parse file headers' }, { status: 500 })
  }
}
