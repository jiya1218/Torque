import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { error } = await validateAuth(req, 'leads.view')
  if (error) return error

  try {
    const imports = await prisma.lead.findMany({
      where: {
        AND: [
          { importName: { not: null } },
          { importName: { not: '' } }
        ]
      },
      select: {
        importName: true
      },
      distinct: ['importName']
    })

    const importNames = imports.map(i => i.importName).filter(Boolean)
    return NextResponse.json(importNames)
  } catch (err: any) {
    console.error('Imports GET error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
