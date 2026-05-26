import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const { error, context } = await validateAuth(req, 'leads.view')
  if (error) return error

  try {
    const where: any = {}
    const roleUpper = context?.role?.toUpperCase() || ''
    const isExecutive = roleUpper.endsWith('EXECUTIVE') || roleUpper === 'TELECALLER' || roleUpper === 'VIEWER'
    
    if (isExecutive) {
      where.assignedTo = context!.userId
    } else if (roleUpper === 'MANAGER') {
      const team = await prisma.user.findMany({
        where: { managerId: context!.userId },
        select: { id: true }
      })
      const teamIds = team.map(t => t.id)
      where.assignedTo = { in: [context!.userId, ...teamIds] }
    }

    const totalLeads = await prisma.lead.count({ where })
    const assignedLeads = await prisma.lead.count({ where: { ...where, assignedTo: { not: null } } })
    const unassignedLeads = await prisma.lead.count({ where: { ...where, assignedTo: null } })
    const convertedLeads = await prisma.lead.count({ where: { ...where, status: 'Converted' } })
    const pendingFollowups = await prisma.lead.count({ where: { ...where, status: { in: ['Follow Up', 'Follow-up'] } } })
    const notInterestedLeads = await prisma.lead.count({ where: { ...where, status: 'Not Interested' } })
    
    const employeeWhere: any = {
      role: {
        name: { notIn: ['Super Admin', 'Admin', 'Viewer'] }
      }
    }
    
    if (roleUpper === 'MANAGER') {
      employeeWhere.managerId = context!.userId
    }

    const employeeStats = await prisma.user.findMany({
      where: employeeWhere,
      select: {
        id: true,
        fullName: true,
        _count: {
          select: {
            assignedLeads: true,
            calls: true,
          }
        },
        assignedLeads: {
          select: {
            status: true
          }
        }
      }
    })

    const formattedEmployeeStats = employeeStats.map(emp => {
      const converted = emp.assignedLeads.filter(l => l.status === 'Converted').length
      const pending = emp.assignedLeads.filter(l => l.status === 'New' || l.status === 'Follow-up').length
      return {
        id: emp.id,
        name: emp.fullName,
        assigned: emp._count.assignedLeads,
        called: emp._count.calls,
        pending: pending,
        converted: converted
      }
    })

    return NextResponse.json({
      summary: {
        total: totalLeads,
        assigned: assignedLeads,
        unassigned: unassignedLeads,
        converted: convertedLeads,
        followups: pendingFollowups,
        notInterested: notInterestedLeads
      },
      employees: formattedEmployeeStats
    })
  } catch (error: any) {
    console.error('Leads Stats Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
