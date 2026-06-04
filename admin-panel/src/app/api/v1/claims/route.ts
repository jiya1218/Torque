import { validateAuth } from '@/lib/auth-guard'
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const { error, context } = await validateAuth(req, 'claims.view')
    if (error) return error

    try {
      const { searchParams } = new URL(req.url)
      const status = searchParams.get('status')
      
      const where: any = {}
      
      // RBAC: Dynamic filtering based on role
      if (context && context.role === 'EXECUTIVE') {
        where.assignedTo = context.userId
      } else if (context && context.role === 'MANAGER') {
        const team = await prisma.user.findMany({
          where: { managerId: context.userId },
          select: { id: true }
        })
        const teamIds = team.map(t => t.id)
        where.assignedTo = { in: [context.userId, ...teamIds] }
      }

      if (status && status !== 'all') {
        where.status = status
      }

      const claims = await prisma.claim.findMany({
        where,
      orderBy: { filedDate: 'desc' },
      include: {
        lead: { select: { clientName: true } },
        policy: { select: { policyNumber: true } }
      }
    })

    return NextResponse.json(claims)
  } catch (error) {
    console.error('Claims GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error } = await validateAuth(req, 'claims.create')
  if (error) return error

  try {
    const body = await req.json()
    
    // Fetch policy/lead info if not provided
    let { customerName, policyNumber, vehicleNumber, leadId } = body
    if (body.policy_id && (!customerName || !policyNumber)) {
      const policy = await prisma.policy.findUnique({
        where: { id: body.policy_id },
        include: { lead: true }
      })
      if (policy) {
        customerName = customerName || policy.lead?.clientName || 'Unknown'
        policyNumber = policyNumber || policy.policyNumber
        vehicleNumber = vehicleNumber || policy.lead?.vehicleNo
        leadId = leadId || policy.leadId
      }
    }

    const claim = await prisma.claim.create({
      data: {
        policyId: body.policy_id,
        leadId: leadId,
        assignedTo: body.assigned_to,
        customerName: customerName || 'Unknown',
        policyNumber: policyNumber,
        vehicleNumber: vehicleNumber,
        claimType: body.type || body.claimType,
        claimAmount: body.amount || body.claimAmount,
        incidentDate: body.incident_date ? new Date(body.incident_date) : null,
        status: 'filed'
      }
    })
    return NextResponse.json(claim)
  } catch (error) {
    console.error('Claim POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
export async function PATCH(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error || !context) return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await req.json()
    const { id, ...updates } = data

    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 })

    const keys = Object.keys(updates)
    const isStatusUpdate = keys.every(k => k === 'status')
    const isDocsUpdate = keys.every(k => k === 'documents')

    let requiredPermission = 'claims.edit'
    if (isStatusUpdate) {
      requiredPermission = 'claims.update_status'
    } else if (isDocsUpdate) {
      requiredPermission = 'claims.upload_documents'
    }

    const hasPermission = context.permissions.includes(requiredPermission) || context.permissions.includes('claims.edit')
    if (!hasPermission) {
      return NextResponse.json({ error: `Forbidden: Missing ${requiredPermission} permission` }, { status: 403 })
    }

    if (updates.incidentDate) updates.incidentDate = new Date(updates.incidentDate)
    if (updates.settledDate) updates.settledDate = new Date(updates.settledDate)

    const claim = await prisma.claim.update({
      where: { id },
      data: updates
    })
    return NextResponse.json(claim)
  } catch (error) {
    console.error('Claim PATCH Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
