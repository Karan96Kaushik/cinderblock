import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cloud, Loader2, LogIn, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Haptic } from '@/lib/haptics'
import { useAuth } from '@/hooks/use-auth'
import { paths } from '@/lib/routes'

const SKIP_KEY = 'cinderblock_login_skipped'

export function hasSkippedLogin(): boolean {
  try {
    return sessionStorage.getItem(SKIP_KEY) === '1'
  } catch {
    return false
  }
}

export function markLoginSkipped() {
  try {
    sessionStorage.setItem(SKIP_KEY, '1')
  } catch {
    // ignore
  }
}

/** Full-screen optional sign-in. App works without an account. */
export function LoginScreen() {
  const navigate = useNavigate()
  const {
    isAuthenticated,
    isCloudEnabled,
    isSupabaseEnabled,
    isLoading,
    login,
    register,
    clearError,
    error,
  } = useAuth()

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(paths.home(), { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  const continueLocal = () => {
    markLoginSkipped()
    Haptic.selection()
    navigate(paths.home(), { replace: true })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setLocalError(null)
    clearError()

    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password)
      }
      Haptic.success()
      navigate(paths.home(), { replace: true })
    } catch (err) {
      Haptic.error()
      setLocalError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setSubmitting(false)
    }
  }

  const displayError = localError ?? error

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-neon-orange" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 cyber-grid opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-neon-orange/10 via-transparent to-neon-red/5" />

      <div className="relative max-w-md mx-auto px-4 py-12 flex flex-col min-h-screen justify-center">
        <div className="flex items-center gap-3 mb-8">
          <img
            src="/apple-icon.png"
            alt="CINDERBLOCK"
            className="w-12 h-12 rounded-md object-cover ring-1 ring-neon-orange/30"
          />
          <div>
            <h1 className="font-sans text-2xl font-bold tracking-widest fire-gradient-text neon-text-orange">
              CINDERBLOCK
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">
              Optional cloud sync
            </p>
          </div>
        </div>

        <div className="bg-card/50 border border-border rounded-xl p-5 space-y-5">
          <div className="flex items-start gap-3">
            <Cloud className="w-5 h-5 text-neon-orange shrink-0 mt-0.5" />
            <p className="font-mono text-xs text-muted-foreground leading-relaxed">
              {isSupabaseEnabled
                ? 'Sign in to sync settings, your active run plan, and training backups across devices. You can keep using the app locally without an account.'
                : isCloudEnabled
                  ? 'Sign in to sync workouts and body metrics to the cloud.'
                  : 'Cloud sync is not configured. Continue locally — data stays on this device.'}
            </p>
          </div>

          {isCloudEnabled ? (
            <>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  data-haptic="selection"
                  className={cn(
                    'flex-1 min-h-[40px] rounded-lg font-mono text-xs tracking-wider uppercase transition-colors',
                    mode === 'login'
                      ? 'bg-neon-orange/20 text-neon-orange border border-neon-orange/40'
                      : 'text-muted-foreground border border-border',
                  )}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  data-haptic="selection"
                  className={cn(
                    'flex-1 min-h-[40px] rounded-lg font-mono text-xs tracking-wider uppercase transition-colors',
                    mode === 'register'
                      ? 'bg-neon-orange/20 text-neon-orange border border-neon-orange/40'
                      : 'text-muted-foreground border border-border',
                  )}
                >
                  Register
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 bg-input/60 border border-border rounded-md px-3 font-mono text-sm focus:outline-none focus:border-neon-orange/60"
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 bg-input/60 border border-border rounded-md px-3 font-mono text-sm focus:outline-none focus:border-neon-orange/60"
                  />
                </div>

                {displayError && (
                  <p className="font-mono text-xs text-neon-red">{displayError}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  data-haptic-off="true"
                  className="w-full min-h-[48px] rounded-lg bg-neon-orange text-primary-foreground font-mono text-xs font-bold tracking-widest uppercase hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : mode === 'login' ? (
                    <>
                      <LogIn className="w-4 h-4" />
                      Sign in
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Create account
                    </>
                  )}
                </button>
              </form>
            </>
          ) : null}

          <button
            type="button"
            onClick={continueLocal}
            data-haptic="light"
            className="w-full min-h-[44px] rounded-lg border border-border font-mono text-xs tracking-wider uppercase text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
          >
            Continue without signing in
          </button>
        </div>
      </div>
    </div>
  )
}
