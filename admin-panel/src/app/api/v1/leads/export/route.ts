import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'
import Papa from 'papaparse'

export async function GET(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'leads.export')
  if (error) return error

  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        assignee: { select: { fullName: true } }
      }
    })

    const csvData = leads.map(lead => ({
      ID: lead.id,
      'Client Name': lead.clientName,
      'Phone': lead.clientPhone || 'N/A',
      'Email': lead.clientEmail || 'N/A',
      'Status': lead.status,
      'Assigned To': lead.assignee?.fullName || 'Unassigned',
      'Created At': lead.createdAt.toISOString(),
    }))

    const csv = Papa.unparse(csvData)

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=leads-export-${new Date().toISOString().split('T')[0]}.csv`
      }
    })
  } catch (error) {
    console.error('Lead Export Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
