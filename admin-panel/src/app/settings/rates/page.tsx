'use client'
import React, { useState, useEffect } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { useAuth } from '@/context/AuthContext'
import { useApi } from '@/hooks/useApi'
import { Plus, Edit2, Trash2, ShieldAlert, Sparkles, Building, Folder, ListCollapse, Save, X, RefreshCw } from 'lucide-react'

export default function RatesSettingsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const apiFetch = useApi()
  const [activeTab, setActiveTab] = useState<'rules' | 'companies' | 'categories'>('rules')
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Form States
  const [companyName, setCompanyName] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [ruleForm, setRuleForm] = useState({
    id: '',
    companyId: '',
    categoryId: '',
    percentage: '',
    profit: '',
    status: '1'
  })

  // Edit target states
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const roleUpper = user?.role?.name?.toUpperCase() || ''
  const isAdmin = roleUpper === 'SUPER ADMIN' || roleUpper === 'ADMIN'

  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      loadAllData()
    }
  }, [authLoading, user])

  const loadAllData = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const [compRes, catRes, ruleRes] = await Promise.all([
        apiFetch('/api/v1/rates/companies'),
        apiFetch('/api/v1/rates/categories'),
        apiFetch('/api/v1/rates/relationships')
      ])

      if (compRes.ok && catRes.ok && ruleRes.ok) {
        setCompanies(await compRes.json())
        setCategories(await catRes.json())
        setRules(await ruleRes.json())
      } else {
        setErrorMsg('Failed to load rates configuration data.')
      }
    } catch (err) {
      setErrorMsg('Network error fetching configuration.')
    } finally {
      setLoading(false)
    }
  }

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  // --- Companies CRUD ---
  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyName.trim()) return
    try {
      const res = await apiFetch('/api/v1/rates/companies', {
        method: 'POST',
        body: JSON.stringify({ name: companyName })
      })
      if (res.ok) {
        setCompanyName('')
        showSuccess('Company added successfully!')
        loadAllData()
      } else {
        const data = await res.json()
        setErrorMsg(data.error || 'Failed to add company')
      }
    } catch {
      setErrorMsg('Network error occurred.')
    }
  }

  const handleUpdateCompany = async (id: string, newStatus?: number) => {
    try {
      const res = await apiFetch(`/api/v1/rates/companies/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...(newStatus !== undefined && { status: newStatus }),
          ...(editingId === id && { name: editName })
        })
      })
      if (res.ok) {
        setEditingId(null)
        setEditName('')
        showSuccess('Company updated successfully!')
        loadAllData()
      } else {
        const data = await res.json()
        setErrorMsg(data.error || 'Failed to update company')
      }
    } catch {
      setErrorMsg('Network error occurred.')
    }
  }

  // --- Categories CRUD ---
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryName.trim()) return
    try {
      const res = await apiFetch('/api/v1/rates/categories', {
        method: 'POST',
        body: JSON.stringify({ name: categoryName })
      })
      if (res.ok) {
        setCategoryName('')
        showSuccess('Category added successfully!')
        loadAllData()
      } else {
        const data = await res.json()
        setErrorMsg(data.error || 'Failed to add category')
      }
    } catch {
      setErrorMsg('Network error occurred.')
    }
  }

  const handleUpdateCategory = async (id: string, newStatus?: number) => {
    try {
      const res = await apiFetch(`/api/v1/rates/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          ...(newStatus !== undefined && { status: newStatus }),
          ...(editingId === id && { name: editName })
        })
      })
      if (res.ok) {
        setEditingId(null)
        setEditName('')
        showSuccess('Category updated successfully!')
        loadAllData()
      } else {
        const data = await res.json()
        setErrorMsg(data.error || 'Failed to update category')
      }
    } catch {
      setErrorMsg('Network error occurred.')
    }
  }

  // --- Rate Rules (Relationships) CRUD ---
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault()
    const { id, companyId, categoryId, percentage, profit, status } = ruleForm
    if (!companyId || !categoryId || percentage === '' || profit === '') return

    try {
      const url = id ? `/api/v1/rates/relationships/${id}` : '/api/v1/rates/relationships'
      const method = id ? 'PATCH' : 'POST'

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({
          companyId,
          categoryId,
          percentage: parseFloat(percentage),
          profit: parseFloat(profit),
          status: parseInt(status)
        })
      })

      if (res.ok) {
        setRuleForm({ id: '', companyId: '', categoryId: '', percentage: '', profit: '', status: '1' })
        showSuccess(id ? 'Rate rule updated successfully!' : 'Rate rule created successfully!')
        loadAllData()
      } else {
        const data = await res.json()
        setErrorMsg(data.error || 'Failed to save rate rule')
      }
    } catch {
      setErrorMsg('Network error occurred.')
    }
  }

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure want to delete this rate rule?')) return
    try {
      const res = await apiFetch(`/api/v1/rates/relationships/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        showSuccess('Rate rule deleted successfully!')
        loadAllData()
      } else {
        setErrorMsg('Failed to delete rate rule.')
      }
    } catch {
      setErrorMsg('Network error occurred.')
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900 mb-4" />
        <p className="text-slate-400 font-bold text-xs tracking-wider animate-pulse uppercase">Authenticating...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <AdminLayout>
        <div className="max-w-md mx-auto my-20 p-8 bg-white border border-rose-100 rounded-3xl text-center space-y-4 shadow-xl shadow-rose-50 animate-in zoom-in duration-300">
          <div className="w-16 h-16 mx-auto bg-rose-50 text-rose-500 rounded-full flex items-center justify-center">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Access Restricted</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Only administrators and super administrators are authorized to configure Quotation Rates, formulas, and relationship matrices.
          </p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Quotation Rates</h1>
              <span className="p-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-black uppercase flex items-center gap-1 border border-amber-200">
                <Sparkles size={12} /> Matrix Engine
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">Configure company, category percentages, and flat rate profit bounds.</p>
          </div>
          <button
            onClick={loadAllData}
            className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-100 bg-white"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-2xl flex items-center justify-between text-sm animate-in slide-in-from-top duration-200">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg('')}><X size={16} /></button>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-4 py-3 rounded-2xl flex items-center justify-between text-sm animate-in slide-in-from-top duration-200">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg('')}><X size={16} /></button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-1 bg-slate-100/60 p-1 rounded-2xl">
          {[
            { id: 'rules', label: 'Rate Rules', icon: ListCollapse },
            { id: 'companies', label: 'Companies', icon: Building },
            { id: 'categories', label: 'Categories', icon: Folder }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id as any)
                setEditingId(null)
              }}
              className={`flex items-center gap-2 px-5 py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-wide transition-all ${
                activeTab === t.id
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-950 hover:bg-white/50'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Loading Indicator */}
        {loading ? (
          <div className="flex items-center justify-center py-20 bg-white border border-slate-100 rounded-3xl min-h-[400px]">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left: Input Form Panel */}
            <div className="lg:col-span-4 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-6">
              
              {activeTab === 'rules' && (
                <form onSubmit={handleSaveRule} className="space-y-4">
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide pb-2 border-b border-slate-100">
                    {ruleForm.id ? 'Edit Rate Rule' : 'New Rate Rule'}
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Company *</label>
                      <select
                        required
                        value={ruleForm.companyId}
                        onChange={e => setRuleForm({ ...ruleForm, companyId: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-slate-100"
                      >
                        <option value="">Select Company</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Category *</label>
                      <select
                        required
                        value={ruleForm.categoryId}
                        onChange={e => setRuleForm({ ...ruleForm, categoryId: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-slate-100"
                      >
                        <option value="">Select Category</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Percentage (In %)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        required
                        placeholder="e.g. 15"
                        value={ruleForm.percentage}
                        onChange={e => setRuleForm({ ...ruleForm, percentage: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Profit (In Rupees)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        placeholder="e.g. 2000"
                        value={ruleForm.profit}
                        onChange={e => setRuleForm({ ...ruleForm, profit: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Status</label>
                      <select
                        value={ruleForm.status}
                        onChange={e => setRuleForm({ ...ruleForm, status: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-slate-100"
                      >
                        <option value="1">Active</option>
                        <option value="2">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-xs font-extrabold uppercase tracking-wide hover:bg-black transition-all flex items-center justify-center gap-1.5"
                    >
                      <Save size={14} /> Save Rule
                    </button>
                    {ruleForm.id && (
                      <button
                        type="button"
                        onClick={() => setRuleForm({ id: '', companyId: '', categoryId: '', percentage: '', profit: '', status: '1' })}
                        className="py-3 px-4 border border-slate-200 text-slate-500 rounded-xl text-xs font-extrabold hover:bg-slate-50 uppercase tracking-wide"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              )}

              {activeTab === 'companies' && (
                <form onSubmit={handleAddCompany} className="space-y-4">
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide pb-2 border-b border-slate-100">
                    Add Company
                  </h3>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Company Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HDFC ERGO"
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-slate-100"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-extrabold uppercase tracking-wide hover:bg-black transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} /> Add Company
                  </button>
                </form>
              )}

              {activeTab === 'categories' && (
                <form onSubmit={handleAddCategory} className="space-y-4">
                  <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide pb-2 border-b border-slate-100">
                    Add Category
                  </h3>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Category Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Two Wheeler Comprehensive"
                      value={categoryName}
                      onChange={e => setCategoryName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-4 focus:ring-slate-100"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-extrabold uppercase tracking-wide hover:bg-black transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus size={14} /> Add Category
                  </button>
                </form>
              )}

            </div>

            {/* Right: Data Table Panel */}
            <div className="lg:col-span-8 bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden min-h-[400px]">
              
              {activeTab === 'rules' && (
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Company</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Percentage</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Profit</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rules.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                          No quotation rate rules configured yet.
                        </td>
                      </tr>
                    ) : (
                      rules.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-xs font-bold text-slate-800">{r.company?.name}</td>
                          <td className="px-6 py-4 text-xs text-slate-500 font-medium">{r.category?.name}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-800">{parseFloat(r.percentage.toString())}%</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-800">₹{parseFloat(r.profit.toString())}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              r.status === 1 ? 'bg-emerald-50 text-emerald-700 border border-emerald-250' : 'bg-amber-50 text-amber-700 border border-amber-250'
                            }`}>
                              {r.status === 1 ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => setRuleForm({
                                  id: r.id,
                                  companyId: r.companyId,
                                  categoryId: r.categoryId,
                                  percentage: r.percentage.toString(),
                                  profit: r.profit.toString(),
                                  status: r.status.toString()
                                })}
                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                                title="Edit Rule"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteRule(r.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                title="Delete Rule"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {(activeTab === 'companies' || activeTab === 'categories') && (
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(() => {
                      const dataList = activeTab === 'companies' ? companies : categories
                      if (dataList.length === 0) {
                        return (
                          <tr>
                            <td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                              No {activeTab} added yet.
                            </td>
                          </tr>
                        )
                      }
                      return dataList.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-xs font-bold text-slate-800">
                            {editingId === item.id ? (
                              <input
                                type="text"
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                className="border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none bg-slate-50"
                              />
                            ) : (
                              item.name
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              item.status === 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {item.status === 1 ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              {editingId === item.id ? (
                                <>
                                  <button
                                    onClick={() => activeTab === 'companies' ? handleUpdateCompany(item.id) : handleUpdateCategory(item.id)}
                                    className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[10px] font-black uppercase"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => { setEditingId(null); setEditName('') }}
                                    className="px-2.5 py-1 border border-slate-200 text-slate-500 rounded text-[10px] font-black uppercase"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingId(item.id)
                                      setEditName(item.name)
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                                    title="Rename"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    onClick={() => activeTab === 'companies'
                                      ? handleUpdateCompany(item.id, item.status === 1 ? 2 : 1)
                                      : handleUpdateCategory(item.id, item.status === 1 ? 2 : 1)
                                    }
                                    className={`px-2.5 py-1 rounded text-[10px] font-black uppercase ${
                                      item.status === 1
                                        ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                        : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                    }`}
                                  >
                                    {item.status === 1 ? 'Disable' : 'Enable'}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
              )}

            </div>

          </div>
        )}

      </div>
    </AdminLayout>
  )
}
