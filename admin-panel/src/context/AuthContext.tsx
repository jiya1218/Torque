"use client"
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

interface UserProfile {
  id: string
  email: string
  fullName: string
  isActive?: boolean
  role?: {
    name: string
    permissions: Array<{ name: string }>
  }
  permissions: string[]
}

interface AuthContextType {
  user: UserProfile | null
  isLoading: boolean
  permissions: string[]
  token: string | null
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  permissions: [],
  token: null
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)

  const fetchProfile = async (session: any) => {
    if (!session) {
      setUser(null)
      setToken(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const accessToken = session.access_token
    setToken(accessToken)

    try {
      // Small delay to ensure session is fully propagated
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const response = await fetch('/api/v1/auth/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        cache: 'no-store'
      })
      
      if (response.ok) {
        const data = await response.json()
        const rolePermissions = data.role?.permissions?.map((p: any) => p.name) || []
        const userPermissions = data.permissions?.map((p: any) => p.name) || []
        setUser({
          ...data,
          permissions: Array.from(new Set([...rolePermissions, ...userPermissions]))
        })
      } else {
        const errorData = await response.json().catch(() => ({}))
        
        // Handle invalid/expired tokens (401) or missing user profiles (404)
        if (response.status === 401 || response.status === 404) {
          console.error(`[auth-me] Authentication failed (${response.status}). Signing out...`, errorData)
          setUser(null)
          setToken(null)
          setIsLoading(false)
          try {
            await supabase.auth.signOut()
          } catch (err) {
            console.error('[auth-me] Failed to clear Supabase session:', err)
          }
          return
        }

        if (response.status !== 403) {
          console.error('[auth-me] API Error:', response.status, errorData)
        }
        
        // FALLBACK: If API fails for other reasons, use basic session info
        setUser({
          id: session.user.id,
          email: session.user.email,
          fullName: session.user.user_metadata?.full_name || 'Team Member',
          permissions: []
        })
      }
    } catch (error: any) {
      console.error('Failed to fetch profile:', error?.message || error)
      // Fallback for mobile or network interruptions
      setUser({
        id: session.user.id,
        email: session.user.email,
        fullName: session.user.user_metadata?.full_name || 'Team Member',
        permissions: []
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchProfile(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      fetchProfile(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      permissions: user?.permissions || [],
      token
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
