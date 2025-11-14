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
  role: 'admin' | 'editor' | 'viewer' | null;
  workspaceId: string | null;
  isAuthenticated: boolean;
  
  setAuth: (user: User, role?: 'admin' | 'editor' | 'viewer', workspaceId?: string) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
  setRole: (role: 'admin' | 'editor' | 'viewer' | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      workspaceId: null,
      isAuthenticated: false,

      setAuth: (user, role, workspaceId) => {
        set({ user, role: role ?? null, workspaceId: workspaceId ?? null, isAuthenticated: true });
      },

      clearAuth: () => {
        set({ user: null, role: null, workspaceId: null, isAuthenticated: false });
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
