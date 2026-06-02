"use client"
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { User, Mail, Lock, Shield, ArrowRight, AlertCircle } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [roleId, setRoleId] = useState('')
  const [managerId, setManagerId] = useState('')
  const [roles, setRoles] = useState<any[]>([])
  const [managers, setManagers] = useState<any[]>([])
  const [metadataLoading, setMetadataLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await fetch('/api/v1/auth/signup-metadata')
        if (response.ok) {
          const data = await response.json()
          setRoles(data.roles || [])
          setManagers(data.managers || [])
        }
      } catch (err) {
        console.error('Error fetching signup metadata:', err)
      } finally {
        setMetadataLoading(false)
      }
    }
    fetchMetadata()
  }, [])

  const selectedRole = roles.find(r => r.id === roleId)
  const isSalesExecutive = selectedRole?.name?.toLowerCase().includes('sales executive') || selectedRole?.name?.toLowerCase().includes('executive')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: name,
          email,
          password,
          roleId,
          managerId: isSalesExecutive ? managerId : undefined
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account')
      }

      // Automatically redirect them to login
      router.push('/login')
    } catch (err: any) {
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img src="/logo.png?v=3" alt="Torque Auto Advisor" className="h-24 w-auto object-contain" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-brand-dark">
          Create an Account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Join Torque Auto Advisor Management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-gray-100 sm:rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSignup}>
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700">
                Full Name
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <User size={18} />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="appearance-none block w-full pl-10 px-3 py-2 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all sm:text-sm text-gray-900 font-medium"
                  placeholder="Priya Sharma"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail size={18} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full pl-10 px-3 py-2 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all sm:text-sm text-gray-900 font-medium"
                  placeholder="admin@toque.in"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 px-3 py-2 border border-gray-200 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all sm:text-sm text-gray-900 font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-semibold text-gray-700">
                Role
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Shield size={18} />
                </div>
                <select
                  id="role"
                  name="role"
                  required
                  disabled={metadataLoading}
                  value={roleId}
                  onChange={(e) => {
                    setRoleId(e.target.value)
                    const r = roles.find(role => role.id === e.target.value)
                    const isExec = r?.name?.toLowerCase().includes('sales executive') || r?.name?.toLowerCase().includes('executive')
                    if (!isExec) {
                      setManagerId('')
                    }
                  }}
                  className="appearance-none block w-full pl-10 pr-10 px-3 py-2 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all sm:text-sm bg-white"
                >
                  <option value="">{metadataLoading ? 'Loading roles...' : 'Select your role'}</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isSalesExecutive && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <label htmlFor="manager" className="block text-sm font-semibold text-gray-700">
                  Reporting Manager
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <User size={18} />
                  </div>
                  <select
                    id="manager"
                    name="manager"
                    required
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-10 px-3 py-2 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all sm:text-sm bg-white"
                  >
                    <option value="">Select your manager</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName}{m.role?.name ? ` (${m.role.name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-md shadow-red-200 text-sm font-bold text-white bg-brand-primary hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating account...' : 'Sign up'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </div>
            
            <div className="mt-4 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <a href="/login" className="font-semibold text-brand-primary hover:text-red-700">
                Sign in
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
