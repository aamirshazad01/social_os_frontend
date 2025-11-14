'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '../stores/authStore'
import { handleApiError } from '../lib/api/errorHandler'
import apiClient from '../lib/api/apiClient'
import { getSupabaseClient } from '../lib/supabaseClient'
import { apiCache } from '../lib/api/cache'
import { ensureBackendAwake, markBackendActive } from '../lib/api/wakeup'

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
  const [authCheckInProgress, setAuthCheckInProgress] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3

  useEffect(() => {
    const supabase = getSupabaseClient()
    let isMounted = true

    const checkAuth = async () => {
      // Prevent multiple simultaneous auth checks
      if (authCheckInProgress) {
        console.log('[AuthContext] Auth check already in progress, skipping')
        return
      }

      setAuthCheckInProgress(true)

      try {
        const { data } = await supabase.auth.getSession()
        const session = data.session

        if (!isMounted) return

        if (session && !user) {
          // We have a Supabase session but no user in store – fetch profile from backend
          try {
            const response = await apiClient.get('/auth/me', {
              timeout: 10000, // Reduce timeout to 10 seconds
            })
            
            if (!isMounted) return

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
            setRetryCount(0) // Reset retry count on success
          } catch (apiError: any) {
            if (!isMounted) return

            console.error('[AuthContext] Failed to fetch user profile:', apiError)
            
            // Handle timeout and network errors with exponential backoff
            if (apiError.code === 'ECONNABORTED' || apiError.code === 'ERR_NETWORK') {
              if (retryCount < maxRetries) {
                const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000)
                console.log(`[AuthContext] Retrying in ${backoffDelay}ms (attempt ${retryCount + 1}/${maxRetries})`)
                
                setTimeout(() => {
                  if (isMounted) {
                    setRetryCount(prev => prev + 1)
                    setAuthCheckInProgress(false)
                  }
                }, backoffDelay)
                return
              } else {
                console.warn('[AuthContext] Max retries reached, clearing auth')
              }
            }
            
            // Clear auth on persistent errors
            clearAuth()
            setWorkspaceId(null)
            setUserRole(null)
          }
        }

        if (!session && user) {
          clearAuth()
          setWorkspaceId(null)
          setUserRole(null)
        }
      } catch (error) {
        if (!isMounted) return
        console.error('[AuthContext] Auth check failed:', error)
        clearAuth()
        setWorkspaceId(null)
        setUserRole(null)
      } finally {
        if (isMounted) {
          setLoading(false)
          setAuthCheckInProgress(false)
        }
      }
    }

    // Only run auth check once on mount
    checkAuth()

    // Listen to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return

      console.log('[AuthContext] Auth state changed:', event)
      
      if (event === 'SIGNED_IN' && session) {
        setAuthCheckInProgress(false)
        checkAuth()
      } else if (event === 'SIGNED_OUT') {
        clearAuth()
        setWorkspaceId(null)
        setUserRole(null)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount]) // Only re-run when retry count changes

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

      // Wake up backend before login to reduce wait time
      console.log('[Auth] Ensuring backend is awake...')
      await ensureBackendAwake()

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        return { error: new Error(signInError.message) }
      }

      try {
        // Load workspace and role from backend using Supabase token
        // Use longer timeout for login to handle backend cold starts
        const response = await apiClient.get('/auth/me', {
          timeout: 30000, // 30 seconds for login (backend cold start)
        })
        
        // Mark backend as active after successful request
        markBackendActive()
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
        
        // Cache user profile for 5 minutes
        apiCache.set('user_profile', profile, 5 * 60 * 1000)
      } catch (error: any) {
        // Provide user-friendly error messages
        if (error.code === 'ECONNABORTED') {
          return { error: new Error('Login timed out. The server might be starting up. Please try again in a moment.') }
        } else if (error.code === 'ERR_NETWORK') {
          return { error: new Error('Network error. Please check your connection and try again.') }
        }
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
        const response = await apiClient.get('/auth/me', {
          timeout: 10000, // 10 seconds for refresh
        })
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
    } catch (error: any) {
      console.error('Error refreshing session:', error)
      // Don't clear auth on timeout - might be temporary
      if (error.code !== 'ECONNABORTED') {
        clearAuth()
        setWorkspaceId(null)
        setUserRole(null)
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

