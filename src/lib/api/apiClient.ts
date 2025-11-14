import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getSupabaseClient } from '../supabaseClient';

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://social-os-backend-6.onrender.com/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000,
  withCredentials: false, // Disable credentials when backend uses wildcard CORS
});

// Supabase client (browser-only)
const supabase = typeof window !== 'undefined' ? getSupabaseClient() : null;

// Add request interceptor to handle CORS issues
apiClient.interceptors.request.use(
  (config) => {
    // Ensure proper headers for CORS
    if (config.headers) {
      config.headers['Accept'] = 'application/json';
      config.headers['Content-Type'] = 'application/json';
    }
    
    return config;
  },
  (error) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('Request interceptor error:', error);
    }
    return Promise.reject(error);
  }
);

// Request interceptor - Add Supabase access token to all requests
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (supabase && typeof window !== 'undefined') {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (accessToken && config.headers) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors (logging + basic 401 handling)
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        message: error.message,
      });
    }
    
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Unauthorized - redirect to login, Supabase client manages its own session/refresh
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default apiClient;
