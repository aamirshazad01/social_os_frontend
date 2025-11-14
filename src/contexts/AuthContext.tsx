'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '../stores/authStore'
import { handleApiError } from '../lib/api/errorHandler'
import apiClient from '../lib/api/apiClient'
import { getSupabaseClient } from '../lib/supabaseClient'

interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null
  loading: boolean
  workspaceId: string | null
  userRole: 'admin' | 'editor' | 'viewer' | null
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, setAuth, clearAuth, isAuthenticated } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<'admin' | 'editor' | 'viewer' | null>(null)

  useEffect(() => {
    const supabase = getSupabaseClient()

    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const session = data.session

        if (session && !user) {
          // We have a Supabase session but no user in store – fetch profile from backend
          const response = await apiClient.get('/auth/me')
          const profile = response.data as {
            id: string
            email: string
            full_name: string | null
            workspace_id: string | null
            role: 'admin' | 'editor' | 'viewer'
          }

          const userData = {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name ?? '',
          }

          setAuth(userData, profile.role, profile.workspace_id ?? undefined)
          setWorkspaceId(profile.workspace_id)
          setUserRole(profile.role)
        }

        if (!session) {
          clearAuth()
          setWorkspaceId(null)
          setUserRole(null)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        clearAuth()
        setWorkspaceId(null)
        setUserRole(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [user, setAuth, clearAuth])

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const supabase = getSupabaseClient()

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) {
        return { error: new Error(error.message) }
      }

      // Do not auto-login; require explicit sign-in after confirmation
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const supabase = getSupabaseClient()

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        return { error: new Error(signInError.message) }
      }

      try {
        // Load workspace and role from backend using Supabase token
        const response = await apiClient.get('/auth/me')
        const profile = response.data as {
          id: string
          email: string
          full_name: string | null
          workspace_id: string | null
          role: 'admin' | 'editor' | 'viewer'
        }

        const userData = {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name ?? '',
        }

        setAuth(userData, profile.role, profile.workspace_id ?? undefined)
        setWorkspaceId(profile.workspace_id)
        setUserRole(profile.role)
      } catch (error) {
        return { error: handleApiError(error) as Error }
      }

      router.push('/')
      return { error: null }
    } catch (error) {
      return { error: error as Error }
    }
  }

  const signOut = async () => {
    const supabase = getSupabaseClient()
    await supabase.auth.signOut()
    clearAuth()
    setWorkspaceId(null)
    setUserRole(null)
    router.push('/login')
  }

  const refreshSession = async () => {
    const supabase = getSupabaseClient()

    try {
      const { data } = await supabase.auth.getSession()
      const session = data.session

      if (session) {
        const response = await apiClient.get('/auth/me')
        const profile = response.data as {
          id: string
          email: string
          full_name: string | null
          workspace_id: string | null
          role: 'admin' | 'editor' | 'viewer'
        }

        const userData = {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name ?? '',
        }

        setAuth(userData, profile.role, profile.workspace_id ?? undefined)
        setWorkspaceId(profile.workspace_id)
        setUserRole(profile.role)
      } else {
        clearAuth()
        setWorkspaceId(null)
        setUserRole(null)
      }
    } catch (error) {
      console.error('Error refreshing session:', error)
      clearAuth()
      setWorkspaceId(null)
      setUserRole(null)
    }
  }

  const value = {
    user,
    loading,
    workspaceId,
    userRole,
    signUp,
    signIn,
    signOut,
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

