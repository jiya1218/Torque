import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { QuotationPDF } from '@/components/pdf/QuotationPDF'
import React from 'react'
import { validateAuth } from '@/lib/auth-guard'
import { pdf } from '@react-pdf/renderer'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await validateAuth(req, 'quotation.view')
  if (error) return error

  try {
    const { id } = await params

    // 1. Fetch data
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        lead: true,
        creator: true
      }
    })

    if (!quotation) {
      return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
    }

    // 2. Generate PDF using Web APIs (Blob/ArrayBuffer) for maximum compatibility with Next.js 15
    const pdfInstance = pdf(<QuotationPDF data={quotation} />)
    const blob = await (pdfInstance.toBlob() as any)
    const pdfArrayBuffer = await (blob.arrayBuffer() as any)

    // 3. Return PDF
    return new NextResponse(pdfArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="quotation_${id.slice(0, 8)}.pdf"`
      }
    })
  } catch (error: any) {
    console.error('PDF Generation Error:', error)
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 })
  }
}
