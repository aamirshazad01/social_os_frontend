'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '../lib/api/services/authService'
import { useAuthStore } from '../stores/authStore'
import { handleApiError } from '../lib/api/errorHandler'

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

  useEffect(() => {   const checkAuth = async () => {
      const token = localStorage.getItem('auth_token')
      
      if (token && !user) {
        try {
          const userData = await authService.getCurrentUser()
          const refreshToken = localStorage.getItem('refresh_token') || ''
          setAuth(userData, token, refreshToken)
        } catch (error) {
          console.error('Auth check failed:', error)
          clearAuth()
        }
      }
      
      setLoading(false)
    }

    checkAuth()
  }, [])

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const response = await authService.register({ email, password, full_name: fullName })
      setAuth(response.user, response.access_token, response.refresh_token, response.role, response.workspace_id)
      setWorkspaceId(response.workspace_id || null)
      setUserRole(response.role || null)
      router.push('/')
      return { error: null }
    } catch (error) {
      return { error: handleApiError(error) as Error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password })
      setAuth(response.user, response.access_token, response.refresh_token, response.role, response.workspace_id)
      setWorkspaceId(response.workspace_id || null)
      setUserRole(response.role || null)
      router.push('/')
      return { error: null }
    } catch (error) {
      return { error: handleApiError(error) as Error }
    }
  }

  const signOut = async () => {
    await authService.logout()
    clearAuth()
    setWorkspaceId(null)
    setUserRole(null)
    router.push('/login')
  }

  const refreshSession = async () => {
    const token = localStorage.getItem('auth_token')
    if (token && user) {
      try {
        const userData = await authService.getCurrentUser()
        const refreshToken = localStorage.getItem('refresh_token') || ''
        setAuth(userData, token, refreshToken)
      } catch (error) {
        console.error('Error refreshing session:', error)
        clearAuth()
      }
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

