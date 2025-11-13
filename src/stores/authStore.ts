import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  role: 'admin' | 'editor' | 'viewer' | null;
  workspaceId: string | null;
  isAuthenticated: boolean;
  
  setAuth: (user: User, token: string, refreshToken: string, role?: 'admin' | 'editor' | 'viewer', workspaceId?: string) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
  setRole: (role: 'admin' | 'editor' | 'viewer' | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      role: null,
      workspaceId: null,
      isAuthenticated: false,

      setAuth: (user, token, refreshToken, role, workspaceId) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', token);
          localStorage.setItem('refresh_token', refreshToken);
        }
        set({ user, token, refreshToken, role, workspaceId, isAuthenticated: true });
      },

      clearAuth: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
        }
        set({ user: null, token: null, refreshToken: null, role: null, workspaceId: null, isAuthenticated: false });
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      setRole: (role) =>
        set({ role }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        workspaceId: state.workspaceId,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
