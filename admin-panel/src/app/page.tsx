"use client"
import React, { useState, useEffect } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import { 
  Target, Users2, ShieldCheck, FileText, DownloadCloud, Plus, 
  Clock, AlertCircle, TrendingUp, BarChart2, Briefcase, Activity, 
  MapPin, Phone, UserCheck, RefreshCw, Calendar
} from 'lucide-react'
import { useRouter } from 'next/navigation'

// Global memory caches
const statsCache: Record<string, any> = {}
const teamCache: Record<string, any[]> = {}
const cacheTimestamps: Record<string, number> = {}

export default function DashboardPage() {
  const router = useRouter()
  const [isDeactivated, setIsDeactivated] = useState(false)
  
  // Date Range State
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  const cacheKey = `${startDate}_${endDate}`
  const [stats, setStats] = useState<any>(statsCache[cacheKey] || null)
  const [team, setTeam] = useState<any[]>(teamCache[cacheKey] || [])
  const [loading, setLoading] = useState(!statsCache[cacheKey])

  // Sync state with cache when cacheKey changes
  useEffect(() => {
    setStats(statsCache[cacheKey] || null)
    setTeam(teamCache[cacheKey] || [])
    setLoading(!statsCache[cacheKey])
  }, [cacheKey])

  const load = async () => {
    if (!statsCache[cacheKey]) {
      setLoading(true)
    }
    setIsDeactivated(false)
    try {
      const params = new URLSearchParams({ startDate, endDate })
      const data = await fetchApi(`/api/v1/dashboard/stats?${params}`)
      setStats(data)
      statsCache[cacheKey] = data
      cacheTimestamps[cacheKey] = Date.now()

      if (data?.view === 'manager') {
        const teamData = await fetchApi('/api/v1/manager/team')
        setTeam(teamData)
        teamCache[cacheKey] = teamData
      }
    } catch (err: any) {
      if (err.message?.includes('deactivated')) {
        setIsDeactivated(true)
      } else {
        console.error('Stats load error:', err)
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    const isExpired = !statsCache[cacheKey] || (Date.now() - (cacheTimestamps[cacheKey] || 0) > 30000)
    if (isExpired) {
      load()
    }
  }, [cacheKey])

  const downloadReport = () => {
    const params = new URLSearchParams({ type: 'summary', from: startDate, to: endDate })
    window.open(`/api/v1/reports?${params}`, '_blank')
  }

  return (
    <AdminLayout>
      {isDeactivated && (
        <div className="mb-6 p-10 bg-red-50 border-2 border-red-200 rounded-3xl text-center shadow-xl shadow-red-50 animate-in fade-in zoom-in duration-300">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 shadow-inner">
            <AlertCircle size={48} />
          </div>
          <h2 className="text-3xl font-black text-red-900 mb-3 tracking-tight">Account Access Restricted</h2>
          <p className="text-red-700 max-w-md mx-auto text-lg leading-relaxed font-medium">
            Your account is currently inactive. Please contact your system administrator to reactivate your access.
          </p>
        </div>
      )}

      {!isDeactivated && (
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                {stats?.view === 'agent' ? 'Sales Performance' :
                 stats?.view === 'manager' ? 'Team Leadership' :
                 "Control Center"}
              </h1>
              <p className="text-gray-500 mt-1.5 font-medium">
                {stats?.view === 'agent' ? `Welcome back! Tracking your daily sales targets.` :
                 stats?.view === 'manager' ? 'Real-time oversight of your team pipeline.' :
                 "Global operations and system management insights."}
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-2.5 shadow-sm">
                <Calendar size={18} className="text-gray-400" />
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)}
                  className="text-sm font-bold outline-none bg-transparent"
                />
                <span className="text-gray-300 mx-1">—</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)}
                  className="text-sm font-bold outline-none bg-transparent"
                />
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={load}
                  className="p-3 text-gray-500 hover:bg-gray-100 rounded-2xl transition-all border border-transparent hover:border-gray-200"
                  title="Refresh Data"
                >
                  <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
                <button 
                  onClick={downloadReport}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-2xl text-sm font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 hover:scale-[1.02] active:scale-95"
                >
                  <DownloadCloud size={18} />
                  <span>Export Report</span>
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-3xl border border-gray-100 p-8 animate-pulse shadow-sm">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl mb-4" />
                  <div className="h-4 bg-gray-50 rounded-lg w-2/3 mb-3" />
                  <div className="h-10 bg-gray-50 rounded-xl w-1/2" />
                </div>
              ))}
            </div>
          ) : !stats ? (
            <div className="bg-white rounded-3xl border-2 border-red-50 border-dashed p-16 text-center text-red-500 mt-8">
              <AlertCircle size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold text-xl text-gray-400">Unable to synchronize dashboard statistics.</p>
              <button onClick={load} className="mt-4 text-sm font-bold text-red-600 hover:underline">Try Again</button>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Agent View */}
              {stats.view === 'agent' && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
                  <StatCard label="Leads Assigned" value={stats.my_leads} icon={Target} color="text-blue-600" bg="bg-blue-50" onClick={() => router.push('/leads')} />
                  <StatCard label="Fresh Today" value={stats.new_leads_today} icon={Plus} color="text-green-600" bg="bg-green-50" onClick={() => router.push('/leads')} />
                  <StatCard label="Pending Tasks" value={stats.pending_followups} icon={Clock} color="text-amber-600" bg="bg-amber-50" onClick={() => router.push('/follow-ups')} />
                  <StatCard label="Call Activity" value={stats.calls_today} icon={Phone} color="text-purple-600" bg="bg-purple-50" onClick={() => router.push('/crm')} />
                  <StatCard label="My Quotes" value={stats.my_quotations} icon={FileText} color="text-indigo-600" bg="bg-indigo-50" onClick={() => router.push('/quotations')} />
                </div>
              )}

              {/* Manager View */}
              {stats.view === 'manager' && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard label="Team Leads" value={stats.total_leads} icon={Users2} color="text-blue-600" bg="bg-blue-50" onClick={() => router.push('/leads')} />
                    <StatCard label="Conversions" value={stats.won_leads} icon={UserCheck} color="text-green-600" bg="bg-green-50" onClick={() => router.push('/leads')} />
                    <StatCard label="Open Followups" value={stats.pending_followups} icon={Clock} color="text-amber-600" bg="bg-amber-50" onClick={() => router.push('/follow-ups')} />
                    <StatCard label="Overdue Items" value={stats.overdue_followups} icon={AlertCircle} color="text-red-600" bg="bg-red-50" onClick={() => router.push('/follow-ups')} />
                  </div>
                  {stats.pipeline?.length > 0 && <PipelineBar pipeline={stats.pipeline} />}
                  {team.length > 0 && <TeamList team={team} />}
                </>
              )}

              {/* Admin View */}
              {stats.view === 'admin' && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard label="Leads Pipeline" value={stats.total_leads} icon={Target} color="text-blue-600" bg="bg-blue-50" onClick={() => router.push('/leads')} />
                    <StatCard label="New Arrivals" value={stats.new_leads_today} icon={Plus} color="text-green-600" bg="bg-green-50" onClick={() => router.push('/leads')} />
                    <StatCard label="Policies Active" value={stats.active_policies} icon={ShieldCheck} color="text-indigo-600" bg="bg-indigo-50" onClick={() => router.push('/policies')} />
                    <StatCard label="Total Staff" value={stats.total_employees} icon={Users2} color="text-violet-600" bg="bg-violet-50" onClick={() => router.push('/users')} />
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard label="Claims Filed" value={stats.active_claims} icon={Briefcase} color="text-red-600" bg="bg-red-50" onClick={() => router.push('/claims')} />
                    <StatCard label="Loans Processed" value={stats.active_loans} icon={BarChart2} color="text-cyan-600" bg="bg-cyan-50" onClick={() => router.push('/loans')} />
                    <StatCard label="RTO Tasks" value={stats.pending_rto} icon={Activity} color="text-orange-600" bg="bg-orange-50" onClick={() => router.push('/rto')} />
                    <StatCard label="Site Visits" value={stats.today_visits} icon={MapPin} color="text-teal-600" bg="bg-teal-50" onClick={() => router.push('/crm')} />
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </AdminLayout>
  )
}

