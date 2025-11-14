import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getSupabaseClient } from '../supabaseClient';

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://social-os-backend-6.onrender.com/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 15000, // Reduce to 15 seconds for faster failure detection
  withCredentials: false, // Disable credentials when backend uses wildcard CORS
});

// Retry configuration
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // Start with 1 second
const RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504];

// Helper function to check if request should be retried
const shouldRetry = (error: AxiosError): boolean => {
  if (!error.config) return false;
  
  // Retry on network errors
  if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
    return true;
  }
  
  // Retry on specific status codes
  if (error.response && RETRY_STATUS_CODES.includes(error.response.status)) {
    return true;
  }
  
  return false;
};

// Helper function to calculate exponential backoff delay
const getRetryDelay = (retryCount: number): number => {
  return Math.min(RETRY_DELAY * Math.pow(2, retryCount), 10000);
};

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

// Response interceptor - Handle errors with retry logic
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig & { _retryCount?: number };
    
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: config?.url,
        message: error.message,
        code: error.code,
      });
    }
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Unauthorized - redirect to login, Supabase client manages its own session/refresh
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Retry logic
    if (config && shouldRetry(error)) {
      config._retryCount = config._retryCount || 0;
      
      if (config._retryCount < MAX_RETRIES) {
        config._retryCount += 1;
        const delay = getRetryDelay(config._retryCount - 1);
        
        console.log(`[ApiClient] Retrying request to ${config.url} (attempt ${config._retryCount}/${MAX_RETRIES}) after ${delay}ms`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry the request
        return apiClient(config);
      } else {
        console.warn(`[ApiClient] Max retries reached for ${config.url}`);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
