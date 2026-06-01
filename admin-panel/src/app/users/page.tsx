"use client"
import React, { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { useAuth } from '@/context/AuthContext'
import { useApi } from '@/hooks/useApi'
import {
  UserPlus, Shield, Mail, Edit3, Trash2,
  CheckCircle2, Circle, XCircle, X, Search, RefreshCw,
  User, BookOpen, AlertCircle, Clock, Check
} from 'lucide-react'

export default function UsersPage() {
  const { user: currentUser, token, isLoading: authLoading } = useAuth()
  const apiFetch = useApi()
  const [users, setUsers] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [allPermissions, setAllPermissions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'pending' | 'active'>('all')

  const isAdmin = currentUser?.role?.name?.toUpperCase() === 'ADMIN' || 
    currentUser?.role?.name?.toUpperCase() === 'SUPER ADMIN' || 
    currentUser?.role?.name?.toUpperCase() === 'HR MANAGER'
  const isManager = currentUser?.role?.name?.toUpperCase() === 'MANAGER'

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editUser, setEditUser] = useState<any>(null)
  
  // Forms
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState({
    fullName: '', email: '', password: '', roleId: '', managerId: '',
    highestQualification: '', dateOfBirth: '', joiningDate: '',
    personalMobile: '', homeMobile: ''
  })
  const [createError, setCreateError] = useState('')

  const [editForm, setEditForm] = useState({ roleId: '', managerId: '', isActive: true, extraPermissionIds: [] as string[] })
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [usersRes, rolesRes, permsRes] = await Promise.all([
        apiFetch('/api/v1/users'),
        apiFetch('/api/v1/roles'),
        apiFetch('/api/v1/permissions')
      ])
      const usersData = await usersRes.json()
      const rolesData = await rolesRes.json()
      const permsData = await permsRes.json()
      setUsers(Array.isArray(usersData) ? usersData : [])
      setRoles(Array.isArray(rolesData) ? rolesData : [])
      setAllPermissions(Array.isArray(permsData) ? permsData : [])
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    if (!authLoading && token) fetchData()
  }, [authLoading, token, fetchData])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateError('')
    try {
      const res = await apiFetch('/api/v1/users', {
        method: 'POST',
        body: JSON.stringify(createForm)
      })
      const data = await res.json()
      if (!res.ok) setCreateError(data.error || 'Failed to create user')
      else {
        setShowCreateModal(false)
        setCreateForm({ fullName: '', email: '', password: '', roleId: '', managerId: '', highestQualification: '', dateOfBirth: '', joiningDate: '', personalMobile: '', homeMobile: '' })
        fetchData()
      }
    } catch {
      setCreateError('Network error. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      const res = await apiFetch(`/api/v1/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: true })
      })
      if (res.ok) fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  const handleEditSave = async () => {
    if (!editUser) return
    setSaving(true)
    try {
      const res = await apiFetch(`/api/v1/users/${editUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm)
      })
      if (res.ok) {
        setEditUser(null)
        fetchData()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (user: any) => {
    setEditUser(user)
    setEditForm({
      roleId: user.role?.id || '',
      managerId: user.managerId || '',
      isActive: user.isActive,
      extraPermissionIds: user.permissions?.map((p: any) => p.id) || []
    })
  }

  const filtered = users.filter(u => {
    const matchesSearch = u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    if (filter === 'pending') return matchesSearch && !u.isActive
    if (filter === 'active') return matchesSearch && u.isActive
    return matchesSearch
  })

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <p className="text-sm text-gray-500 mt-1">{users.length} registered employees</p>
            </div>
            
            <div className="flex bg-gray-100 p-1 rounded-xl">
               <button onClick={() => setFilter('all')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>All</button>
               <button onClick={() => setFilter('active')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'active' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}>Active</button>
               <button onClick={() => setFilter('pending')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filter === 'pending' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-500'}`}>Pending Approval</button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={fetchData} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 transition-all font-semibold text-sm"
            >
              <UserPlus size={18} /> Add New
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search employees..."
            className="flex-1 bg-transparent border-none outline-none text-sm"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <User size={40} className="mb-3 text-gray-200" />
              <p className="font-semibold">No employees found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-6 py-4">Employee</th>
                  <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-4 py-4">Role</th>
                  <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-widest px-4 py-4">Status</th>
                  <th className="text-right text-xs font-bold text-gray-400 uppercase tracking-widest px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {user.fullName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{user.fullName}</p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-200">
                        {user.role?.name || 'Unassigned'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-bold border border-green-200">
                          <CheckCircle2 size={12} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold border border-amber-200">
                          <Clock size={12} /> Pending Approval
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center justify-end gap-2">
                         {!user.isActive && isAdmin && (
                           <button onClick={() => handleApprove(user.id)} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 shadow-md shadow-green-100">
                              <Check size={14} /> Approve
                           </button>
                         )}
                         <button onClick={() => openEdit(user)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit3 size={16}/></button>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Create User Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl p-10 animate-in zoom-in duration-200">
             <div className="flex items-center justify-between mb-8">
                <div>
                   <h2 className="text-2xl font-black text-gray-900 tracking-tight">Add New Employee</h2>
                   {isManager && <p className="text-sm text-amber-600 font-medium mt-1 italic">Note: Accounts created by Managers require Admin Approval.</p>}
                </div>
                <button onClick={() => setShowCreateModal(false)} className="p-3 hover:bg-gray-100 rounded-2xl transition-all"><X size={24}/></button>
             </div>
             
             <form onSubmit={handleCreateUser} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Account Credentials</label>
                      <input type="text" placeholder="Full Name" required value={createForm.fullName} onChange={e => setCreateForm({...createForm, fullName: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-100 outline-none transition-all" />
                      <input type="email" placeholder="Work Email" required value={createForm.email} onChange={e => setCreateForm({...createForm, email: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-100 outline-none transition-all" />
                      <input type="password" placeholder="Temporary Password" required value={createForm.password} onChange={e => setCreateForm({...createForm, password: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-100 outline-none transition-all" />
                   </div>
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] block mb-2">Role Assignment</label>
                      <select 
                        disabled={isManager}
                        value={isManager ? (roles.find(r => r.name === 'EXECUTIVE')?.id || '') : createForm.roleId} 
                        onChange={e => setCreateForm({...createForm, roleId: e.target.value})} 
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none"
                      >
                         {isManager ? (
                           <option value="">EXECUTIVE</option>
                         ) : (
                           <>
                             <option value="">Select Role</option>
                             {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                           </>
                         )}
                      </select>
                      
                      {!isManager && (
                        <select value={createForm.managerId} onChange={e => setCreateForm({...createForm, managerId: e.target.value})} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none">
                           <option value="">No Manager (Direct)</option>
                           {users.filter(u => u.role?.name?.toUpperCase() === 'MANAGER').map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
                        </select>
                      )}
                      
                      <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl">
                         <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                           {isManager 
                             ? "As a Manager, you are adding an Executive to your team. They will be active once approved by the Super Admin."
                             : "Admins can create active accounts and assign reporting managers immediately."
                           }
                         </p>
                      </div>
                   </div>
                </div>

                {createError && <p className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100 flex items-center gap-2"><AlertCircle size={14}/> {createError}</p>}
                
                <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-4 text-gray-400 font-black tracking-widest uppercase text-[10px] hover:bg-gray-50 rounded-2xl transition-all">Dismiss</button>
                   <button type="submit" disabled={creating} className="flex-1 py-4 bg-gray-900 text-white font-black tracking-widest uppercase text-[10px] rounded-2xl shadow-2xl shadow-gray-200 hover:bg-black transition-all">
                      {creating ? 'Processing...' : 'Complete Registration'}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* ── Edit Modal (Simplified for the workflow) ── */}
      {editUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg p-10">
              <h2 className="text-xl font-black text-gray-900 mb-6">Modify Access</h2>
              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Account Status</label>
                    <div className="flex gap-3">
                       <button onClick={() => setEditForm({...editForm, isActive: true})} className={`flex-1 py-3 rounded-xl font-bold text-xs border transition-all ${editForm.isActive ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>Active</button>
                       <button onClick={() => setEditForm({...editForm, isActive: false})} className={`flex-1 py-3 rounded-xl font-bold text-xs border transition-all ${!editForm.isActive ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>Pending/Inactive</button>
                    </div>
                 </div>
                 
                 <div className="flex gap-3">
                    <button onClick={() => setEditUser(null)} className="flex-1 py-3 font-bold text-xs text-gray-400">Cancel</button>
                    <button onClick={handleEditSave} disabled={saving} className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] tracking-widest uppercase">Apply Changes</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </AdminLayout>
  )
}
