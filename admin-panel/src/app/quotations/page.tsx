"use client"
import React, { useEffect, useState } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { FileText, Plus, Share2, Download, Search, MessageCircle, X, AlertCircle } from 'lucide-react'

export default function QuotationsPage() {
  const { user } = useAuth()
  const [quotes, setQuotes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [leads, setLeads] = useState<any[]>([])
  
  // Rate Calculator lists
  const [companies, setCompanies] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  
  // Form State
  const [newQuote, setNewQuote] = useState({
    lead_id: '',
    details: { coverage: 'Standard', notes: '' }
  })

  // Calculation State
  const [calcData, setCalcData] = useState({
    companyId: '',
    categoryId: '',
    netPremium: '',
    totalPremium: '',
    percentage: 0,
    profit: 0,
    rate: '',
    benefit: ''
  })

  const roleUpper = user?.role?.name?.toUpperCase() || ''
  const isAdmin = roleUpper === 'SUPER ADMIN' || roleUpper === 'ADMIN'

  useEffect(() => {
    fetchQuotes()
    fetchLeads()
    fetchCalculatorConfig()
  }, [])

  const fetchQuotes = async () => {
    setIsLoading(true)
    try {
      const data = await fetchApi('/api/v1/quotations')
      setQuotes(data)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchLeads = async () => {
    try {
      const data = await fetchApi('/api/v1/leads?limit=100')
      setLeads(data.leads || [])
    } catch {}
  }

  const fetchCalculatorConfig = async () => {
    try {
      const [compRes, catRes] = await Promise.all([
        fetchApi('/api/v1/rates/companies'),
        fetchApi('/api/v1/rates/categories')
      ])
      setCompanies(compRes)
      setCategories(catRes)
    } catch (err) {
      console.error('Failed to load companies/categories:', err)
    }
  }

  // Lookup relationship percentage and profit
  useEffect(() => {
    const lookupRelation = async () => {
      if (calcData.companyId && calcData.categoryId) {
        try {
          const res = await fetchApi(`/api/v1/rates/relationships/lookup?companyId=${calcData.companyId}&categoryId=${calcData.categoryId}`)
          setCalcData(prev => ({
            ...prev,
            percentage: res.qtr_percentage || 0,
            profit: res.qtr_profit || 0
          }))
        } catch (err) {
          console.error(err)
        }
      } else {
        setCalcData(prev => ({
          ...prev,
          percentage: 0,
          profit: 0
        }))
      }
    }
    lookupRelation()
  }, [calcData.companyId, calcData.categoryId])

  // Live calculation of rate and benefit
  useEffect(() => {
    const net = parseFloat(calcData.netPremium) || 0
    const total = parseFloat(calcData.totalPremium) || 0
    const pct = calcData.percentage || 0
    const prof = calcData.profit || 0

    if (pct > 0 && prof > 0 && net > 0 && total > 0) {
      const computedRate = Math.round(total - (net * (pct / 100)) + prof)
      const computedBenefit = Math.round(total - computedRate)
      setCalcData(prev => ({
        ...prev,
        rate: String(computedRate),
        benefit: String(computedBenefit)
      }))
    } else {
      setCalcData(prev => ({
        ...prev,
        rate: '',
        benefit: ''
      }))
    }
  }, [calcData.netPremium, calcData.totalPremium, calcData.percentage, calcData.profit])

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!calcData.rate) {
      alert('Incomplete calculator inputs or invalid rate configurations.')
      return
    }
    try {
      const selectedCompany = companies.find(c => c.id === calcData.companyId)
      const selectedCategory = categories.find(c => c.id === calcData.categoryId)

      await fetchApi('/api/v1/quotations', {
        method: 'POST',
        body: JSON.stringify({
          lead_id: newQuote.lead_id,
          rate: parseFloat(calcData.rate),
          benefit: parseFloat(calcData.benefit),
          companyId: calcData.companyId,
          categoryId: calcData.categoryId,
          netPremium: parseFloat(calcData.netPremium),
          totalPremium: parseFloat(calcData.totalPremium),
          percentage: calcData.percentage,
          profit: calcData.profit,
          details: {
            ...newQuote.details,
            companyName: selectedCompany?.name,
            categoryName: selectedCategory?.name,
            netPremium: parseFloat(calcData.netPremium),
            totalPremium: parseFloat(calcData.totalPremium),
            percentage: calcData.percentage,
            profit: calcData.profit,
            rate: parseFloat(calcData.rate),
            benefit: parseFloat(calcData.benefit)
          }
        })
      })
      setIsModalOpen(false)
      setCalcData({
        companyId: '',
        categoryId: '',
        netPremium: '',
        totalPremium: '',
        percentage: 0,
        profit: 0,
        rate: '',
        benefit: ''
      })
      fetchQuotes()
      alert('Quotation generated successfully!')
    } catch (error: any) {
      alert(error.message || 'Failed to create quotation')
    }
  }

  const handleShare = async (id: string) => {
    try {
      const { shareUrl } = await fetchApi(`/api/v1/quotations/${id}/share`, { method: 'POST' })
      await navigator.clipboard.writeText(shareUrl)
      alert('Share link copied to clipboard!')
      const waUrl = `https://wa.me/?text=${encodeURIComponent('Here is your insurance quotation: ' + shareUrl)}`
      
      if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
        (window as any).ReactNativeWebView.postMessage(JSON.stringify({ type: 'open_url', url: waUrl }));
      } else {
        window.open(waUrl, '_blank')
      }
    } catch (error: any) {
      alert(error.message || 'Failed to share quotation')
    }
  }

  const handleDownloadPdf = async (quoteId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || ''
      const res = await fetch(`/api/v1/quotations/${quoteId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!res.ok) {
        throw new Error('Failed to download PDF')
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `quotation_${quoteId.slice(0, 8)}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error('Download error:', error)
      alert(error.message || 'Failed to download PDF')
    }
  }

  const handleApprove = async (id: string, approve: boolean) => {
    try {
      await fetchApi(`/api/v1/quotations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: approve ? 'Approved' : 'Rejected' })
      })
      fetchQuotes()
      alert(approve ? 'Quotation approved!' : 'Quotation rejected.')
    } catch (error: any) {
      alert(error.message || 'Failed to update quotation')
    }
  }

  const filteredQuotes = quotes.filter(q => 
    q.lead?.clientName?.toLowerCase().includes(search.toLowerCase()) ||
    q.id.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AdminLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
          <p className="text-sm text-gray-500 mt-1">Generate and manage insurance quotes for your leads.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-md"
          >
            <Plus size={18} />
            New Quotation
          </button>
        )}
      </div>

      <div className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Recent Quotations</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or ID..." 
              className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">ID / Date</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Lead / Product Details</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Calculated Rate</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={5} className="p-10 text-center text-gray-400">Loading...</td></tr>
            ) : filteredQuotes.length === 0 ? (
              <tr><td colSpan={5} className="p-10 text-center text-gray-400 italic">No quotations found.</td></tr>
            ) : filteredQuotes.map((quote) => (
              <tr key={quote.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="text-sm font-bold text-gray-900">#{quote.id.slice(0, 8)}</div>
                  <div className="text-[10px] text-gray-400">{new Date(quote.createdAt).toLocaleDateString()}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-bold text-gray-700">{quote.lead?.clientName || 'N/A'}</div>
                  <div className="text-[10px] text-gray-400 flex items-center gap-1">
                    By {quote.creator?.fullName || 'System'}
                  </div>
                  {quote.company?.name && (
                    <div className="text-[9px] text-blue-600 font-extrabold uppercase mt-1">
                      {quote.company.name} · {quote.category?.name || 'Insurance'}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {quote.rate !== null && quote.rate !== undefined ? (
                    <div>
                      <div className="text-sm font-bold text-gray-900">₹{parseFloat(quote.rate).toLocaleString()}</div>
                      <div className="text-[9px] text-emerald-600 font-extrabold uppercase mt-0.5">
                        Benefit: ₹{parseFloat(quote.benefit || 0).toLocaleString()}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm font-bold text-gray-900">₹{parseFloat(quote.amount).toLocaleString()}</div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                    quote.status === 'Approved' ? 'bg-green-50 text-green-700' : 
                    quote.status === 'Approval Pending' ? 'bg-amber-50 text-amber-700' :
                    quote.status === 'Rejected' ? 'bg-red-50 text-red-700' :
                    'bg-blue-50 text-blue-700'
                  }`}>
                    {quote.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {quote.status === 'Approval Pending' && (
                      <div className="flex gap-1 mr-2 border-r pr-2 border-gray-100">
                        <button 
                          onClick={() => handleApprove(quote.id, true)}
                          className="px-3 py-1 bg-green-600 text-white text-[10px] font-bold rounded-lg hover:bg-green-700 transition-all"
                        >Approve</button>
                        <button 
                          onClick={() => handleApprove(quote.id, false)}
                          className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded-lg hover:bg-red-100 transition-all"
                        >Reject</button>
                      </div>
                    )}
                    <button 
                      onClick={() => handleShare(quote.id)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                      title="WhatsApp Share"
                    >
                      <MessageCircle size={18} />
                    </button>
                    <button 
                      onClick={() => handleDownloadPdf(quote.id)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Download PDF"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900">New Quotation Rate Calculator</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-all">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreateQuote} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Lead *</label>
                <select required value={newQuote.lead_id} onChange={e => setNewQuote({...newQuote, lead_id: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Choose a lead...</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.clientName} ({l.vehicleNo})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Company *</label>
                  <select required value={calcData.companyId} onChange={e => setCalcData({...calcData, companyId: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs">
                    <option value="">Select Company</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category *</label>
                  <select required value={calcData.categoryId} onChange={e => setCalcData({...calcData, categoryId: e.target.value})}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs">
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {calcData.companyId && calcData.categoryId && calcData.percentage === 0 && calcData.profit === 0 && (
                <div className="bg-amber-50 border border-amber-100 p-3 rounded-2xl flex items-start gap-2 text-[10px] text-amber-700 font-bold leading-relaxed animate-pulse">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>No active rate rule configured for this Company + Category. Calculated values will fallback to defaults.</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-3 border border-slate-100 rounded-2xl">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Percentage Rule</label>
                  <input type="text" readOnly value={`${calcData.percentage}%`} className="w-full px-3 py-2 bg-slate-150 rounded-xl outline-none text-xs font-bold text-slate-700 border-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Profit Rule</label>
                  <input type="text" readOnly value={`₹${calcData.profit}`} className="w-full px-3 py-2 bg-slate-150 rounded-xl outline-none text-xs font-bold text-slate-700 border-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Net Premium (₹) *</label>
                  <input required type="number" min="0" value={calcData.netPremium} onChange={e => setCalcData({...calcData, netPremium: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs" placeholder="e.g. 30000" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Total Premium (₹) *</label>
                  <input required type="number" min="0" value={calcData.totalPremium} onChange={e => setCalcData({...calcData, totalPremium: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs" placeholder="e.g. 34000" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-900 text-white p-4 rounded-2xl shadow-inner">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Computed Rate</label>
                  <input type="text" readOnly placeholder="--" value={calcData.rate ? `₹${parseInt(calcData.rate).toLocaleString()}` : ''} className="w-full px-3 py-2 bg-emerald-600 text-white border-none rounded-xl outline-none text-xs font-black" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Agent Benefit</label>
                  <input type="text" readOnly placeholder="--" value={calcData.benefit ? `₹${parseInt(calcData.benefit).toLocaleString()}` : ''} className="w-full px-3 py-2 bg-blue-600 text-white border-none rounded-xl outline-none text-xs font-black" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Coverage Details</label>
                <select value={newQuote.details.coverage} onChange={e => setNewQuote({...newQuote, details: {...newQuote.details, coverage: e.target.value}})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-xs">
                  <option>Standard</option>
                  <option>Comprehensive</option>
                  <option>Third Party Only</option>
                </select>
              </div>

              <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg mt-2">
                Generate Quotation
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
