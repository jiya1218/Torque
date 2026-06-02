"use client"
import React, { useEffect, useState } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import { FileText, Plus, Share2, Download, Search, MessageCircle, X } from 'lucide-react'

export default function QuotationsPage() {
  const [quotes, setQuotes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [leads, setLeads] = useState<any[]>([])
  const [newQuote, setNewQuote] = useState({
    lead_id: '',
    amount: '',
    details: { coverage: 'Standard', notes: '' }
  })

  useEffect(() => {
    fetchQuotes()
    fetchLeads()
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

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fetchApi('/api/v1/quotations', {
        method: 'POST',
        body: JSON.stringify({
          ...newQuote,
          amount: parseFloat(newQuote.amount)
        })
      })
      setIsModalOpen(false)
      fetchQuotes()
      alert('Quotation created successfully!')
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
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-md"
        >
          <Plus size={18} />
          New Quotation
        </button>
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
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Lead / Agent</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Amount</th>
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
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                    By {quote.creator?.fullName || 'System'}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-gray-900">₹{parseFloat(quote.amount).toLocaleString()}</td>
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
                      onClick={() => window.open(`/api/v1/quotations/${quote.id}/pdf`, '_blank')}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
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
              <h3 className="font-bold text-gray-900">New Quotation</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-all">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreateQuote} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Lead</label>
                <select required value={newQuote.lead_id} onChange={e => setNewQuote({...newQuote, lead_id: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Choose a lead...</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.clientName} ({l.vehicleNo})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Quote Amount (INR)</label>
                <input required type="number" value={newQuote.amount} onChange={e => setNewQuote({...newQuote, amount: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="Enter amount" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Coverage Details</label>
                <select value={newQuote.details.coverage} onChange={e => setNewQuote({...newQuote, details: {...newQuote.details, coverage: e.target.value}})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none">
                  <option>Standard</option>
                  <option>Comprehensive</option>
                  <option>Third Party Only</option>
                </select>
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg mt-2">
                Generate Quote
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
