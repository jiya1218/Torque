'use client'
import React, { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { useAuth } from '@/context/AuthContext'
import { useApi } from '@/hooks/useApi'
import {
  Shield, Mail, Phone, Calendar, GraduationCap, FileText, CheckCircle2,
  XCircle, Clock, Search, RefreshCw, Eye, Download, UserCheck, AlertCircle,
  X, MessageSquare
} from 'lucide-react'

const getGoogleDriveEmbedUrl = (url: string) => {
  if (!url) return null;
  // Match file/d/ID/
  let match = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  // Match id=ID
  match = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  return null;
}

export default function OnboardingApprovalsPage() {
  const { user: currentUser, token, isLoading: authLoading } = useAuth()
  const apiFetch = useApi()
  const [users, setUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [actioning, setActioning] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [previewDoc, setPreviewDoc] = useState<any>(null)
  const [showRemarkModal, setShowRemarkModal] = useState(false)
  const [remarkText, setRemarkText] = useState('')

  const downloadFileDirectly = async (url: string, filename: string) => {
    try {
      if (url.includes('drive.google.com')) {
        window.open(url, '_blank')
        return
      }
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('Failed to download directly:', err)
      window.open(url, '_blank')
    }
  }

  const isAdmin = currentUser?.role?.name?.toUpperCase() === 'SUPER ADMIN' || 
    currentUser?.role?.name?.toUpperCase() === 'ADMIN' || 
    currentUser?.role?.name?.toUpperCase() === 'HR MANAGER'

  const fetchPendingUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await apiFetch('/api/v1/users?onboarding=true')
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

  const fetchUserDetails = async (userId: string) => {
    const localUser = users.find(u => u.id === userId)
    if (localUser) {
      setSelectedUser(localUser)
    }
    try {
      const res = await apiFetch(`/api/v1/users/${userId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedUser(data)
      }
    } catch (err) {
      console.error('Failed to fetch user details:', err)
    }
  }

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

  const handleSendRemark = async () => {
    if (!remarkText.trim() || !selectedUser) return
    setActioning(true)
    setErrorMessage('')
    try {
      const res = await apiFetch(`/api/v1/users/${selectedUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ onboardingRemark: remarkText })
      })
      if (res.ok) {
        setShowRemarkModal(false)
        setRemarkText('')
        setSelectedUser(null)
        fetchPendingUsers()
      } else {
        const data = await res.json()
        setErrorMessage(data.error || 'Failed to request revision')
      }
    } catch (err) {
      setErrorMessage('Network error during revision request.')
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
                        onClick={() => fetchUserDetails(user.id)}
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
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-bold text-slate-900">{user.fullName}</p>
                                {user.onboardingUpdated && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-extrabold uppercase tracking-wide animate-pulse">
                                    🔄 Re-submitted
                                  </span>
                                )}
                              </div>
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
                              fetchUserDetails(user.id)
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

                  {selectedUser.homeMobile && (
                    <div className="flex items-center gap-3">
                      <Phone size={16} className="text-rose-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Alternative Mobile</p>
                        <p className="font-semibold text-slate-800 text-xs mt-0.5">{selectedUser.homeMobile}</p>
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
                      selectedUser.documents.map((doc: any) => {
                        const docDisplayNames: Record<string, string> = {
                          ADHAR: 'Aadhaar Card',
                          PAN: 'PAN Card',
                          SSC: 'SSC Marksheet',
                          QUALIFICATION: 'Highest Degree Cert',
                          LEAVING: 'Leaving Certificate',
                          PHOTO: 'Passport Photo'
                        }
                        const displayName = docDisplayNames[doc.fileName?.toUpperCase()] || doc.fileName || 'Attachment'

                        return (
                          <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100/50 transition-colors">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileText size={16} className="text-rose-500 shrink-0" />
                              <span className="text-xs font-bold text-slate-700 truncate capitalize">
                                {displayName}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPreviewDoc(doc)
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                title="Open File"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const ext = doc.filePath.split('.').pop()?.split('?')[0] || 'pdf'
                                  downloadFileDirectly(doc.filePath, `${displayName}.${ext}`)
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                title="Download File"
                              >
                                <Download size={14} />
                              </button>
                            </div>
                          </div>
                        )
                      })
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
                      onClick={() => setShowRemarkModal(true)}
                      disabled={actioning}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                      <MessageSquare size={16} />
                      Request Profile Revision
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

      {/* ── Document Preview Modal Overlay ── */}
      {previewDoc && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[85vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-3">
                <FileText className="text-rose-500" size={20} />
                <div>
                  <h3 className="font-black text-sm text-slate-100 uppercase tracking-wider">
                    {previewDoc.fileName?.toUpperCase() === 'ADHAR' ? 'Aadhaar Card' :
                     previewDoc.fileName?.toUpperCase() === 'PAN' ? 'PAN Card' :
                     previewDoc.fileName?.toUpperCase() === 'SSC' ? 'SSC Marksheet' :
                     previewDoc.fileName?.toUpperCase() === 'QUALIFICATION' ? 'Highest Degree Cert' :
                     previewDoc.fileName?.toUpperCase() === 'LEAVING' ? 'Leaving Certificate' :
                     previewDoc.fileName?.toUpperCase() === 'PHOTO' ? 'Passport Photo' :
                     previewDoc.fileName || 'Document Attachment'}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate max-w-md">Submitted by {selectedUser?.fullName}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const docDisplayNames: Record<string, string> = {
                      ADHAR: 'Aadhaar_Card',
                      PAN: 'PAN_Card',
                      SSC: 'SSC_Marksheet',
                      QUALIFICATION: 'Highest_Degree_Cert',
                      LEAVING: 'Leaving_Certificate',
                      PHOTO: 'Passport_Photo'
                    }
                    const name = docDisplayNames[previewDoc.fileName?.toUpperCase()] || previewDoc.fileName || 'Attachment'
                    const ext = previewDoc.filePath.split('.').pop()?.split('?')[0] || 'pdf'
                    downloadFileDirectly(previewDoc.filePath, `${name}.${ext}`)
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-850 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all border border-slate-800"
                  title="Download file"
                >
                  <Download size={14} /> Download
                </button>
                
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white"
                  title="Close document"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 bg-slate-950 flex items-center justify-center overflow-auto p-6 w-full h-full">
              {(() => {
                const driveEmbed = getGoogleDriveEmbedUrl(previewDoc.filePath)
                if (driveEmbed) {
                  return (
                    <iframe
                      src={driveEmbed}
                      className="w-full h-full border-none rounded-xl bg-white"
                      title="Google Drive Document Preview"
                      allow="autoplay"
                    />
                  )
                }
                if (previewDoc.filePath?.toLowerCase()?.endsWith('.pdf')) {
                  return (
                    <iframe
                      src={`${previewDoc.filePath}#toolbar=0`}
                      className="w-full h-full border-none rounded-xl bg-white"
                      title="PDF Attachment Document Preview"
                    />
                  )
                }
                return (
                  <img
                    src={previewDoc.filePath}
                    alt={previewDoc.fileName}
                    className="max-w-full max-h-full object-contain rounded-xl shadow-lg border border-slate-850"
                  />
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Admin Revision Remarks Modal ── */}
      {showRemarkModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-8 sm:p-10 animate-in zoom-in-95 duration-200 border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Request Profile Revision</h3>
                <p className="text-xs text-slate-500 mt-1">Specify what document or detail needs to be corrected by the applicant.</p>
              </div>
              <button
                onClick={() => { setShowRemarkModal(false); setRemarkText('') }}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Revision Instructions / Remarks</label>
                <textarea
                  value={remarkText}
                  onChange={e => setRemarkText(e.target.value)}
                  placeholder="e.g. Aadhaar Card copy is blurry. Please scan and upload a high-resolution PDF or clear photo."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-rose-500/10 outline-none transition-all resize-none h-32 border-slate-150 text-slate-800"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowRemarkModal(false); setRemarkText('') }}
                  className="flex-1 py-3.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendRemark}
                  disabled={actioning || !remarkText.trim()}
                  className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  {actioning ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
