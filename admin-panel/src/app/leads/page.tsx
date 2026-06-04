"use client"
import React, { useState, useEffect } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { 
  Search, Filter, Plus, ExternalLink, Upload, CheckCircle, 
  AlertCircle, Users, Calendar, RefreshCw, Phone, MessageCircle, 
  X, Check, UserPlus, Clock, Clipboard, FileText, ChevronRight
} from 'lucide-react'

// Premium WhatsApp Message Templates
const WHATSAPP_TEMPLATES = [
  {
    id: 'renewal',
    name: 'Standard Renewal Notice',
    text: (name: string, vehicle: string, expiry?: string) => 
      `Hi ${name},\n\nThis is a renewal reminder from *Torque Auto Advisor* regarding your vehicle *${vehicle}*. Your policy is scheduled to expire on *${expiry || 'N/A'}*.\n\nPlease share your current policy copy so we can calculate the best quotes for you!\n\nBest regards,\nTorque Team`
  },
  {
    id: 'callback',
    name: 'Out of Reach / Callback Request',
    text: (name: string, vehicle: string, expiry?: string) => 
      `Hi ${name},\n\nWe tried calling you regarding your vehicle *${vehicle}* renewal copy but couldn't get in touch. \n\nPlease let us know a suitable time to call you back, or share your details here!\n\nThanks,\nTorque Team`
  },
  {
    id: 'docs',
    name: 'Document Collection Request',
    text: (name: string, vehicle: string, expiry?: string) => 
      `Hi ${name},\n\nRegarding your auto insurance quote for vehicle *${vehicle}*, could you please share a photo/PDF of your:\n1. Previous Insurance Policy\n2. RC Book (Front & Back)\n\nThis will help us apply all applicable discounts (No Claim Bonus, etc.) for your new quote.\n\nThank you!`
  }
]

