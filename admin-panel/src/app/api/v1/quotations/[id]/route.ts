
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await params
    const body = await req.json()
    const { status, amount, details } = body

    const isApproveFlow = status && ['Approved', 'Rejected', 'Sent'].includes(status)
    const requiredPermission = isApproveFlow ? 'quotations.approve' : 'quotations.edit'

    const hasPermission = context.permissions.some(p => 
      [requiredPermission, requiredPermission.replace('quotations.', 'quotation.')].includes(p)
    )

    if (!hasPermission) {
      return NextResponse.json({ error: `Forbidden: Missing ${requiredPermission} permission` }, { status: 403 })
    }

    const dataToUpdate: any = {}
    if (status !== undefined) dataToUpdate.status = status
    if (amount !== undefined) dataToUpdate.amount = amount
    if (details !== undefined) dataToUpdate.details = details

    const quote = await prisma.quotation.update({
      where: { id },
      data: dataToUpdate
    })

    return NextResponse.json(quote)
  } catch (error) {
    console.error('Quotation PATCH Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
