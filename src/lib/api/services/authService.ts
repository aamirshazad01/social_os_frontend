import apiClient from '../apiClient';
import { handleApiError } from '../errorHandler';
import { AxiosError } from 'axios';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    avatar_url?: string;
  };
}

interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
}

export const authService = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      console.log('🔐 Auth Service: Attempting login with:', { email: credentials.email });
      console.log('🌐 API Base URL:', process.env.NEXT_PUBLIC_API_URL);
      
      // Temporary CORS workaround - add mode: 'cors' explicitly
      const response = await apiClient.post<LoginResponse>('/auth/login', credentials, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      console.log('✅ Auth Service: Login successful');
      return response.data;
    } catch (error) {
      console.error('❌ Auth Service: Login failed:', error);
      if (error instanceof AxiosError) {
        console.error('❌ Error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers
        });
      }
      throw handleApiError(error);
    }
  },

  async register(data: RegisterRequest): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/register', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  async getCurrentUser(): Promise<LoginResponse['user']> {
    try {
      const response = await apiClient.get<LoginResponse['user']>('/auth/me');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async refreshToken(refreshToken: string): Promise<{ access_token: string }> {
    try {
      const response = await apiClient.post<{ access_token: string }>('/auth/refresh', {
        refresh_token: refreshToken,
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async forgotPassword(email: string): Promise<void> {
    try {
      await apiClient.post('/auth/forgot-password', { email });
    } catch (error) {
      throw handleApiError(error);
    }
  },

  async resetPassword(token: string, password: string): Promise<void> {
    try {
      await apiClient.post('/auth/reset-password', { token, password });
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
