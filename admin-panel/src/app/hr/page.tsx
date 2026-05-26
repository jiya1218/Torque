"use client"
import React, { useState, useEffect } from 'react'
import AdminLayout from '@/components/layout/AdminLayout'
import { fetchApi } from '@/lib/api'
import { Plus, Search, Mail, Phone, MapPin, Shield, Activity, DollarSign, UserCheck, UserMinus, X, Lock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'

export default function HRPage() {
  const { user, permissions } = useAuth()
  const router = useRouter()
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [roles, setRoles] = useState<any[]>([])
  const [newEmployee, setNewEmployee] = useState({
    fullName: '',
    email: '',
    password: '',
    roleId: '',
    joiningDate: new Date().toISOString().split('T')[0]
  })

  const hasAccess = permissions.includes('users.view')

  useEffect(() => {
    if (!hasAccess && user) {
      router.push('/')
    }
  }, [hasAccess, user, router])

  useEffect(() => {
    if (hasAccess) {
      fetchData()
      fetchRoles()
    }
  }, [hasAccess])

  if (!hasAccess) return null

  const fetchData = async () => {
    setLoading(true)
    try {
      const data = await fetchApi('/api/v1/users')
      setEmployees(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch employees:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const data = await fetchApi('/api/v1/roles')
      setRoles(data)
    } catch {}
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fetchApi('/api/v1/users', {
        method: 'POST',
        body: JSON.stringify(newEmployee)
      })
      setIsModalOpen(false)
      fetchData()
      alert('Employee added successfully!')
    } catch (error: any) {
      alert(error.message || 'Failed to add employee')
    }
  }

  const filteredEmployees = employees.filter(emp => 
    emp.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    emp.email?.toLowerCase().includes(search.toLowerCase()) ||
    emp.role?.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">HR / Employee Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage staff roles, salaries, and attendance.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
        >
          <Plus size={20} />
          Add Employee
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <StatCard title="Total Staff" value={employees.length} icon={<Shield className="text-blue-600" />} color="bg-blue-50" />
        <StatCard title="Active Now" value={employees.filter(e => e.isActive).length} icon={<UserCheck className="text-green-600" />} color="bg-green-50" />
        <StatCard title="On Leave" value={0} icon={<UserMinus className="text-amber-600" />} color="bg-amber-50" />
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mt-8">
        <div className="p-6 border-b border-gray-50 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search employees by name, email or role..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Role & Dept</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Joining Date</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">Loading...</td></tr>
              ) : filteredEmployees.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">No employees found.</td></tr>
              ) : filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold uppercase">
                        {emp.fullName?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{emp.fullName}</div>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                          <Mail size={10} /> {emp.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-sm font-medium text-gray-900">{emp.role?.name || 'No Role'}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Insurance Dept</div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      emp.isActive ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-700 border-gray-100'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${emp.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {emp.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm text-gray-600">
                    {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : 'Not Set'}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button className="text-blue-600 font-bold text-xs hover:underline">View Profile</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900">Add New Employee</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-all">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                <input required value={newEmployee.fullName} onChange={e => setNewEmployee({...newEmployee, fullName: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="Rajesh Kumar" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                <input required type="email" value={newEmployee.email} onChange={e => setNewEmployee({...newEmployee, email: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="rajesh@example.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Temporary Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input required type="password" value={newEmployee.password} onChange={e => setNewEmployee({...newEmployee, password: e.target.value})}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" placeholder="••••••••" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assign Role</label>
                <select required value={newEmployee.roleId} onChange={e => setNewEmployee({...newEmployee, roleId: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none">
                  <option value="">Choose a role...</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Joining Date</label>
                <input type="date" value={newEmployee.joiningDate} onChange={e => setNewEmployee({...newEmployee, joiningDate: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none" />
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg mt-2">
                Create Employee Account
              </button>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

function StatCard({ title, value, icon, color }: any) {
  return (
    <div className={`p-6 rounded-2xl border border-gray-100 shadow-sm ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className="p-3 bg-white rounded-xl shadow-sm">
          {icon}
        </div>
      </div>
    </div>
  )
}
