/**
 * src/utils/api.ts
 * Thin fetch wrapper that automatically attaches the Supabase JWT to every request.
 * Always uses the live Vercel backend — localhost is NOT available on mobile.
 */
  import { supabase } from '../lib/supabase';

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
  }
  return 'https://torque-alpha.vercel.app';
};

const BASE_URL = getBaseUrl();

async function getToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function request<T = any>(method: string, path: string, body?: any): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = { method, headers };
  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  // Trim trailing slashes from the path to avoid Next.js redirects
  const cleanPath = path.replace(/\/$/, '');
  const url = `${BASE_URL}/api/v1${cleanPath}`;

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errorMsg = errData.error || errData.detail || errData.message || `HTTP error! status: ${response.status}`;
      throw new Error(errorMsg);
    }
    return response.json() as Promise<T>;
  } catch (err: any) {
    // Re-throw with better error message
    throw new Error(err?.message || 'Network request failed');
  }
}

export const api = {
  get: <T = any>(path: string) => request<T>('GET', path),
  post: <T = any>(path: string, body?: any) => request<T>('POST', path, body),
  put: <T = any>(path: string, body?: any) => request<T>('PUT', path, body),
  patch: <T = any>(path: string, body?: any) => request<T>('PATCH', path, body),
  delete: <T = any>(path: string) => request<T>('DELETE', path),
};
