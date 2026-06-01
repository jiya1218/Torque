"use client"
import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

const FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLScDHP9ixjc19DK9DqlB4ef4PU5BCyZydLVjlUIldU7LYCLbvQ/viewform"

export default function OnboardingFormPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [status, setStatus] = useState<'checking' | 'show' | 'done'>('checking')
  const [countdown, setCountdown] = useState(3)

  // Check if form already filled → redirect to dashboard
  useEffect(() => {
    if (isLoading) return
    if (!user) { router.push('/login'); return }

    const check = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) { setStatus('show'); return }
        const res = await fetch('/api/v1/onboarding/check-form-status', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
        if (res.ok) {
          const data = await res.json()
          if (!data.requiresForm) {
            router.push('/') // already filled, go to dashboard
            return
          }
        }
      } catch (e) { console.error(e) }
      setStatus('show')
    }
    check()
  }, [user, isLoading, router])

  // Polling for form status check
  useEffect(() => {
    if (status !== 'show' || isLoading || !user) return

    const interval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) return
        const res = await fetch('/api/v1/onboarding/check-form-status', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
        if (res.ok) {
          const data = await res.json()
          if (!data.requiresForm) {
            clearInterval(interval)
            setStatus('done')
          }
        }
      } catch (e) {
        console.error('Polling error checking onboarding form status:', e)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [status, isLoading, user])

  // Countdown after submission
  useEffect(() => {
    if (status !== 'done') return
    if (countdown <= 0) { window.location.href = '/'; return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [status, countdown])

  if (isLoading || status === 'checking') {
    return <div style={center}><p>Loading...</p></div>
  }
  if (!user) return null

  if (status === 'done') {
    return (
      <div style={center}>
        <div style={card}>
          <div style={{ fontSize: 48 }}>✅</div>
          <h2 style={{ margin: '12px 0 8px', fontSize: 20 }}>Submitted Successfully</h2>
          <p style={{ color: '#666', fontSize: 14 }}>Redirecting in <b>{countdown}</b>s...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={center}>
      <style>{`
        @keyframes statusPulse {
          0% { transform: scale(0.95); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.6; }
        }
        .status-pulse-dot {
          animation: statusPulse 2s infinite ease-in-out;
        }
      `}</style>
      <div style={card}>
        <div style={logoBadge}>📋</div>
        <h2 style={{ margin: '16px 0 8px', fontSize: 22, fontWeight: 700, color: '#1e293b' }}>
          Complete Onboarding Form
        </h2>
        <p style={{ color: '#64748b', fontSize: 14, lineHeight: '1.5', margin: '0 0 24px' }}>
          Please fill out our Google onboarding form. Once submitted, your profile will be unlocked automatically.
        </p>
        
        <a href={FORM_URL} target="_blank" rel="noopener noreferrer" style={btnPrimary}>
          📋 Fill Form
        </a>

        <div style={divider}>
          <span style={dividerLine}></span>
          <span style={dividerText}>Automated Sync</span>
          <span style={dividerLine}></span>
        </div>

        <div style={statusContainer}>
          <div className="status-pulse-dot" style={pulseCircle}></div>
          <span style={statusText}>
            Waiting for submission...
          </span>
        </div>
        <p style={{ color: '#94a3b8', fontSize: 11, margin: '8px 0 0', lineHeight: 1.4 }}>
          Checking form responses in the background. Please do not close this window.
        </p>
      </div>
    </div>
  )
}

const center: React.CSSProperties = {
  height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'system-ui, -apple-system, sans-serif', background: '#f8fafc'
}
const card: React.CSSProperties = {
  background: '#ffffff', borderRadius: 24, padding: '48px 40px',
  textAlign: 'center', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05)', 
  maxWidth: 420, width: '100%', border: '1px solid #e2e8f0', boxSizing: 'border-box'
}
const logoBadge: React.CSSProperties = {
  width: 64, height: 64, background: '#eff6ff', color: '#1d4ed8', borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center',
  fontSize: 28, margin: '0 auto'
}
const btnPrimary: React.CSSProperties = {
  display: 'inline-block', background: '#2563eb', color: '#fff', textDecoration: 'none',
  borderRadius: 12, padding: '14px 32px', fontSize: 15, fontWeight: 600, width: '100%', 
  boxSizing: 'border-box', boxShadow: '0 4px 6px -1px rgba(37,99,235,0.2)'
}
const divider: React.CSSProperties = {
  display: 'flex', alignItems: 'center', margin: '24px 0', width: '100%'
}
const dividerLine: React.CSSProperties = {
  flex: 1, height: 1, background: '#e2e8f0'
}
const dividerText: React.CSSProperties = {
  padding: '0 12px', fontSize: 12, color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em'
}
const statusContainer: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  background: '#f1f5f9', borderRadius: 12, padding: '12px 16px', border: '1px solid #e2e8f0'
}
const pulseCircle: React.CSSProperties = {
  width: 10, height: 10, background: '#eab308', borderRadius: '50%'
}
const statusText: React.CSSProperties = {
  fontSize: 13, color: '#475569', fontWeight: 600
}
