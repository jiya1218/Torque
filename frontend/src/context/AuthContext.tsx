import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useCacheStore } from '../store/cacheStore';

interface User {
  id: string;
  email: string;
  full_name: string;
  name: string;         // alias for full_name — used by dashboard UI
  phone: string;
  role: string;         // role name string e.g. "Admin"
  role_id: string | null;
  permissions: string[];
  is_active: boolean;
  requiresOnboardingForm?: boolean;
  onboardingRemark?: string | null;
  highestQualification?: string;
  dateOfBirth?: string;
  joiningDate?: string;
  homeMobile?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isPinAuthenticated: boolean;
  setPinAuthenticated: (val: boolean) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isPinAuthenticated: false,
  setPinAuthenticated: () => {},
  logout: async () => {},
  refreshUser: async () => {},
  login: async () => {},
});

const LIVE_API_BASE = 'https://torque-alpha.vercel.app';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPinAuthenticated, setIsPinAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Load cache globally on app startup
    useCacheStore.getState().loadCache().catch(() => {});

    // Safety timeout: never stay loading forever
    const safetyTimeout = setTimeout(() => {
      if (mounted) setIsLoading(false);
    }, 5000);

    // On mount: check existing session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!mounted) return;
        if (session) {
          fetchProfile().finally(() => {
            if (mounted) setIsLoading(false);
          });
        } else {
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn('getSession error:', err);
        if (mounted) setIsLoading(false);
      });

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session) {
        fetchProfile().catch(() => {});
      } else {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile() {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setUser(null);
        return;
      }

      const response = await fetch(`${LIVE_API_BASE}/api/v1/auth/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.warn('Profile fetch failed:', response.status);
        setUser(null);
        return;
      }

      const data = await response.json();

      let requiresOnboardingForm = false;
      let onboardingRemark = null;
      try {
        const statusRes = await fetch(`${LIVE_API_BASE}/api/v1/onboarding/check-form-status`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          requiresOnboardingForm = statusData.requiresForm;
          onboardingRemark = statusData.onboardingRemark;
        }
      } catch (err) {
        console.warn('onboarding status check error:', err);
      }

      if (data && data.id) {
        setUser({
          id: data.id,
          email: data.email,
          full_name: data.full_name || data.fullName || '',
          name: data.full_name || data.fullName || '',
          phone: data.phone || data.personalMobile || '',
          role: data.role?.name || '',
          role_id: data.roleId || data.role_id || null,
          permissions: (data.role?.permissions || []).map((p: any) => p.name),
          is_active: data.is_active ?? data.isActive ?? true,
          requiresOnboardingForm,
          onboardingRemark,
          highestQualification: data.highestQualification || '',
          dateOfBirth: data.dateOfBirth || '',
          joiningDate: data.joiningDate || '',
          homeMobile: data.homeMobile || '',
        });
      }
    } catch (e) {
      console.warn('Profile fetch error:', e);
      setUser(null);
    }
  }

  async function logout() {
    try {
      await useCacheStore.getState().clearCache();
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Logout error:', e);
    }
    setUser(null);
  }

  async function refreshUser() {
    await fetchProfile();
  }

  async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // fetchProfile will be called by onAuthStateChange
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      isPinAuthenticated, 
      setPinAuthenticated: setIsPinAuthenticated,
      logout, 
      refreshUser,
      login
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