function StatCard({ label, value, icon: Icon, color, bg, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-sm transition-all duration-300 group ${
        onClick ? 'cursor-pointer hover:shadow-xl hover:shadow-gray-100 hover:scale-[1.02] active:scale-[0.98]' : ''
      }`}
    >
      <div className={`w-10 h-10 md:w-12 md:h-12 ${bg} ${color} rounded-xl md:rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-5 h-5 md:w-6 md:h-6" />
      </div>
      <p className="text-[9px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl md:text-3xl font-black text-gray-900">{value || 0}</p>
    </div>
  )
}

function PipelineBar({ pipeline }: any) {
  return (
    <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-sm">
      <h3 className="text-base md:text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
        <TrendingUp className="text-red-600" size={20} />
        Sales Pipeline Distribution
      </h3>
      <div className="flex h-4 w-full rounded-full overflow-hidden bg-gray-100 shadow-inner mb-6">
        {pipeline.map((p: any, i: number) => (
          <div 
            key={p.status} 
            style={{ width: `${(p.count / pipeline.reduce((a:any, b:any) => a + b.count, 0)) * 100}%` }}
            className={`h-full transition-all duration-500 ${
              ['bg-blue-500', 'bg-purple-500', 'bg-indigo-500', 'bg-green-500', 'bg-amber-500', 'bg-red-500'][i % 6]
            }`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {pipeline.map((p: any) => (
          <div key={p.status} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm font-bold text-gray-600">{p.status}</span>
            <span className="text-sm font-black text-gray-900 ml-auto">{p.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TeamList({ team }: any) {
  return (
    <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-sm">
      <h3 className="text-base md:text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
        <Users2 className="text-blue-600" size={20} />
        Team Activity Oversight
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left border-b border-gray-50">
              <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest px-4">Agent Name</th>
              <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest px-4">Total Leads</th>
              <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest px-4">Calls</th>
              <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-widest px-4">Conversion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {team.map((agent: any) => (
              <tr key={agent.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-4 px-4 font-bold text-gray-800">{agent.name}</td>
                <td className="py-4 px-4 font-black text-gray-900">{agent.totalLeads || 0}</td>
                <td className="py-4 px-4 text-gray-600 font-medium">{agent.totalCalls || 0}</td>
                <td className="py-4 px-4">
                   <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                         <div 
                           className="h-full bg-green-500 rounded-full" 
                           style={{ width: agent.conversionRate }} 
                         />
                      </div>
                      <span className="text-xs font-bold text-green-600">{agent.conversionRate}</span>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
