import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { validateAuth } from '@/lib/auth-guard'

export async function GET(req: NextRequest) {
  const { context, error } = await validateAuth(req)
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const view = searchParams.get('view') || 'auto'
    
    // Robust IST-aware date parsing (GMT+5:30)
    const parseDate = (dateStr: string | null, isEnd: boolean) => {
      if (!dateStr) return null
      
      const [year, month, day] = dateStr.split('-').map(Number)
      if (!year || !month || !day) return null
      
      // IST start of day (00:00) is UTC previous day 18:30
      // IST end of day (23:59:59) is UTC same day 18:29:59
      if (!isEnd) {
        const d = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
        d.setMinutes(d.getMinutes() - 330) // -5h 30m
        return d
      } else {
        const d = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
        d.setMinutes(d.getMinutes() - 330) // -5h 30m
        return d
      }
    }

    const fromParam = searchParams.get('startDate') || searchParams.get('from')
    const toParam = searchParams.get('endDate') || searchParams.get('to')

    let from = parseDate(fromParam, false)
    let to = parseDate(toParam, true)

    // Adjust 'today' for IST (+5:30) if no dates provided
    const now = new Date()
    const today = new Date(now.getTime() + (5.5 * 60 * 60 * 1000))
    today.setUTCHours(0, 0, 0, 0)
    const istMidnightInUtc = new Date(today.getTime() - (5.5 * 60 * 60 * 1000))

    // Determine effective filter
    // If user provided dates, we use them strictly. Otherwise we show everything but highlight "Today".
    const dateFilter = (from && to) ? { gte: from, lte: to } : undefined
    const todayFilter = { gte: istMidnightInUtc }

    const userId = context!.userId
    const role = context!.role
    const perms = context!.permissions

    const effectiveView = view === 'auto'
      ? perms.includes('dashboard.view_admin') ? 'admin'
        : perms.includes('dashboard.view_manager') ? 'manager'
        : 'agent'
      : view

    // Enforce permission checks for each view
    if (effectiveView === 'admin' && !perms.includes('dashboard.view_admin')) {
      return NextResponse.json({ error: 'Forbidden: Missing dashboard.view_admin permission' }, { status: 403 })
    }
    if (effectiveView === 'manager' && !perms.includes('dashboard.view_manager')) {
      return NextResponse.json({ error: 'Forbidden: Missing dashboard.view_manager permission' }, { status: 403 })
    }
    if (effectiveView === 'agent' && !perms.includes('dashboard.view_agent')) {
      return NextResponse.json({ error: 'Forbidden: Missing dashboard.view_agent permission' }, { status: 403 })
    }

    // ── Agent view ─────────────────────────────────────
    if (effectiveView === 'agent') {
      const [myLeads, myLeadsToday, myFollowupsPending, myCallsToday, myQuotations] = await Promise.all([
        prisma.lead.count({ where: { assignedTo: userId, createdAt: dateFilter } }),
        prisma.lead.count({ where: { assignedTo: userId, createdAt: todayFilter } }),
        prisma.followUp.count({ where: { assignedTo: userId, status: 'pending' } }),
        prisma.call.count({ where: { userId, createdAt: dateFilter || todayFilter } }),
        prisma.quotation.count({ where: { createdBy: userId, createdAt: dateFilter } })
      ])
      return NextResponse.json({
        view: 'agent',
        my_leads: myLeads,
        new_leads_today: myLeadsToday,
        pending_followups: myFollowupsPending,
        calls_today: myCallsToday,
        my_quotations: myQuotations
      })
    }

    // ── Manager view ───────────────────────────────────
    if (effectiveView === 'manager') {
      // Get IDs of all users reporting to this manager
      const team = await prisma.user.findMany({
        where: { managerId: userId },
        select: { id: true }
      })
      const teamIds = team.map(t => t.id)

      // Batch simple counts to stay well below Supabase connection pool limitations (max 15 concurrent clients)
      const [totalLeads, activeLeads, wonLeads, lostLeads] = await Promise.all([
        prisma.lead.count({ where: { assignedTo: { in: teamIds }, createdAt: dateFilter } }),
        prisma.lead.count({ where: { assignedTo: { in: teamIds }, status: { in: ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation'] }, createdAt: dateFilter } }),
        prisma.lead.count({ where: { assignedTo: { in: teamIds }, status: 'Won', createdAt: dateFilter } }),
        prisma.lead.count({ where: { assignedTo: { in: teamIds }, status: 'Lost', createdAt: dateFilter } }),
      ])

      const [pendingFollowups, overdueFollowups, totalQuotations, sentQuotations] = await Promise.all([
        prisma.followUp.count({ where: { assignedTo: { in: teamIds }, status: 'pending', createdAt: dateFilter } }),
        prisma.followUp.count({ where: { assignedTo: { in: teamIds }, isOverdue: true, createdAt: dateFilter } }),
        prisma.quotation.count({ where: { createdBy: { in: teamIds }, createdAt: dateFilter } }),
        prisma.quotation.count({ where: { createdBy: { in: teamIds }, status: 'Sent', createdAt: dateFilter } })
      ])

      const pipeline = await prisma.lead.groupBy({
        by: ['status'],
        where: { assignedTo: { in: teamIds }, createdAt: dateFilter },
        _count: { _all: true }
      })

      return NextResponse.json({
        view: 'manager',
        team_size: teamIds.length,
        total_leads: totalLeads,
        active_leads: activeLeads,
        won_leads: wonLeads,
        lost_leads: lostLeads,
        pending_followups: pendingFollowups,
        overdue_followups: overdueFollowups,
        total_quotations: totalQuotations,
        sent_quotations: sentQuotations,
        pipeline: pipeline.map(p => ({ status: p.status, count: p._count._all }))
      })
    }


    // ── Admin view ─────────────────────────────────
    // Batch counts sequentially to stay well below Supabase connection pool limitations (max 15 concurrent clients)
    const [totalLeads, newLeadsToday, totalPolicies, activePolicies, totalQuotations] = await Promise.all([
      prisma.lead.count({ where: { createdAt: dateFilter } }),
      prisma.lead.count({ where: { createdAt: todayFilter } }),
      prisma.policy.count({ where: { createdAt: dateFilter } }),
      prisma.policy.count({ where: { status: 'Active', createdAt: dateFilter } }),
      prisma.quotation.count({ where: { createdAt: dateFilter } }),
    ])

    const [totalCalls, pendingFollowups, overdueFollowups, activeClaims, pendingRto] = await Promise.all([
      prisma.call.count({ where: { createdAt: dateFilter } }),
      prisma.followUp.count({ where: { status: 'pending', createdAt: dateFilter } }),
      prisma.followUp.count({ where: { isOverdue: true, createdAt: dateFilter } }),
      prisma.claim.count({ where: { status: { in: ['filed', 'under_review', 'approved'] }, createdAt: dateFilter } }),
      prisma.rTOWork.count({ where: { status: 'pending', createdAt: dateFilter } }),
    ])

    const [pendingFitness, activeLoans, totalCustomers, todayVisits, totalUsers] = await Promise.all([
      prisma.fitnessWork.count({ where: { status: 'pending', createdAt: dateFilter } }),
      prisma.loan.count({ where: { status: { in: ['applied', 'under_review', 'approved', 'disbursed'] }, createdAt: dateFilter } }),
      prisma.customer.count({ where: { createdAt: dateFilter } }),
      prisma.visit.count({ where: { scheduledAt: dateFilter || todayFilter } }),
      prisma.user.count({ where: { isActive: true } })
    ])

    // Monthly revenue (respect date filter if provided)
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const revenueData = await prisma.transaction.groupBy({
      by: ['date'],
      where: { type: 'income', date: dateFilter || { gte: sixMonthsAgo } },
      _sum: { amount: true }
    })

    const topAgents = await prisma.lead.groupBy({
      by: ['assignedTo'],
      where: { assignedTo: { not: null }, createdAt: dateFilter },
      _count: { _all: true },
      orderBy: { _count: { assignedTo: 'desc' } },
      take: 5
    })

    return NextResponse.json({
      view: 'admin',
      total_leads: totalLeads,
      new_leads_today: newLeadsToday,
      pending_followups: pendingFollowups,
      overdue_followups: overdueFollowups,
      total_policies: totalPolicies,
      active_policies: activePolicies,
      total_quotations: totalQuotations,
      total_calls: totalCalls,
      active_claims: activeClaims,
      pending_rto: pendingRto,
      pending_fitness: pendingFitness,
      active_loans: activeLoans,
      total_customers: totalCustomers,
      today_visits: todayVisits,
      total_employees: totalUsers,
      revenue_trend: revenueData,
      top_agents: topAgents
    })
  } catch (error) {
    console.error('Dashboard Stats Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
