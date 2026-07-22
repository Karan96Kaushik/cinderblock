import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSyncAvailable, loginUser, registerUser } from '@/lib/sync/api-client'
import { pullAndMerge } from '@/lib/sync/storage'
import { STORAGE_KEYS, type AuthUser } from '@/lib/sync/types'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client'
import { pullAndMergeCloudConfig } from '@/lib/supabase/cloud-sync'

export type AuthBackend = 'supabase' | 'api' | null

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  authBackend: AuthBackend
  isAuthenticated: boolean
  /** Existing gym/metrics API sync (VITE_API_URL) */
  isSyncEnabled: boolean
  /** Supabase cloud (settings, plan, backups) */
  isSupabaseEnabled: boolean
  /** Either cloud backend is available for optional sign-in */
  isCloudEnabled: boolean
  isLoading: boolean
  isSyncing: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  syncNow: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredApiAuth(): { user: AuthUser | null; token: string | null } {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.authToken)
    const userRaw = localStorage.getItem(STORAGE_KEYS.authUser)
    if (!token || !userRaw) return { user: null, token: null }
    return { user: JSON.parse(userRaw) as AuthUser, token }
  } catch {
    return { user: null, token: null }
  }
}

function persistApiAuth(user: AuthUser, token: string) {
  localStorage.setItem(STORAGE_KEYS.authToken, token)
  localStorage.setItem(STORAGE_KEYS.authUser, JSON.stringify(user))
}

function clearApiAuth() {
  localStorage.removeItem(STORAGE_KEYS.authToken)
  localStorage.removeItem(STORAGE_KEYS.authUser)
}

function userFromSession(session: Session): AuthUser {
  return {
    id: session.user.id,
    email: session.user.email ?? '',
  }
}

function preferredBackend(): AuthBackend {
  if (isSupabaseConfigured()) return 'supabase'
  if (isSyncAvailable()) return 'api'
  return null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [authBackend, setAuthBackend] = useState<AuthBackend>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | undefined

    async function init() {
      if (isSupabaseConfigured()) {
        const supabase = getSupabase()
        const { data } = await supabase.auth.getSession()
        if (cancelled) return

        if (data.session) {
          setUser(userFromSession(data.session))
          setToken(data.session.access_token)
          setAuthBackend('supabase')
          setIsSyncing(true)
          try {
            await pullAndMergeCloudConfig(data.session.user.id)
          } catch (err) {
            console.error('Initial Supabase sync failed:', err)
          } finally {
            if (!cancelled) setIsSyncing(false)
          }
        }

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
          if (cancelled) return
          if (session) {
            setUser(userFromSession(session))
            setToken(session.access_token)
            setAuthBackend('supabase')
          } else if (preferredBackend() === 'supabase') {
            setUser(null)
            setToken(null)
            setAuthBackend(null)
          }
        })
        unsubscribe = () => listener.subscription.unsubscribe()
      } else {
        const stored = readStoredApiAuth()
        if (cancelled) return
        setUser(stored.user)
        setToken(stored.token)
        if (stored.token) setAuthBackend('api')

        if (stored.token && isSyncAvailable()) {
          pullAndMerge(stored.token).catch((err) => {
            console.error('Initial sync failed:', err)
          })
        }
      }

      if (!cancelled) setIsLoading(false)
    }

    init()

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [])

  const syncNow = useCallback(async () => {
    if (!user) return
    setIsSyncing(true)
    setError(null)
    try {
      if (authBackend === 'supabase') {
        await pullAndMergeCloudConfig(user.id)
      } else if (authBackend === 'api' && token && isSyncAvailable()) {
        await pullAndMerge(token)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
      throw err
    } finally {
      setIsSyncing(false)
    }
  }, [authBackend, token, user])

  const login = useCallback(async (email: string, password: string) => {
    setError(null)
    const backend = preferredBackend()

    if (backend === 'supabase') {
      const { data, error: authError } = await getSupabase().auth.signInWithPassword({
        email,
        password,
      })
      if (authError) throw new Error(authError.message)
      if (!data.session) throw new Error('Sign in failed')

      const nextUser = userFromSession(data.session)
      setUser(nextUser)
      setToken(data.session.access_token)
      setAuthBackend('supabase')
      setIsSyncing(true)
      try {
        await pullAndMergeCloudConfig(nextUser.id)
      } finally {
        setIsSyncing(false)
      }
      return
    }

    if (backend === 'api') {
      const result = await loginUser(email, password)
      persistApiAuth(result.user, result.token)
      setUser(result.user)
      setToken(result.token)
      setAuthBackend('api')
      setIsSyncing(true)
      try {
        await pullAndMerge(result.token)
      } finally {
        setIsSyncing(false)
      }
      return
    }

    throw new Error('Cloud sync is not configured')
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    setError(null)
    const backend = preferredBackend()

    if (backend === 'supabase') {
      const { data, error: authError } = await getSupabase().auth.signUp({
        email,
        password,
      })
      if (authError) throw new Error(authError.message)
      if (!data.session) {
        throw new Error(
          'Account created. Check your email to confirm, then sign in.',
        )
      }

      const nextUser = userFromSession(data.session)
      setUser(nextUser)
      setToken(data.session.access_token)
      setAuthBackend('supabase')
      setIsSyncing(true)
      try {
        await pullAndMergeCloudConfig(nextUser.id)
      } finally {
        setIsSyncing(false)
      }
      return
    }

    if (backend === 'api') {
      const result = await registerUser(email, password)
      persistApiAuth(result.user, result.token)
      setUser(result.user)
      setToken(result.token)
      setAuthBackend('api')
      setIsSyncing(true)
      try {
        await pullAndMerge(result.token)
      } finally {
        setIsSyncing(false)
      }
      return
    }

    throw new Error('Cloud sync is not configured')
  }, [])

  const logout = useCallback(async () => {
    if (authBackend === 'supabase' && isSupabaseConfigured()) {
      await getSupabase().auth.signOut()
    }
    clearApiAuth()
    setUser(null)
    setToken(null)
    setAuthBackend(null)
    setError(null)
  }, [authBackend])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      authBackend,
      isAuthenticated: Boolean(user && token),
      isSyncEnabled: isSyncAvailable(),
      isSupabaseEnabled: isSupabaseConfigured(),
      isCloudEnabled: isSupabaseConfigured() || isSyncAvailable(),
      isLoading,
      isSyncing,
      error,
      login,
      register,
      logout,
      syncNow,
      clearError: () => setError(null),
    }),
    [
      user,
      token,
      authBackend,
      isLoading,
      isSyncing,
      error,
      login,
      register,
      logout,
      syncNow,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
