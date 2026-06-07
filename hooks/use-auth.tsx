import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { isSyncAvailable, loginUser, registerUser } from '@/lib/sync/api-client'
import { pullAndMerge } from '@/lib/sync/storage'
import { STORAGE_KEYS, type AuthUser } from '@/lib/sync/types'

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isSyncEnabled: boolean
  isLoading: boolean
  isSyncing: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  syncNow: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredAuth(): { user: AuthUser | null; token: string | null } {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.authToken)
    const userRaw = localStorage.getItem(STORAGE_KEYS.authUser)
    if (!token || !userRaw) return { user: null, token: null }
    return { user: JSON.parse(userRaw) as AuthUser, token }
  } catch {
    return { user: null, token: null }
  }
}

function persistAuth(user: AuthUser, token: string) {
  localStorage.setItem(STORAGE_KEYS.authToken, token)
  localStorage.setItem(STORAGE_KEYS.authUser, JSON.stringify(user))
}

function clearAuth() {
  localStorage.removeItem(STORAGE_KEYS.authToken)
  localStorage.removeItem(STORAGE_KEYS.authUser)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = readStoredAuth()
    setUser(stored.user)
    setToken(stored.token)
    setIsLoading(false)

    if (stored.token && isSyncAvailable()) {
      pullAndMerge(stored.token).catch((err) => {
        console.error('Initial sync failed:', err)
      })
    }
  }, [])

  const syncNow = useCallback(async () => {
    if (!token || !isSyncAvailable()) return
    setIsSyncing(true)
    setError(null)
    try {
      await pullAndMerge(token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
      throw err
    } finally {
      setIsSyncing(false)
    }
  }, [token])

  const login = useCallback(async (email: string, password: string) => {
    setError(null)
    const result = await loginUser(email, password)
    persistAuth(result.user, result.token)
    setUser(result.user)
    setToken(result.token)
    setIsSyncing(true)
    try {
      await pullAndMerge(result.token)
    } finally {
      setIsSyncing(false)
    }
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    setError(null)
    const result = await registerUser(email, password)
    persistAuth(result.user, result.token)
    setUser(result.user)
    setToken(result.token)
    setIsSyncing(true)
    try {
      await pullAndMerge(result.token)
    } finally {
      setIsSyncing(false)
    }
  }, [])

  const logout = useCallback(() => {
    clearAuth()
    setUser(null)
    setToken(null)
    setError(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isSyncEnabled: isSyncAvailable(),
      isLoading,
      isSyncing,
      error,
      login,
      register,
      logout,
      syncNow,
      clearError: () => setError(null),
    }),
    [user, token, isLoading, isSyncing, error, login, register, logout, syncNow],
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
