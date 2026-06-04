import { Platform } from 'react-native';
import axios from 'axios';
import { supabase } from './supabase';

// Hardcoded for production builds — env vars are NOT available inside APKs
const LIVE_API_URL = 'https://torque-alpha.vercel.app/api/v1';

const getApiUrl = () => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return 'http://localhost:3000/api/v1';
  }
  return process.env.EXPO_PUBLIC_API_URL || LIVE_API_URL;
};

const API_URL = getApiUrl();

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Supabase JWT Token to all FastAPI requests
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }

  // Trim trailing slashes from the URL to prevent Next.js redirects
  if (config.url) {
    config.url = config.url.replace(/\/$/, '');
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response Interceptor: Handle global errors (e.g., 401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token expiration/logout if necessary
      console.log('Unauthorized API access - Logging out');
      await supabase.auth.signOut();
    }
    return Promise.reject(error);
  }
);
