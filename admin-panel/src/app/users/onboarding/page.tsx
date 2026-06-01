'use client'
import React, { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { useAuth } from '@/context/AuthContext'
import { useApi } from '@/hooks/useApi'
import {
  Shield, Mail, Phone, Calendar, GraduationCap, FileText, CheckCircle2,
  XCircle, Clock, Search, RefreshCw, Eye, Download, UserCheck, AlertCircle
} from 'lucide-react'

export default function OnboardingApprovalsPage() {
  const { user: currentUser, token, isLoading: authLoading } = useAuth()
  const apiFetch = useApi()
  const [users, setUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [actioning, setActioning] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const isAdmin = currentUser?.role?.name?.toUpperCase() === 'SUPER ADMIN' || 
    currentUser?.role?.name?.toUpperCase() === 'ADMIN' || 
    currentUser?.role?.name?.toUpperCase() === 'HR MANAGER'

  const fetchPendingUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await apiFetch('/api/v1/users')
      if (res.ok) {
        const data = await res.json()
        // Filter users that are inactive (pending onboarding)
        const pending = (Array.isArray(data) ? data : []).filter(u => !u.isActive)
        setUsers(pending)
      }
    } catch (err) {
      console.error('Failed to fetch pending onboardings:', err)
    } finally {
      setIsLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    if (!authLoading && token) fetchPendingUsers()
  }, [authLoading, token, fetchPendingUsers])

  const handleApprove = async (userId: string) => {
    setActioning(true)
    setErrorMessage('')
    try {
      const res = await apiFetch(`/api/v1/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: true })
      })
      if (res.ok) {
        setSelectedUser(null)
        fetchPendingUsers()
      } else {
        const data = await res.json()
        setErrorMessage(data.error || 'Failed to approve application')
      }
    } catch (err) {
      setErrorMessage('Network error during approval.')
    } finally {
      setActioning(false)
    }
  }

  const handleReject = async (userId: string) => {
    if (!confirm('Are you sure you want to reject and delete this application?')) return
    setActioning(true)
    setErrorMessage('')
    try {
      const res = await apiFetch(`/api/v1/users/${userId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setSelectedUser(null)
        fetchPendingUsers()
      } else {
        const data = await res.json()
        setErrorMessage(data.error || 'Failed to reject application')
      }
    } catch (err) {
      setErrorMessage('Network error during rejection.')
    } finally {
      setActioning(false)
    }
  }

  const filtered = users.filter(u =>
    u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Onboarding Approvals</h1>
            <p className="text-sm text-slate-500 mt-1">{users.length} pending employee joining applications</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchPendingUsers}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-2xl flex items-center gap-3 text-sm">
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List of Onboardings */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 flex items-center gap-3">
              <Search size={18} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search applicants..."
                className="flex-1 bg-transparent border-none outline-none text-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Clock size={40} className="mb-3 text-slate-200" />
                  <p className="font-semibold">No pending onboarding requests found</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-widest px-6 py-4">Applicant</th>
                      <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-widest px-4 py-4">Requested Role</th>
                      <th className="text-left text-xs font-bold text-slate-400 uppercase tracking-widest px-4 py-4">Joined At</th>
                      <th className="text-right text-xs font-bold text-slate-400 uppercase tracking-widest px-6 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.map(user => (
                      <tr
                        key={user.id}
                        onClick={() => setSelectedUser(user)}
                        className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${
                          selectedUser?.id === user.id ? 'bg-rose-50/40' : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                              {user.fullName?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{user.fullName}</p>
                              <p className="text-xs text-slate-400">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">
                            {user.role?.name || 'Pending Assignment'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-500 font-medium">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedUser(user)
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black shadow-sm"
                          >
                            <Eye size={12} /> View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Details Sidebar Panel */}
          <div className="lg:col-span-1">
            {selectedUser ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6 sticky top-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <h3 className="font-black text-lg text-slate-900">Application File</h3>
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-extrabold uppercase border border-amber-200 rounded">
                    Audit Phase
                  </span>
                </div>

                <div className="flex flex-col items-center text-center space-y-3 pb-4 border-b border-slate-100">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white font-black text-2xl shadow-md">
                    {selectedUser.fullName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <h4 className="text-md font-bold text-slate-900">{selectedUser.fullName}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="flex items-center gap-3">
                    <Shield size={16} className="text-rose-500 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Role Request</p>
                      <p className="font-semibold text-slate-800 text-xs mt-0.5">{selectedUser.role?.name || 'Unassigned'}</p>
                    </div>
                  </div>

                  {selectedUser.personalMobile && (
                    <div className="flex items-center gap-3">
                      <Phone size={16} className="text-rose-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mobile Number</p>
                        <p className="font-semibold text-slate-800 text-xs mt-0.5">{selectedUser.personalMobile}</p>
                      </div>
                    </div>
                  )}

                  {selectedUser.highestQualification && (
                    <div className="flex items-center gap-3">
                      <GraduationCap size={16} className="text-rose-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Qualifications</p>
                        <p className="font-semibold text-slate-800 text-xs mt-0.5">{selectedUser.highestQualification}</p>
                      </div>
                    </div>
                  )}

                  {selectedUser.dateOfBirth && (
                    <div className="flex items-center gap-3">
                      <Calendar size={16} className="text-rose-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Date of Birth</p>
                        <p className="font-semibold text-slate-800 text-xs mt-0.5">{new Date(selectedUser.dateOfBirth).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}

                  {selectedUser.joiningDate && (
                    <div className="flex items-center gap-3">
                      <Calendar size={16} className="text-rose-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Requested Joining Date</p>
                        <p className="font-semibold text-slate-800 text-xs mt-0.5">{new Date(selectedUser.joiningDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Attachments Section */}
                <div className="space-y-3">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document attachments</h5>
                  <div className="grid grid-cols-1 gap-2.5">
                    {selectedUser.documents && selectedUser.documents.length > 0 ? (
                      selectedUser.documents.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FileText size={16} className="text-rose-500 shrink-0" />
                            <span className="text-xs font-bold text-slate-700 truncate capitalize">
                              {doc.fileName?.toLowerCase()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={doc.filePath}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <Download size={14} />
                            </a>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No attachments uploaded.</p>
                    )}
                  </div>
                </div>

                {/* Approve/Reject Controls */}
                {isAdmin && (
                  <div className="flex flex-col gap-2 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => handleApprove(selectedUser.id)}
                      disabled={actioning}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                      <UserCheck size={16} />
                      Approve & Activate Account
                    </button>
                    <button
                      onClick={() => handleReject(selectedUser.id)}
                      disabled={actioning}
                      className="w-full flex items-center justify-center gap-2 py-3 border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                      <XCircle size={16} />
                      Reject Application
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 flex flex-col items-center justify-center min-h-[300px]">
                <Clock size={32} className="mb-2 text-slate-300" />
                <p className="text-sm font-semibold">Select an applicant to review their credentials, uploaded certificates, and attachments.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </AdminLayout>
  )
}
