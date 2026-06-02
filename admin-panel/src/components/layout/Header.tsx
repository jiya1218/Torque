"use client"
import React from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

export default function Header() {
  const router = useRouter()
  const { user } = useAuth()

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 z-20">
      <div className="flex items-center gap-4 flex-1">
        {/* Spacer for hamburger on mobile */}
        <div className="w-10 md:hidden"></div>
        <div className="relative w-full max-w-md hidden md:block">
          <input 
            type="text" 
            placeholder="Search policies, leads..." 
            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors relative">
          🔔
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        <div className="h-8 w-px bg-gray-200 mx-1 hidden md:block"></div>
        <div className="flex items-center gap-2 md:gap-4">
          {user?.isActive === false && (
            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-wider border border-amber-200 rounded-xl animate-pulse flex items-center gap-1 shrink-0">
              ⏳ Pending Approval
            </span>
          )}
          <button className="flex items-center gap-2 p-1 pr-3 hover:bg-gray-100 rounded-full transition-colors">
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white">
              {user?.fullName?.charAt(0) || '👤'}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:inline">{user?.fullName || 'User'}</span>
          </button>
          <button 
            onClick={handleLogout}
            className="text-sm font-semibold text-red-600 hover:text-red-700 px-2 md:px-3 py-1 hover:bg-red-50 rounded-lg transition-all"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
