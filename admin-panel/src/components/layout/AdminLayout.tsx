"use client"
import React from 'react'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { useAuth } from '@/context/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { Home, Users, Calendar, Settings } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [checkingForm, setCheckingForm] = React.useState(true)

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login')
      } else {
        const checkFormStatus = async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.access_token) {
              setCheckingForm(false)
              return
            }
            const response = await fetch('/api/v1/onboarding/check-form-status', {
              headers: { 'Authorization': `Bearer ${session.access_token}` }
            })
            
            let requiresForm = false
            if (response.ok) {
              const data = await response.json()
              requiresForm = data.requiresForm
            }

            const roleName = user.role?.name?.toUpperCase() || ''
            const isAdmin = roleName === 'SUPER ADMIN' || roleName === 'ADMIN'

            if (!isAdmin && requiresForm) {
              window.location.href = '/onboarding/form'
              return
            }
          } catch (err) {
            console.error('Error checking onboarding status:', err)
          }
          setCheckingForm(false)
        }
        checkFormStatus()
      }
    }
  }, [user, isLoading, router])

  if (isLoading || (user && checkingForm)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Sidebar />
      {/* ml-64 only on desktop, full width on mobile, pb-16 to avoid cutting off elements under mobile navigation bar */}
      <div className="md:ml-64 flex flex-col min-h-screen pb-16 md:pb-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Sticky Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex items-center justify-around h-16 px-4 shadow-lg shadow-gray-200/50">
        <Link href="/" className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${pathname === '/' ? 'text-red-600' : 'text-gray-400 hover:text-red-500'}`}>
          <Home size={18} />
          <span className="text-[10px] font-bold tracking-wider">Home</span>
        </Link>
        <Link href="/leads" className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${pathname === '/leads' ? 'text-red-600' : 'text-gray-400 hover:text-red-500'}`}>
          <Users size={18} />
          <span className="text-[10px] font-bold tracking-wider">Leads</span>
        </Link>
        <Link href="/follow-ups" className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${pathname === '/follow-ups' ? 'text-red-600' : 'text-gray-400 hover:text-red-500'}`}>
          <Calendar size={18} />
          <span className="text-[10px] font-bold tracking-wider">Follow-ups</span>
        </Link>
        <Link href="/settings" className={`flex flex-col items-center gap-1 flex-1 py-1 transition-all ${pathname === '/settings' ? 'text-red-600' : 'text-gray-400 hover:text-red-500'}`}>
          <Settings size={18} />
          <span className="text-[10px] font-bold tracking-wider">Settings</span>
        </Link>
      </div>
    </div>
  )
}
