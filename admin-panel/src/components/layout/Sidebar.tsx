"use client"
import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'

const MENU_GROUPS = [
  {
    label: 'OVERVIEW',
    items: [
      { name: 'Dashboard', href: '/' },
      { name: 'Reports', href: '/reports' },
    ]
  },
  {
    label: 'SALES',
    items: [
      { name: 'Leads', href: '/leads' },
      { name: 'Import Leads', href: '/data/import' },
      { name: 'CRM', href: '/crm' },
      { name: 'Quotations', href: '/quotations' },
      { name: 'Policies', href: '/policies' },
      { name: 'Follow-ups', href: '/follow-ups' },
    ]
  },
  {
    label: 'OPERATIONS',
    items: [
      { name: 'Claims', href: '/claims' },
      { name: 'Loans', href: '/loans' },
      { name: 'RTO Work', href: '/rto' },
      { name: 'Fitness', href: '/fitness' },
    ]
  },
  {
    label: 'MANAGEMENT',
    items: [
      { name: 'Users', href: '/users' },
      { name: 'Onboarding Approvals', href: '/users/onboarding' },
      { name: 'Roles & Permissions', href: '/roles' },
      { name: 'Data Approvals', href: '/data' },
      { name: 'Finance', href: '/finance' },
      { name: 'HR', href: '/hr' },
      { name: 'Lead Responses', href: '/settings/responses' },
      { name: 'Quotation Rates', href: '/settings/rates' },
      { name: 'Settings', href: '/settings' },
    ]
  }
]

export default function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { user } = useAuth()

  // Close sidebar on route change (mobile)
  useEffect(() => { setOpen(false) }, [pathname])

  const role = (user?.role?.name || 'EXECUTIVE').toUpperCase()
  const isExecutive = role.endsWith('EXECUTIVE') || role === 'VIEWER'

  const filteredGroups = MENU_GROUPS.map(group => {
    let items = group.items

    if (isExecutive) {
      // Hide most admin and oversight items for Executives
      if (group.label === 'MANAGEMENT') return null
      if (group.label === 'OPERATIONS') {
        items = items.filter(i => ['Claims', 'Loans'].includes(i.name))
      }
      items = items.filter(i => !['CRM', 'Reports'].includes(i.name))
    } else if (role === 'MANAGER') {
      // Strict role-based filtering for Managers
      if (group.label === 'OPERATIONS') return null
      if (group.label === 'SALES') {
        items = items.filter(i => ['Leads', 'CRM', 'Quotations', 'Follow-ups'].includes(i.name))
      }
      if (group.label === 'MANAGEMENT') {
        items = items.filter(i => ['Users', 'Settings'].includes(i.name))
      }
    }

    return { ...group, items }
  }).filter(Boolean) as typeof MENU_GROUPS

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-md border border-gray-200 md:hidden"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {/* Overlay (mobile only) */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 z-50
        transition-transform duration-200 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <div className="p-6 pl-4 pr-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png?v=3" alt="Torque Auto Advisor" className="h-16 w-auto -ml-1 object-contain" />
          </div>
          <button onClick={() => setOpen(false)} className="md:hidden p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar space-y-5">
          {filteredGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                {group.label}
              </p>
              {group.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all mb-0.5 ${
                      isActive 
                        ? 'bg-red-600 text-white shadow-lg shadow-red-200' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-red-600'
                    }`}
                  >
                    {item.name}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="px-4 py-3 mb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Logged in as</p>
            <p className="text-xs font-bold text-gray-700 truncate">{user?.fullName || 'User'}</p>
            <p className="text-[10px] font-medium text-red-600 uppercase">{role}</p>
            {user?.isActive === false && (
              <span className="inline-block mt-2 px-2 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-black uppercase tracking-wider border border-amber-200 rounded-lg animate-pulse">
                ⏳ Pending Approval
              </span>
            )}
          </div>
          <button 
            onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-all"
          >
            Logout
          </button>
        </div>
      </div>
    </>
  )
}
