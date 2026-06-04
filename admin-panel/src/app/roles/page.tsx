"use client"
import React, { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { useAuth } from '@/context/AuthContext'
import { useApi } from '@/hooks/useApi'
import {
  Shield, CheckCircle2, Circle, Save,
  ChevronRight, Search, ChevronDown, Plus, Trash2,
  X, AlertCircle, RefreshCw
} from 'lucide-react'

const GROUP_LABELS: Record<string, string> = {
  auth: 'Authentication and security',
  role: 'Role and Permission Management',
  lead: 'Lead Management',
  rate: 'Rate Calculator',
  rto: 'RTO work management',
  vahan: 'Vahan Work Management',
  fitness: 'Fitness Work Management',
  claims: 'Claims Management',
  accounts: 'Accounts and Finance',
  hr: 'HR Management',
  loan: 'Loan department',
  crm: 'CRM System',
  visit: 'Customer Visit Module',
  data: 'Data Management',
  quotation: 'Quotation system',
  dashboard: 'Dashboard and analytics',
  notification: 'Notifications',
  template: 'Template (whatsapp/sms)',
  system: 'Admin panel/System Config',
  user: 'staff and user management',
}

const GROUP_ICONS: Record<string, string> = {
  auth: '🔐', role: '🛡️', user: '👥', lead: '📋', rate: '💰', rto: '🚗',
  vahan: '🚘', fitness: '🔧', claims: '📄', accounts: '💳', hr: '👥',
  loan: '🏦', crm: '🤝', visit: '📍', data: '🗄️',
  quotation: '📊', dashboard: '📈', notification: '🔔',
  template: '💬', system: '⚙️',
}

const GROUP_ORDER = [
  'auth', 'role', 'lead', 'rate', 'rto', 'vahan', 'fitness', 'claims',
  'accounts', 'hr', 'loan', 'crm', 'visit', 'data', 'quotation',
  'dashboard', 'notification', 'template', 'system', 'user'
]

const ACTION_LABELS: Record<string, string> = {
  // auth
  'auth.biometric_enable': 'Biometric Enable',
  'auth.login': 'Login',
  'auth.logout': 'Logout',
  'auth.pin_setup': 'Pin Setup',
  'auth.reset_access': 'Reset Access',
  'auth.session_manage': 'Session Manage',
  // role
  'role.assign_permissions': 'Assign Permission',
  'role.view': 'View',
  'role.create': 'Create',
  'role.delete': 'Delete',
  'role.edit': 'Edit',
  'role.manage_users': 'Manage Users',
  // lead
  'lead.assign': 'Assign',
  'lead.change_status': 'Change Status',
  'lead.create': 'Create',
  'lead.delete': 'Delete',
  'lead.edit': 'Edit',
  'lead.export': 'Export',
  'lead.import': 'Import',
  'lead.view': 'View',
  // rate
  'rate.calculate': 'Calculate',
  'rate.configure_tables': 'Configure Tables',
  'rate.edit_rules': 'Edit Rules',
  'rate.export': 'Export',
  'rate.manage_addons': 'Manage Addons',
  'rate.view': 'View',
  // rto
  'rto.track_payment': 'Track Payment',
  'rto.delete': 'Delete',
  'rto.create': 'Create',
  'rto.edit': 'Edit',
  'rto.update_status': 'Update Status',
  'rto.view': 'View',
  // vahan
  'vahan.create': 'Create',
  'vahan.delete': 'Delete',
  'vahan.edit': 'Edit',
  'vahan.track_payment': 'Track Payment',
  'vahan.update_status': 'Update Status',
  'vahan.view': 'View',
  // fitness
  'fitness.create': 'Create',
  'fitness.edit': 'Edit',
  'fitness.update_status': 'Update Status',
  'fitness.delete': 'Delete',
  'fitness.track_payment': 'Track Payment',
  'fitness.view': 'View',
  // claims
  'claims.create': 'Create',
  'claims.edit': 'Edit',
  'claims.upload_documents': 'Upload Document',
  'claims.delete': 'Delete',
  'claims.update_status': 'Update Status',
  'claims.view': 'View',
  // accounts
  'accounts.create_entry': 'Create Entry',
  'accounts.delete_entry': 'Delete Entry',
  'accounts.edit_entry': 'Edit Entry',
  'accounts.export': 'Export',
  'accounts.manage_salary': 'Manage Salary',
  'accounts.view': 'View',
  'accounts.view_reports': 'View Reports',
  // hr
  'hr.create': 'Create',
  'hr.delete': 'Delete',
  'hr.edit': 'Edit',
  'hr.manage_attendance': 'Manage Attendance',
  'hr.manage_leave': 'Manage Leave',
  'hr.view': 'View',
  'hr.view_performance': 'View Performance',
  // loan
  'loan.create': 'Create',
  'loan.delete': 'Delete',
  'loan.edit': 'Edit',
  'loan.track_conversion': 'Track Conversion',
  'loan.update_status': 'Update Status',
  'loan.view': 'View',
  // crm
  'crm.create': 'Create',
  'crm.delete': 'Delete',
  'crm.edit': 'Edit',
  'crm.manage_followups': 'Manage Followups',
  'crm.view': 'View',
  'crm.view_revenue': 'View Revenue',
  // visit
  'visit.create': 'Create',
  'visit.edit': 'Edit',
  'visit.track_location': 'Track Location',
  'visit.delete': 'Delete',
  'visit.manage_followups': 'Manage Followups',
  'visit.view': 'View',
  // data
  'data.approve_changes': 'Approve Changes',
  'data.create': 'Create',
  'data.delete': 'Delete',
  'data.edit': 'Edit',
  'data.manage_documents': 'Manage Documentation',
  'data.view': 'View',
  // quotation
  'quotation.create': 'Create',
  'quotation.delete': 'Delete',
  'quotation.edit': 'Edit',
  'quotation.generate_pdf': 'Generate PDF',
  'quotation.view': 'View',
  'quotation.share': 'Share',
  'quotation.approve': 'Approve',
  // dashboard
  'dashboard.export': 'Export',
  'dashboard.view_admin': 'View Admin',
  'dashboard.view_agent': 'View Agent',
  'dashboard.view_manager': 'View Manager',
  // notification
  'notification.configure': 'Configure',
  'notification.manage': 'Manage',
  'notification.send': 'Send',
  'notification.view': 'View',
  // template
  'template.create': 'Create',
  'template.delete': 'Delete',
  'template.edit': 'Edit',
  'template.view': 'View',
  // system
  'system.audit_logs_view': 'Audit Logs View',
  'system.settings_manage': 'Settings Manage',
  'system.view': 'View Settings',
  // user
  'user.create': 'Create',
  'user.edit': 'Edit',
  'user.delete': 'Delete',
  'user.view': 'View'
}

export default function RolesPage() {
  const { token, isLoading: authLoading } = useAuth()
  const apiFetch = useApi()

  const [roles, setRoles] = useState<any[]>([])
  const [permissions, setPermissions] = useState<any[]>([])
  const [selectedRole, setSelectedRole] = useState<any>(null)
  const [rolePermissions, setRolePermissions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Create role modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDesc, setNewRoleDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const loadRolePerms = useCallback(async (role: any) => {
    setSelectedRole(role)
    try {
      const res = await apiFetch(`/api/v1/roles/${role.id}`)
      const data = await res.json()
      setRolePermissions(Array.isArray(data.permissions) ? data.permissions.map((p: any) => p.id) : [])
    } catch (err) {
      console.error('Failed to load role permissions', err)
    }
  }, [apiFetch])

  const fetchData = useCallback(async () => {
    if (!token) return
    setIsLoading(true)
    setSaveError('')
    try {
      const [rolesRes, permsRes] = await Promise.all([
        apiFetch('/api/v1/roles'),
        apiFetch('/api/v1/permissions'),
      ])
      const rolesData = await rolesRes.json()
      const permsData = await permsRes.json()
      const safeRoles = Array.isArray(rolesData) ? rolesData : []
      const safePerms = Array.isArray(permsData) ? permsData : []
      setRoles(safeRoles)
      setPermissions(safePerms)
      if (safeRoles.length > 0) {
        await loadRolePerms(safeRoles[0])
      }
    } catch (err) {
      console.error('Fetch error', err)
    } finally {
      setIsLoading(false)
    }
  }, [token, apiFetch, loadRolePerms])

  useEffect(() => {
    if (!authLoading) {
      if (token) fetchData()
      else setIsLoading(false)
    }
  }, [authLoading, token]) // eslint-disable-line

  const toggleUnifiedPermission = (p: any) => {
    const allOn = p.ids.every((id: string) => rolePermissions.includes(id))
    setRolePermissions(prev => {
      if (allOn) {
        return prev.filter(id => !p.ids.includes(id))
      } else {
        return [...new Set([...prev, ...p.ids])]
      }
    })
  }

  const handleSave = async () => {
    if (!selectedRole) return
    setIsSaving(true)
    setSaveError('')
    setSaveSuccess(false)
    try {
      const res = await apiFetch(`/api/v1/roles/${selectedRole.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ permissionIds: rolePermissions }),
      })
      if (res.ok) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
        fetchData()
      } else {
        const d = await res.json()
        setSaveError(d.error || 'Save failed')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateError('')
    try {
      const res = await apiFetch('/api/v1/roles', {
        method: 'POST',
        body: JSON.stringify({ name: newRoleName.trim(), description: newRoleDesc.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCreateError(data.error || 'Failed to create role')
      } else {
        setShowCreateModal(false)
        setNewRoleName('')
        setNewRoleDesc('')
        await fetchData()
        loadRolePerms(data)
      }
    } catch {
      setCreateError('Network error')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteRole = async (role: any, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Delete role "${role.name}"? Users with this role will become unassigned.`)) return
    await apiFetch(`/api/v1/roles/${role.id}`, { method: 'DELETE' })
    if (selectedRole?.id === role.id) { setSelectedRole(null); setRolePermissions([]) }
    fetchData()
  }

  // Group and unify duplicate permissions
  const unifiedPermissions = React.useMemo(() => {
    const map: Record<string, {
      key: string
      displayName: string
      group: string
      ids: string[]
      names: string[]
      description: string
    }> = {}

    permissions.forEach(p => {
      const parts = p.name.split('.')
      let group = parts[0]
      let action = parts.slice(1).join('.')

      // Normalize group names to merge duplicates
      if (group === 'leads') group = 'lead'
      if (group === 'quotations') group = 'quotation'
      if (group === 'roles') group = 'role'
      if (group === 'settings') group = 'system'
      if (group === 'users') group = 'user'

      // Normalize action names
      if (action === 'settings_manage' || action === 'manage') {
        if (group === 'system' || group === 'setting') {
          action = 'settings_manage'
        }
        if (group === 'role') {
          action = 'manage_users'
        }
      }

      const key = `${group}.${action}`

      if (!map[key]) {
        map[key] = {
          key,
          displayName: ACTION_LABELS[key] || action.replace(/_/g, ' '),
          group,
          ids: [],
          names: [],
          description: p.description || ''
        }
      }

      map[key].ids.push(p.id)
      map[key].names.push(p.name)
    })

    return Object.values(map)
  }, [permissions])

  // Build permission groups
  const groups: Record<string, any[]> = {}
  unifiedPermissions.forEach(p => {
    const g = p.group
    if (!groups[g]) groups[g] = []
    groups[g].push(p)
  })

  const orderedGroups = [
    ...GROUP_ORDER.filter(g => groups[g]),
    ...Object.keys(groups).filter(g => !GROUP_ORDER.includes(g)),
  ]

  const filteredGroups = orderedGroups.filter(g =>
    !searchQuery ||
    (GROUP_LABELS[g] || g).toLowerCase().includes(searchQuery.toLowerCase()) ||
    groups[g]?.some(p => 
      p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.names.some((n: string) => n.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  )

  const toggleGroup = (g: string) =>
    setExpandedGroups(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])

  const toggleAllInGroup = (g: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const groupPerms = groups[g] || []
    const allIds = groupPerms.flatMap((p: any) => p.ids)
    const allOn = allIds.every((id: string) => rolePermissions.includes(id))
    setRolePermissions(prev => allOn ? prev.filter(id => !allIds.includes(id)) : [...new Set([...prev, ...allIds])])
  }

  if (authLoading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          <p className="text-sm text-gray-500">Loading auth session…</p>
        </div>
      </AdminLayout>
    )
  }

  if (!token) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-[70vh] gap-4">
          <Shield size={48} className="text-gray-300" />
          <p className="text-lg font-semibold text-gray-600">Not authenticated</p>
          <p className="text-sm text-gray-400">Please log out and log back in to refresh your session.</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {roles.length} roles · {permissions.length} permissions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
              title="Refresh"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
            {saveSuccess && (
              <span className="text-sm text-green-600 font-semibold flex items-center gap-1">
                <CheckCircle2 size={16} /> Saved!
              </span>
            )}
            {saveError && (
              <span className="text-sm text-red-600 font-semibold">{saveError}</span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || !selectedRole}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
            >
              {isSaving
                ? <><RefreshCw size={15} className="animate-spin" /> Saving…</>
                : <><Save size={15} /> Save Changes</>
              }
            </button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* ── Roles Sidebar ── */}
          <div className="w-64 shrink-0 space-y-2">
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Roles ({roles.length})
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-1 text-xs font-bold text-blue-600 px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all"
              >
                <Plus size={12} /> New Role
              </button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : roles.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-gray-400 text-sm">
                No roles found. Click "+ New Role" to add one.
              </div>
            ) : (
              <div className="space-y-1">
                {roles.map(role => (
                  <div key={role.id} className="group relative">
                    <button
                      onClick={() => loadRolePerms(role)}
                      className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${
                        selectedRole?.id === role.id
                          ? 'bg-blue-600 border-blue-600 shadow-lg shadow-blue-100'
                          : 'bg-white border-gray-100 hover:border-blue-200'
                      }`}
                    >
                      <Shield
                        size={16}
                        className={`shrink-0 ${selectedRole?.id === role.id ? 'text-blue-200' : 'text-blue-600'}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${selectedRole?.id === role.id ? 'text-white' : 'text-gray-800'}`}>
                          {role.name}
                        </p>
                        <p className={`text-[10px] truncate ${selectedRole?.id === role.id ? 'text-blue-200' : 'text-gray-400'}`}>
                          {role._count?.users ?? 0} users · {role.permissions?.length ?? 0} perms
                        </p>
                      </div>
                      <ChevronRight
                        size={13}
                        className={`shrink-0 ${selectedRole?.id === role.id ? 'text-blue-200' : 'text-gray-300'}`}
                      />
                    </button>
                    <button
                      onClick={e => handleDeleteRole(role, e)}
                      className="absolute right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all"
                      title="Delete role"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Permissions Panel ── */}
          <div className="flex-1 space-y-4 min-w-0">
            {!selectedRole ? (
              <div className="flex flex-col items-center justify-center py-28 bg-white rounded-2xl border border-gray-100 text-gray-400">
                <Shield size={48} className="mb-4 text-gray-200" />
                <p className="font-semibold text-gray-500">Select a role to manage its permissions</p>
              </div>
            ) : (
              <>
                {/* Toolbar */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                      <Shield size={17} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{selectedRole.name}</p>
                      <p className="text-xs text-gray-500">
                        {unifiedPermissions.filter((p: any) => p.ids.every((id: string) => rolePermissions.includes(id))).length} / {unifiedPermissions.length} permissions selected
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setRolePermissions(permissions.map(p => p.id))}
                      className="text-xs font-bold text-blue-600 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setRolePermissions([])}
                      className="text-xs font-bold text-gray-600 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                    >
                      Clear All
                    </button>
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100">
                      <Search size={13} className="text-gray-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Search permissions…"
                        className="text-sm bg-transparent border-none outline-none w-36 text-gray-700 placeholder-gray-400"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Permission Groups */}
                <div className="space-y-3">
                  {filteredGroups.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
                      No permissions match your search.
                    </div>
                  ) : filteredGroups.map(group => {
                    const isExpanded = expandedGroups.includes(group) || !!searchQuery
                    const groupPerms = groups[group] || []
                    const selectedCount = groupPerms.filter((p: any) => p.ids.every((id: string) => rolePermissions.includes(id))).length
                    const allOn = selectedCount === groupPerms.length && groupPerms.length > 0

                    return (
                      <div key={group} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {/* Group header */}
                        <div
                          onClick={() => toggleGroup(group)}
                          className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-xl shrink-0">
                              {GROUP_ICONS[group] || '🔧'}
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 text-sm">
                                {GROUP_LABELS[group] || group}
                              </h4>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {selectedCount} of {groupPerms.length} selected
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="hidden sm:flex items-center gap-1.5">
                              <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full transition-all"
                                  style={{ width: `${groupPerms.length ? (selectedCount / groupPerms.length) * 100 : 0}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-gray-400 w-8 text-right">
                                {groupPerms.length ? Math.round((selectedCount / groupPerms.length) * 100) : 0}%
                              </span>
                            </div>
                            <button
                              onClick={e => toggleAllInGroup(group, e)}
                              className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg transition-all ${
                                allOn
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                              }`}
                            >
                              {allOn ? 'Deselect All' : 'Select All'}
                            </button>
                            <ChevronDown
                              size={17}
                              className={`text-gray-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </div>
                        </div>

                        {/* Permission items */}
                        {isExpanded && (
                          <div className="px-5 pb-5 pt-3 border-t border-gray-50 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                            {groupPerms.map((p: any) => {
                              const on = p.ids.every((id: string) => rolePermissions.includes(id))
                              return (
                                <div
                                  key={p.key}
                                  onClick={() => toggleUnifiedPermission(p)}
                                  className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                                    on
                                      ? 'bg-blue-50 border-blue-200'
                                      : 'bg-white border-gray-100 hover:border-blue-100 hover:bg-gray-50'
                                  }`}
                                >
                                  {on
                                    ? <CheckCircle2 size={16} className="text-blue-600 shrink-0" />
                                    : <Circle size={16} className="text-gray-300 shrink-0" />
                                  }
                                  <div className="min-w-0">
                                    <p className={`text-sm font-semibold truncate capitalize ${on ? 'text-blue-800' : 'text-gray-700'}`}>
                                      {p.displayName}
                                    </p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Create Role Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Create New Role</h2>
              <button
                onClick={() => { setShowCreateModal(false); setCreateError('') }}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Role Name *</label>
                <input
                  type="text" required autoFocus placeholder="e.g. Sales Manager"
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Description</label>
                <input
                  type="text" placeholder="Optional description"
                  value={newRoleDesc}
                  onChange={e => setNewRoleDesc(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle size={14} /> {createError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setCreateError('') }}
                  className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-200"
                >
                  {creating ? 'Creating…' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