export default function LeadsPage() {
  const { user } = useAuth()
  const role = (user?.role?.name || 'EXECUTIVE').toUpperCase()
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const initialSearch = searchParams?.get('search') || ''

  const triggerNativeLink = (url: string) => {
    if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: 'open_url', url }));
    } else {
      window.location.href = url;
    }
  }

  const [leads, setLeads] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [employees, setEmployees] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState(initialSearch)
  const [importing, setImporting] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newLead, setNewLead] = useState({ clientName: '', clientPhone: '', vehicleNo: '', clientEmail: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    vehicleNo: '',
    registrationDate: '',
    expiryDate: '',
    gvw: '',
    existingAgent: '',
    city: '',
    address: ''
  })

  // Status Filter State (for active cards)
  const [statusFilter, setStatusFilter] = useState('all')

  // Date Range State
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Detailed Drawer State
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [detailedLead, setDetailedLead] = useState<any | null>(null)
  const [isDrawerLoading, setIsDrawerLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'call' | 'whatsapp'>('info')

  // Call Logger State
  const [logOutcome, setLogOutcome] = useState('Connected')
  const [logNotes, setLogNotes] = useState('')
  const [logFollowupDate, setLogFollowupDate] = useState('')
  const [isLogging, setIsLogging] = useState(false)

  // WhatsApp Template State
  const [selectedTemplateId, setSelectedTemplateId] = useState('renewal')
  const [copiedText, setCopiedText] = useState(false)

  // Follow-up Modal State
  const [showFollowupModal, setShowFollowupModal] = useState(false)
  const [followupData, setFollowupData] = useState({
    scheduled_at: '',
    type: 'call',
    notes: ''
  })
  const [isScheduling, setIsScheduling] = useState(false)

  useEffect(() => {
    fetchData()
  }, [startDate, endDate])

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      params.append('limit', '100')

      const [leadsData, statsData] = await Promise.all([
        fetchApi(`/api/v1/leads?${params}`),
        fetchApi(`/api/v1/leads/stats?${params}`)
      ])
      
      setLeads(leadsData.leads || [])
      setStats(statsData.summary || null)
    } catch (error) {
      console.error('Failed to fetch leads:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const data = await fetchApi('/api/v1/users?limit=100')
      setEmployees(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch employees list:', error)
    }
  }

  const fetchLeadDetails = async (id: string) => {
    setIsDrawerLoading(true)
    try {
      const data = await fetchApi(`/api/v1/leads/${id}`)
      setDetailedLead(data)
    } catch (error) {
      console.error('Failed to fetch lead details:', error)
    } finally {
      setIsDrawerLoading(false)
    }
  }

  const handleOpenDrawer = (leadId: string) => {
    setSelectedLeadId(leadId)
    fetchLeadDetails(leadId)
    setActiveTab('info')
  }

  const handleCloseDrawer = () => {
    setSelectedLeadId(null)
    setDetailedLead(null)
    setIsEditing(false)
  }

  const handleUpdateLeadStatus = async (newStatus: string) => {
    if (!detailedLead) return
    
    if (newStatus === 'Follow Up') {
      // Set default date to tomorrow at 10:00 AM
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const localString = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
        
      setFollowupData({
        scheduled_at: localString,
        type: 'call',
        notes: ''
      })
      setShowFollowupModal(true)
      return
    }

    try {
      const updated = await fetchApi(`/api/v1/leads/${detailedLead.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      })
      setDetailedLead({ ...detailedLead, status: updated.status })
      fetchData()
    } catch (error) {
      alert('Failed to update lead status')
    }
  }

  const handleScheduleFollowup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!detailedLead) return
    setIsScheduling(true)
    try {
      // 1. Create Follow-up in DB
      await fetchApi('/api/v1/follow-ups', {
        method: 'POST',
        body: JSON.stringify({
          lead_id: detailedLead.id,
          assigned_to: detailedLead.assignedTo || null,
          lead_name: detailedLead.clientName,
          type: followupData.type,
          scheduled_at: new Date(followupData.scheduled_at).toISOString(),
          notes: followupData.notes
        })
      })

      // 2. Update Lead Status in DB to 'Follow Up'
      const updated = await fetchApi(`/api/v1/leads/${detailedLead.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'Follow Up' })
      })
      setDetailedLead({ ...detailedLead, status: updated.status })
      
      // 3. Reset and Close Modal
      setShowFollowupModal(false)
      fetchData()
      alert('Follow-up scheduled successfully!')
    } catch (error: any) {
      alert(error.message || 'Failed to schedule follow-up')
    } finally {
      setIsScheduling(false)
    }
  }

  const handleUpdateLeadAssignee = async (newAssigneeId: string) => {
    if (!detailedLead) return
    try {
      const updated = await fetchApi(`/api/v1/leads/${detailedLead.id}`, {
        method: 'PUT',
        body: JSON.stringify({ 
          assigned_to: newAssigneeId === 'unassigned' ? null : newAssigneeId 
        })
      })
      // Sync detailed display
      fetchLeadDetails(detailedLead.id)
      fetchData()
    } catch (error) {
      alert('Failed to update lead assignee')
    }
  }

  const handleStartEdit = () => {
    if (!detailedLead) return
    setEditForm({
      clientName: detailedLead.clientName || '',
      clientPhone: detailedLead.clientPhone || '',
      clientEmail: detailedLead.clientEmail || '',
      vehicleNo: detailedLead.vehicleNo || '',
      registrationDate: detailedLead.registrationDate ? new Date(detailedLead.registrationDate).toISOString().split('T')[0] : '',
      expiryDate: detailedLead.expiryDate ? new Date(detailedLead.expiryDate).toISOString().split('T')[0] : '',
      gvw: detailedLead.gvw || '',
      existingAgent: detailedLead.existingAgent || '',
      city: detailedLead.city || '',
      address: detailedLead.address || ''
    })
    setIsEditing(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!detailedLead) return
    setIsSubmitting(true)
    try {
      const res = await fetchApi(`/api/v1/leads/${detailedLead.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm)
      })
      if (res) {
        setIsEditing(false)
        fetchLeadDetails(detailedLead.id)
        fetchData()
        alert('Lead details updated successfully!')
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update lead')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogCallResponse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!detailedLead) return
    setIsLogging(true)
    try {
      const body = {
        status: logOutcome,
        notes: logNotes,
        followupDate: logFollowupDate || undefined
      }
      await fetchApi(`/api/v1/leads/${detailedLead.id}/response`, {
        method: 'POST',
        body: JSON.stringify(body)
      })
      
      // Reset logging states
      setLogNotes('')
      setLogFollowupDate('')
      
      // Reload timeline and details
      fetchLeadDetails(detailedLead.id)
      fetchData()
    } catch (error: any) {
      alert(error.message || 'Failed to log communication log')
    } finally {
      setIsLogging(false)
    }
  }

  const handleCopyTemplate = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(true)
    setTimeout(() => setCopiedText(false), 2000)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const result = await fetchApi('/api/v1/leads/import', {
        method: 'POST',
        body: formData,
      })
      alert(`Import Summary:\n- Total Rows: ${result.stats.total}\n- Imported: ${result.stats.assignedCount}\n- Errors: ${result.stats.errors}\n- Duplicates: ${result.stats.duplicates}`)
      fetchData()
    } catch (err: any) {
      alert(err.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await fetchApi('/api/v1/leads', {
        method: 'POST',
        body: JSON.stringify(newLead)
      })
      setShowAddModal(false)
      setNewLead({ clientName: '', clientPhone: '', vehicleNo: '', clientEmail: '' })
      fetchData()
    } catch (err: any) {
      alert(err.message || 'Failed to add lead')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter Leads based on Search Query AND summaries card selection
  const filteredLeads = leads.filter(l => {
    const searchMatch = 
      l.clientName?.toLowerCase().includes(search.toLowerCase()) ||
      l.vehicleNo?.toLowerCase().includes(search.toLowerCase()) ||
      l.clientPhone?.includes(search)

    if (!searchMatch) return false

    // Apply Active Card Filters
    if (statusFilter === 'all') return true
    if (statusFilter === 'assigned') return l.assignedTo !== null
    return l.status?.toUpperCase() === statusFilter.toUpperCase()
  })

  // Get selected WhatsApp template text
  const getWhatsAppText = () => {
    if (!detailedLead) return ''
    const template = WHATSAPP_TEMPLATES.find(t => t.id === selectedTemplateId)
    if (!template) return ''
    
    const formattedExpiry = detailedLead.expiryDate 
      ? new Date(detailedLead.expiryDate).toLocaleDateString()
      : 'N/A'
      
    if (template.id === 'renewal') {
      return template.text(detailedLead.clientName, detailedLead.vehicleNo || 'Vehicle', formattedExpiry)
    }
    return template.text(detailedLead.clientName, detailedLead.vehicleNo || 'Vehicle')
  }

  return (
    <AdminLayout>
      {/* Top action block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Lead Management</h1>
          <p className="text-sm text-slate-500 mt-1">Track monthly renewals and employee performance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input type="file" id="csv-import" className="hidden" accept=".csv,.xlsx" onChange={handleImport} />
          <label htmlFor="csv-import" className="cursor-pointer px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm">
            <Upload size={14} />
            {importing ? 'Importing...' : 'Import Leads'}
          </label>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all shadow-md"
          >
            <Plus size={16} />
            New Lead
          </button>
        </div>
      </div>

      {/* Summary Cards with click filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
        <StatCard 
          title="Total Leads" 
          value={stats?.total || 0} 
          icon={<Users className="text-blue-600" />} 
          color="bg-white hover:bg-blue-50/20" 
          isActive={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        <StatCard 
          title="Assigned" 
          value={stats?.assigned || 0} 
          icon={<CheckCircle className="text-emerald-600" />} 
          color="bg-white hover:bg-emerald-50/20" 
          isActive={statusFilter === 'assigned'}
          onClick={() => setStatusFilter('assigned')}
        />
        <StatCard 
          title="Converted" 
          value={stats?.converted || 0} 
          icon={<CheckCircle className="text-purple-600" />} 
          color="bg-white hover:bg-purple-50/20" 
          isActive={statusFilter === 'Converted'}
          onClick={() => setStatusFilter('Converted')}
        />
        <StatCard 
          title="Followups" 
          value={stats?.followups || 0} 
          icon={<AlertCircle className="text-amber-600" />} 
          color="bg-white hover:bg-amber-50/20" 
          isActive={statusFilter === 'Follow Up'}
          onClick={() => setStatusFilter('Follow Up')}
        />
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mt-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search by name, phone or vehicle number..." 
            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-10 pr-4 text-xs outline-none focus:ring-2 focus:ring-slate-200 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Date Range Picker */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
          <Calendar size={14} className="text-slate-400" />
          <input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)}
            className="text-[10px] font-bold outline-none bg-transparent w-24 text-slate-600"
          />
          <span className="text-slate-300 text-xs">—</span>
          <input 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)}
            className="text-[10px] font-bold outline-none bg-transparent w-24 text-slate-600"
          />
          {(startDate || endDate) && (
            <button onClick={() => {setStartDate(''); setEndDate('')}} className="text-slate-400 hover:text-rose-500 ml-1">
              <RefreshCw size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Vehicle & Owner</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Assigned To</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Created</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-semibold">Loading leads...</td></tr>
              ) : filteredLeads.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-medium">No leads found in this period.</td></tr>
              ) : filteredLeads.map((lead) => (
                <tr 
                  key={lead.id} 
                  onClick={() => handleOpenDrawer(lead.id)}
                  className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${
                    selectedLeadId === lead.id ? 'bg-slate-50' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{lead.clientName}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{lead.vehicleNo || 'Unknown vehicle'}</div>
                      </div>
                      <div className="flex items-center gap-2 ml-2" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (lead.clientPhone) {
                              triggerNativeLink(`tel:${lead.clientPhone}`);
                            }
                          }}
                          className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all shadow-sm flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
                          title="Call now"
                        >
                          <Phone size={16} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (lead.clientPhone) {
                              triggerNativeLink(`https://api.whatsapp.com/send?phone=91${lead.clientPhone}`);
                            }
                          }}
                          className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all shadow-sm flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95"
                          title="WhatsApp message"
                        >
                          <MessageCircle size={16} />
                        </button>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                      lead.status?.toUpperCase() === 'CONVERTED' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                      lead.status?.toUpperCase() === 'FOLLOW UP' ? 'bg-amber-50 border-amber-200 text-amber-600' :
                      lead.status?.toUpperCase() === 'IN PROGRESS' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' :
                      lead.status?.toUpperCase() === 'LOST' ? 'bg-rose-50 border-rose-200 text-rose-600' :
                      'bg-slate-100 border-slate-200 text-slate-500'
                    }`}>
                      {lead.status || 'New'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-extrabold text-slate-600">
                        {lead.assignee?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <span className="text-xs font-semibold text-slate-600">{lead.assignee?.fullName || 'Unassigned'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-400">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => handleOpenDrawer(lead.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-out Drawer Panel */}
      {selectedLeadId && (
        <>
          {/* Backdrop */}
          <div 
            onClick={handleCloseDrawer}
            className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-40 transition-opacity"
          />

          {/* Drawer content */}
          <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-white border-l border-slate-100 shadow-2xl z-50 flex flex-col transition-all duration-300">
            {isDrawerLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Loading details...</p>
              </div>
            ) : detailedLead ? (
              <>
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{detailedLead.clientName}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 bg-slate-900 text-white rounded font-mono text-[9px] uppercase font-bold tracking-wider">
                        {detailedLead.vehicleNo || 'NO PLATE'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">{detailedLead.city || 'Out of City'}</span>
                    </div>
                  </div>
                  <button 
                    onClick={handleCloseDrawer}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Tabs */}
                <div className="px-6 border-b border-slate-100 flex gap-4 text-xs font-bold bg-white">
                  <button 
                    onClick={() => setActiveTab('info')}
                    className={`py-3.5 border-b-2 transition-all uppercase tracking-wider ${
                      activeTab === 'info' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Overview
                  </button>
                  <button 
                    onClick={() => setActiveTab('call')}
                    className={`py-3.5 border-b-2 transition-all uppercase tracking-wider ${
                      activeTab === 'call' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Log Activity ({detailedLead.calls?.length || 0})
                  </button>
                  <button 
                    onClick={() => setActiveTab('whatsapp')}
                    className={`py-3.5 border-b-2 transition-all uppercase tracking-wider ${
                      activeTab === 'whatsapp' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    WhatsApp Templates
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* TAB 1: OVERVIEW */}
                  {activeTab === 'info' && (
                    <div className="space-y-6">
                      {isEditing ? (
                        <form onSubmit={handleSaveEdit} className="space-y-4">
                          <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Client Name *</label>
                            <input 
                              type="text" required
                              value={editForm.clientName}
                              onChange={e => setEditForm({ ...editForm, clientName: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-slate-100"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Client Phone</label>
                              <input 
                                type="text"
                                value={editForm.clientPhone}
                                onChange={e => setEditForm({ ...editForm, clientPhone: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-slate-100"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Client Email</label>
                              <input 
                                type="email"
                                value={editForm.clientEmail}
                                onChange={e => setEditForm({ ...editForm, clientEmail: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-slate-100"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Vehicle No</label>
                              <input 
                                type="text"
                                value={editForm.vehicleNo}
                                onChange={e => setEditForm({ ...editForm, vehicleNo: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-slate-100"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">GVW</label>
                              <input 
                                type="text"
                                value={editForm.gvw}
                                onChange={e => setEditForm({ ...editForm, gvw: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-slate-100"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Registration Date</label>
                              <input 
                                type="date"
                                value={editForm.registrationDate}
                                onChange={e => setEditForm({ ...editForm, registrationDate: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-slate-100"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Expiry Date</label>
                              <input 
                                type="date"
                                value={editForm.expiryDate}
                                onChange={e => setEditForm({ ...editForm, expiryDate: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs outline-none focus:ring-2 focus:ring-slate-100"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">City</label>
                              <input 
                                type="text"
                                value={editForm.city}
                                onChange={e => setEditForm({ ...editForm, city: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-slate-100"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Existing Agent</label>
                              <input 
                                type="text"
                                value={editForm.existingAgent}
                                onChange={e => setEditForm({ ...editForm, existingAgent: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-slate-100"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Address</label>
                            <textarea 
                              value={editForm.address}
                              onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                              rows={2}
                              className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-slate-100 resize-none"
                            />
                          </div>

                          <div className="flex gap-3 pt-2">
                            <button 
                              type="button"
                              onClick={() => setIsEditing(false)}
                              className="flex-1 py-3 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                            >
                              Cancel
                            </button>
                            <button 
                              type="submit"
                              disabled={isSubmitting}
                              className="flex-1 py-3 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold uppercase transition-all disabled:opacity-50"
                            >
                              {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          {/* Lead Status Card Controls */}
                          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Configure lead status</label>
                            <select 
                              value={detailedLead.status || 'New'}
                              onChange={e => handleUpdateLeadStatus(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-100"
                            >
                              <option value="New">New Lead</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Follow Up">Follow Up Needed</option>
                              <option value="Converted">Converted Account</option>
                              <option value="Lost">Lost Opportunity</option>
                            </select>
                          </div>

                          {/* Lead Assignee Card Controls */}
                          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Assign to auto advisor</label>
                            <select 
                              value={detailedLead.assignedTo || 'unassigned'}
                              onChange={e => handleUpdateLeadAssignee(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-100"
                            >
                              <option value="unassigned">Unassigned (Leave Open)</option>
                              {employees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.role?.name})</option>
                              ))}
                            </select>
                          </div>

                          {/* Client Card details */}
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Metadata sheet</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <DetailItem label="Client Phone" value={detailedLead.clientPhone || 'N/A'} isCopyable />
                              <DetailItem label="Client Email" value={detailedLead.clientEmail || 'N/A'} />
                              <DetailItem label="Gross Vehicle Weight (GVW)" value={detailedLead.gvw || 'N/A'} />
                              <DetailItem label="City Location" value={detailedLead.city || 'N/A'} />
                              <DetailItem label="Policy Expiry Date" value={detailedLead.expiryDate ? new Date(detailedLead.expiryDate).toLocaleDateString() : 'N/A'} />
                              <DetailItem label="Created On" value={new Date(detailedLead.createdAt).toLocaleDateString()} />
                            </div>
                          </div>

                          {/* Edit button */}
                          {role !== 'EXECUTIVE' && role !== 'VIEWER' && (
                            <button
                              onClick={handleStartEdit}
                              className="w-full py-2.5 mt-2 bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all uppercase tracking-wider"
                            >
                              Edit Lead Details
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* TAB 2: CALL LOG TIMELINE HISTORY */}
                  {activeTab === 'call' && (
                    <div className="space-y-6">
                      {/* Log form */}
                      <form onSubmit={handleLogCallResponse} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
                        <h5 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Log outbound calling interaction</h5>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Call Outcome</label>
                            <select 
                              value={logOutcome}
                              onChange={e => setLogOutcome(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800 outline-none"
                            >
                              <option value="Connected">Connected</option>
                              <option value="In Progress">Busy / Calling</option>
                              <option value="Follow Up">Callback Requested</option>
                              <option value="Lost">Failed / Switched Off</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Followup Date (Optional)</label>
                            <input 
                              type="date"
                              value={logFollowupDate}
                              onChange={e => setLogFollowupDate(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-xl p-1.5 text-xs text-slate-800 outline-none"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Conversation Notes / Brief</label>
                          <textarea 
                            required
                            placeholder="Add brief details about renewal conversion or client constraints..."
                            rows={3}
                            value={logNotes}
                            onChange={e => setLogNotes(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none resize-none"
                          />
                        </div>
                        <button 
                          type="submit"
                          disabled={isLogging}
                          className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold uppercase transition-all disabled:opacity-50"
                        >
                          <Phone size={14} /> {isLogging ? 'Logging...' : 'Log Response'}
                        </button>
                      </form>

                      {/* Log Timeline */}
                      <div className="space-y-4">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chronological Call Logs History</h5>
                        {detailedLead.calls && detailedLead.calls.length > 0 ? (
                          <div className="space-y-4 border-l border-slate-100 pl-4 ml-2">
                            {detailedLead.calls.map((c: any) => (
                              <div key={c.id} className="relative space-y-1">
                                <div className="absolute -left-6.5 top-0.5 bg-slate-900 border-4 border-white rounded-full w-4 h-4" />
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                                    c.outcome === 'Connected' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                                    c.outcome === 'Follow Up' ? 'bg-amber-50 border-amber-200 text-amber-600' :
                                    'bg-rose-50 border-rose-200 text-rose-600'
                                  }`}>
                                    {c.outcome}
                                  </span>
                                  <span className="text-slate-400 font-medium">{new Date(c.createdAt).toLocaleString()}</span>
                                </div>
                                <p className="text-xs text-slate-700 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">{c.notes || 'No description notes added.'}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No communication logs recorded yet.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: WHATSAPP TEMPLATES REDIRECT */}
                  {activeTab === 'whatsapp' && (
                    <div className="space-y-6">
                      {/* Template Selector */}
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Choose messaging script template</label>
                        <select 
                          value={selectedTemplateId}
                          onChange={e => setSelectedTemplateId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs font-bold text-slate-800 outline-none"
                        >
                          {WHATSAPP_TEMPLATES.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Message Live Preview Card */}
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 relative">
                        <label className="absolute right-4 top-4 text-[9px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded uppercase">Preview</label>
                        <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Compiled Text</h6>
                        <pre className="text-xs font-mono text-slate-700 bg-white p-3 rounded-xl border border-slate-100 whitespace-pre-wrap leading-relaxed shadow-sm">
                          {getWhatsAppText()}
                        </pre>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2.5">
                        <button 
                          onClick={() => handleCopyTemplate(getWhatsAppText())}
                          className="flex-1 flex items-center justify-center gap-2 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all"
                        >
                          <Clipboard size={14} />
                          {copiedText ? 'Copied!' : 'Copy Script'}
                        </button>
                        <button 
                          onClick={() => {
                            if (detailedLead.clientPhone) {
                              triggerNativeLink(`https://api.whatsapp.com/send?phone=91${detailedLead.clientPhone}&text=${encodeURIComponent(getWhatsAppText())}`);
                            }
                          }}
                          className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                        >
                          <MessageCircle size={14} />
                          Open WhatsApp
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </>
      )}

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl border border-slate-100 transition-all duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-900">Add New Lead</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddLead} className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Owner Name *</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none" value={newLead.clientName} onChange={e => setNewLead({...newLead, clientName: e.target.value})} placeholder="e.g. Rahul Sharma" />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Phone Number *</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none" value={newLead.clientPhone} onChange={e => setNewLead({...newLead, clientPhone: e.target.value})} placeholder="e.g. +919876543210" />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Vehicle Number *</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none" value={newLead.vehicleNo} onChange={e => setNewLead({...newLead, vehicleNo: e.target.value})} placeholder="e.g. MH-12-AB-1234" />
              </div>
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Email (Optional)</label>
                <input type="email" className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none" value={newLead.clientEmail} onChange={e => setNewLead({...newLead, clientEmail: e.target.value})} placeholder="e.g. rahul@gmail.com" />
              </div>
              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold font-sans">Cancel</button>
                <button disabled={isSubmitting} type="submit" className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg">
                  {isSubmitting ? 'Saving...' : 'Save Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Follow-up Modal */}
      {showFollowupModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4 font-sans">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">Schedule Follow-up</h2>
                <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">Lead: {detailedLead?.clientName}</p>
              </div>
              <button 
                onClick={() => setShowFollowupModal(false)} 
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-all"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleScheduleFollowup} className="space-y-4">
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Scheduled Date & Time *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    required 
                    type="datetime-local" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 pl-10 text-xs outline-none focus:ring-2 focus:ring-slate-100" 
                    value={followupData.scheduled_at} 
                    onChange={e => setFollowupData({...followupData, scheduled_at: e.target.value})} 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Contact Channel *</label>
                <select 
                  required 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-slate-100 font-bold text-slate-700"
                  value={followupData.type} 
                  onChange={e => setFollowupData({...followupData, type: e.target.value})}
                >
                  <option value="call">📞 Phone Call</option>
                  <option value="whatsapp">💬 WhatsApp Message</option>
                  <option value="visit">🏠 Customer Site Visit</option>
                </select>
              </div>
              
              <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Follow-up Notes / Instructions</label>
                <textarea 
                  placeholder="What is the context of this callback? (e.g. 'Customer asked to call back after 4 PM regarding commercial vehicle premium copy.')" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs outline-none resize-none" 
                  rows={3}
                  value={followupData.notes} 
                  onChange={e => setFollowupData({...followupData, notes: e.target.value})} 
                />
              </div>
              
              <div className="flex gap-3 mt-8">
                <button 
                  type="button" 
                  onClick={() => setShowFollowupModal(false)} 
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  disabled={isScheduling} 
                  type="submit" 
                  className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-black transition-all"
                >
                  {isScheduling ? 'Scheduling...' : 'Confirm Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

function StatCard({ title, value, icon, color, isActive, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className={`p-6 rounded-2xl border transition-all duration-200 cursor-pointer ${color} ${
        isActive 
          ? 'border-slate-900 ring-2 ring-slate-100 shadow-md transform scale-[1.01]' 
          : 'border-slate-100 shadow-sm hover:shadow'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</p>
          <p className="text-3xl font-black text-slate-900 mt-1">{value}</p>
        </div>
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl shadow-inner">
          {icon}
        </div>
      </div>
    </div>
  )
}

function DetailItem({ label, value, isCopyable }: { label: string; value: string; isCopyable?: boolean }) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 relative group">
      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <span className="block text-xs font-bold text-slate-700 mt-1 truncate">{value}</span>
      {isCopyable && value !== 'N/A' && (
        <button 
          onClick={handleCopy}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded transition-all text-[8px] font-bold"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      )}
    </div>
  )
}
