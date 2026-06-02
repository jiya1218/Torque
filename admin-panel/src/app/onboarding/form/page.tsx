"use client"
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import {
  Phone, GraduationCap, Calendar, UploadCloud, FileText, Check,
  AlertCircle, ShieldCheck, ArrowRight, CheckCircle2, Clock, Trash2, Eye, LogOut
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function OnboardingFormPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [status, setStatus] = useState<'checking' | 'show' | 'done'>('checking')
  const [countdown, setCountdown] = useState(3)
  const [adminRemark, setAdminRemark] = useState('')

  // Form State
  const [form, setForm] = useState({
    personalMobile: '',
    homeMobile: '',
    highestQualification: '',
    dateOfBirth: '',
    joiningDate: ''
  })
  
  // Documents State
  const [docs, setDocs] = useState<Record<string, { url: string; name: string } | null>>({
    adhar: null,
    pan: null,
    ssc: null,
    qualification: null,
    leaving: null,
    photo: null
  })

  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Check if form already filled → redirect to dashboard if active
  useEffect(() => {
    if (isLoading) return
    if (!user) { window.location.href = '/login'; return }

    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) { setStatus('show'); return }
        const res = await fetch('/api/v1/onboarding/check-form-status', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
        if (res.ok) {
          const data = await res.json()
          if (data.onboardingRemark) {
            setAdminRemark(data.onboardingRemark)
          }
          if (!data.requiresForm) {
            if (user.isActive) {
              window.location.href = '/' // already filled & active -> dashboard
              return
            } else {
              setStatus('done') // filled but pending admin approval
              return
            }
          }
        }
      } catch (e) { console.error(e) }
      setStatus('show')
    }
    check()
  }, [user, isLoading])

  // Fetch detailed profile to pre-fill fields and existing documents if they exist
  useEffect(() => {
    if (!user || status !== 'show') return

    const loadProfileDetails = async () => {
      try {
        const res = await fetch(`/api/v1/users/${user.id}`)
        if (res.ok) {
          const data = await res.json()
          
          setForm({
            personalMobile: data.personalMobile || '',
            homeMobile: data.homeMobile || '',
            highestQualification: data.highestQualification || '',
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split('T')[0] : '',
            joiningDate: data.joiningDate ? new Date(data.joiningDate).toISOString().split('T')[0] : ''
          })
          
          // Prefill documents
          if (data.documents && Array.isArray(data.documents)) {
            const prefilledDocs: typeof docs = {
              adhar: null,
              pan: null,
              ssc: null,
              qualification: null,
              leaving: null,
              photo: null
            }
            data.documents.forEach((d: any) => {
              const key = d.fileName?.toLowerCase()
              if (key in prefilledDocs) {
                prefilledDocs[key] = {
                  url: d.filePath,
                  name: d.filePath.split('/').pop() || `${key}_document`
                }
              }
            })
            setDocs(prefilledDocs)
          }
        }
      } catch (err) {
        console.error('Failed to pre-fill profile details:', err)
      }
    }
    
    loadProfileDetails()
  }, [user, status])

  // Countdown after submission (redirects user to dashboard)
  useEffect(() => {
    if (status !== 'done') return
    if (countdown <= 0) { window.location.href = '/'; return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [status, countdown])

  // Handle Document Upload directly to Supabase storage
  const handleFileChange = async (type: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingDoc(type)
    setErrorMsg('')
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${type}.${fileExt}`
      const filePath = `onboarding/${fileName}`

      // Upload to Supabase documents bucket
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      setDocs(prev => ({
        ...prev,
        [type]: { url: publicUrl, name: file.name }
      }))
    } catch (err: any) {
      console.error('File upload error:', err)
      setErrorMsg(`Failed to upload ${type.toUpperCase()}: ${err.message}`)
    } finally {
      setUploadingDoc(null)
    }
  }

  // Remove document reference
  const handleRemoveDoc = (type: string) => {
    setDocs(prev => ({
      ...prev,
      [type]: null
    }))
  }

  // Handle Log Out / Switch Account
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch (err) {
      console.error('Logout error:', err)
      window.location.href = '/login'
    }
  }

  // Handle Native Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    
    if (!form.personalMobile || !form.highestQualification || !form.dateOfBirth) {
      setErrorMsg('Mobile Number, Highest Qualification, and Date of Birth are required fields.')
      return
    }

    setSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      // Prepare documents array
      const uploadedDocs: any[] = []
      Object.entries(docs).forEach(([key, val]) => {
        if (val) {
          uploadedDocs.push({
            type: key.toUpperCase(),
            url: val.url
          })
        }
      })

      const res = await fetch('/api/v1/onboarding/submit-form', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          ...form,
          documents: uploadedDocs
        })
      })

      if (res.ok) {
        setStatus('done')
      } else {
        const err = await res.json()
        setErrorMsg(err.error || 'Failed to submit onboarding form. Please try again.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during submission.')
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading || status === 'checking') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-700 flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-500 mb-4" />
        <p className="text-slate-500 font-bold text-xs tracking-wider animate-pulse uppercase">Syncing Toruq Profile...</p>
      </div>
    )
  }
  if (!user) return null

  // CASE 1: Form submitted successfully → Pending Approval / Redirect
  if (status === 'done') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Pastel background blobs */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-rose-200/30 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-100/40 rounded-full blur-[120px] pointer-events-none" />

        <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 animate-in zoom-in duration-300">
          <div className="bg-white/80 backdrop-blur-xl border border-white/60 py-10 px-8 shadow-2xl rounded-3xl text-center">
            
            <div className="flex justify-center mb-6">
              <div className="h-20 w-20 bg-emerald-500/10 text-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200/50 relative">
                <div className="absolute inset-0 rounded-full bg-emerald-500/5 animate-ping" />
                <CheckCircle2 size={40} className="relative z-10" />
              </div>
            </div>

            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Onboarding Submitted!</h3>
            
            <div className="my-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3 justify-center text-xs font-bold text-amber-700">
              <Clock size={16} className="shrink-0" />
              <span>Awaiting Administrative Activation</span>
            </div>

            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              Your onboarding credentials have been saved. Administrators are currently verifying your certificates. Once completed, your system permissions will be unlocked!
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => { window.location.href = '/' }}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 transition-all cursor-pointer shadow-lg shadow-red-200"
              >
                Go to Dashboard
                <ArrowRight size={14} />
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-slate-200 hover:bg-slate-50 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-700 transition-all cursor-pointer"
              >
                <LogOut size={14} />
                Switch Account
              </button>
            </div>
            
            <p className="text-slate-400 text-[10px] mt-6">
              Checking activation in {countdown}s...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // CASE 2: Premium Onboarding Questionnaire Grid
  return (
    <div className="min-h-screen bg-slate-50 text-slate-700 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-rose-200/40 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-emerald-100/50 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[30%] right-[10%] w-[35%] h-[35%] bg-sky-100/50 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl w-full mx-auto z-10">
        
        {/* Header toolbar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-tr from-red-600 to-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">Toruq Auto</h2>
              <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest mt-0.5">Staff Onboarding</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white/80 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 transition-all shadow-sm"
            title="Log Out of this Account"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Card Container */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-2xl rounded-[2.5rem] overflow-hidden p-8 sm:p-10 animate-in fade-in slide-in-from-bottom-6 duration-500">
          
          <div className="mb-8 border-b border-slate-100 pb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Complete Registration</h1>
            <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">
              Hi <span className="text-red-500 font-bold">{user.fullName}</span>, we need a few professional details and credentials to audit your application and activate your account.
            </p>
          </div>

          {/* Warning Remark alert banner if user has been sent back by admin */}
          {adminRemark && (
            <div className="mb-8 bg-amber-50 border border-amber-200/80 text-amber-800 p-5 rounded-2xl flex items-start gap-3.5 shadow-sm shadow-amber-100/50 animate-in slide-in-from-top duration-300">
              <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-wider text-amber-900">Revision Required by Admin</p>
                <p className="text-xs font-medium leading-relaxed">{adminRemark}</p>
                <p className="text-[10px] text-amber-600/90 font-medium">Please review, make the necessary changes to the fields or document attachments below, and re-submit.</p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mb-8 bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold animate-shake">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* LEFT COLUMN: Input Details */}
              <div className="lg:col-span-5 space-y-6">
                <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">1. Personal & Joining Details</span>
                  
                  <div className="space-y-4">
                    {/* Personal Mobile */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Mobile Number *</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Phone size={14} />
                        </span>
                        <input
                          type="tel"
                          required
                          value={form.personalMobile}
                          onChange={e => setForm({...form, personalMobile: e.target.value})}
                          className="w-full bg-white border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/5 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none transition-all text-xs font-medium shadow-sm"
                          placeholder="e.g. +91 XXXXX XXXXX"
                        />
                      </div>
                    </div>

                    {/* Alternative Mobile */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Alternative Mobile</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Phone size={14} />
                        </span>
                        <input
                          type="tel"
                          value={form.homeMobile}
                          onChange={e => setForm({...form, homeMobile: e.target.value})}
                          className="w-full bg-white border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/5 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none transition-all text-xs font-medium shadow-sm"
                          placeholder="Alternative contact"
                        />
                      </div>
                    </div>

                    {/* Highest Qualification */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Highest Qualification *</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <GraduationCap size={14} />
                        </span>
                        <input
                          type="text"
                          required
                          value={form.highestQualification}
                          onChange={e => setForm({...form, highestQualification: e.target.value})}
                          className="w-full bg-white border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/5 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none transition-all text-xs font-medium shadow-sm"
                          placeholder="e.g. MBA, B.Tech, MCA"
                        />
                      </div>
                    </div>

                    {/* Date of Birth */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Date of Birth *</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Calendar size={14} />
                        </span>
                        <input
                          type="date"
                          required
                          value={form.dateOfBirth}
                          onChange={e => setForm({...form, dateOfBirth: e.target.value})}
                          className="w-full bg-white border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/5 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 focus:outline-none transition-all text-xs font-medium shadow-sm"
                        />
                      </div>
                    </div>

                    {/* Joining Date */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Requested Joining Date</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Calendar size={14} />
                        </span>
                        <input
                          type="date"
                          value={form.joiningDate}
                          onChange={e => setForm({...form, joiningDate: e.target.value})}
                          className="w-full bg-white border border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/5 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 focus:outline-none transition-all text-xs font-medium shadow-sm"
                        />
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Document Upload Grid */}
              <div className="lg:col-span-7 space-y-6">
                <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl h-full">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">2. Verification Credentials</span>
                  <p className="text-[11px] text-slate-500 mb-4">Please upload scanned documents or clear photos (PNG, JPG, or PDF).</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { type: 'adhar', label: 'Aadhaar Card' },
                      { type: 'pan', label: 'PAN Card' },
                      { type: 'ssc', label: 'SSC Marksheet' },
                      { type: 'qualification', label: 'Degree Certificate' },
                      { type: 'leaving', label: 'School Leaving Cert' },
                      { type: 'photo', label: 'Passport Size Photo' }
                    ].map(({ type, label }) => {
                      const doc = docs[type]
                      const isUploading = uploadingDoc === type

                      return (
                        <div
                          key={type}
                          className={`relative border rounded-2xl p-4 flex flex-col items-center justify-center h-28 bg-white hover:bg-slate-50 transition-all overflow-hidden ${
                            doc
                              ? 'border-emerald-200 bg-emerald-50/40'
                              : 'border-slate-200 border-dashed hover:border-slate-300'
                          }`}
                        >
                          {isUploading ? (
                            <div className="flex flex-col items-center text-center space-y-2">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500" />
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Uploading...</span>
                            </div>
                          ) : doc ? (
                            <div className="flex flex-col items-center text-center space-y-2 w-full px-2 z-10 animate-in zoom-in duration-200">
                              <div className="h-7 w-7 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-sm">
                                <Check size={14} />
                              </div>
                              <span className="text-xs font-bold text-slate-800">{label} Attached</span>
                              <span className="text-[9px] text-slate-500 truncate max-w-full">{doc.name}</span>
                              
                              {/* Hover Actions Toolbar overlay */}
                              <div className="flex items-center gap-1.5 mt-1">
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1 text-slate-500 hover:text-red-650 bg-slate-50 rounded border border-slate-200 hover:border-slate-350 transition-colors shadow-sm"
                                  title="View Attachment"
                                >
                                  <Eye size={10} />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDoc(type)}
                                  className="p-1 text-slate-500 hover:text-red-650 bg-slate-50 rounded border border-slate-200 hover:border-slate-350 transition-colors shadow-sm"
                                  title="Delete Attachment"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center text-center space-y-1.5 cursor-pointer z-10 w-full h-full justify-center group">
                              <UploadCloud size={20} className="text-slate-400 group-hover:text-red-500 transition-colors" />
                              <span className="text-[11px] font-bold text-slate-700">{label}</span>
                              <span className="text-[9px] text-slate-500">PDF, JPG or PNG</span>
                              
                              {/* Actual hidden file input */}
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={e => handleFileChange(type, e)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={submitting}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

            </div>

            {/* BOTTOM SECTION: Submit Button */}
            <div className="mt-8 flex justify-center lg:justify-end">
              <button
                type="submit"
                disabled={submitting || uploadingDoc !== null}
                className="w-full lg:max-w-md py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all focus:ring-4 focus:ring-red-500/10 shadow-lg shadow-red-100 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-95 duration-200"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    <span>Submitting Profile...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Profile & File Revision</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>

          </form>

        </div>

        {/* Security / support notice */}
        <div className="mt-6 text-center text-[10px] text-slate-400 flex items-center justify-center gap-2">
          <span>🔒 All submitted profiles and certificate attachments are fully encrypted and securely stored.</span>
        </div>

      </div>
    </div>
  )
}
