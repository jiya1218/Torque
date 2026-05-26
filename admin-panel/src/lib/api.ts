import { supabase } from './supabase'

export async function fetchApi(path: string, options: RequestInit = {}, retries = 3) {
  const { data: { session } } = await supabase.auth.getSession()
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${session?.access_token}`,
    ...((options.headers as Record<string, string>) || {}),
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(path, {
        ...options,
        headers,
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'An unknown error occurred' }))
        
        if (res.status === 401 && typeof window !== 'undefined') {
          console.error('[api] 401 Unauthorized. Expired or invalid session. Logging out...');
          supabase.auth.signOut().then(() => {
            window.location.href = '/login'
          })
        }

        const errorMsg = error.details 
          ? `${error.error} (${error.details})` 
          : (error.error || `HTTP error! status: ${res.status}`);

        throw new Error(errorMsg)
      }

      return res.json()
    } catch (err: any) {
      if (i === retries - 1) throw err
      console.warn(`[api] Fetch failed, retrying (${i + 1}/${retries})...`, err.message)
      await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)))
    }
  }
}
