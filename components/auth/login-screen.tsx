import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cloud, KeyRound, Loader2, LogIn, Mail, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Haptic } from '@/lib/haptics'
import { useAuth } from '@/hooks/use-auth'
import { paths } from '@/lib/routes'
import {
  clearLoginSkipped,
  markLoginSkipped,
} from '@/lib/auth/login-skip'

export {
  hasSkippedLogin,
  markLoginSkipped,
  clearLoginSkipped,
} from '@/lib/auth/login-skip'

type AuthMode = 'login' | 'register' | 'forgot' | 'update'

/** Full-screen optional sign-in. App works without an account. */
export function LoginScreen() {
  const navigate = useNavigate()
  const {
    isAuthenticated,
    isCloudEnabled,
    isSupabaseEnabled,
    isPasswordRecovery,
    isLoading,
    login,
    register,
    requestPasswordReset,
    updatePassword,
    clearError,
    error,
  } = useAuth()

  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  // Intentional visit to /login — clear skip cache so redirects work after leaving
  useEffect(() => {
    clearLoginSkipped()
  }, [])

  useEffect(() => {
    if (isPasswordRecovery) {
      setMode('update')
      setLocalError(null)
      setInfoMessage('Choose a new password for your account.')
    }
  }, [isPasswordRecovery])

  useEffect(() => {
    if (!isLoading && isAuthenticated && !isPasswordRecovery && mode !== 'update') {
      clearLoginSkipped()
      navigate(paths.home(), { replace: true })
    }
  }, [isAuthenticated, isLoading, isPasswordRecovery, mode, navigate])

  const continueLocal = () => {
    markLoginSkipped()
    Haptic.selection()
    navigate(paths.home(), { replace: true })
  }

  const switchMode = (next: AuthMode) => {
    setMode(next)
    setLocalError(null)
    setInfoMessage(null)
    clearError()
    setPassword('')
    setConfirmPassword('')
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setLocalError(null)
    setInfoMessage(null)
    clearError()

    try {
      if (mode === 'forgot') {
        await requestPasswordReset(email)
        Haptic.success()
        setInfoMessage('Check your email for a password reset link.')
        return
      }

      if (mode === 'update') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match')
        }
        await updatePassword(password)
        clearLoginSkipped()
        Haptic.success()
        navigate(paths.home(), { replace: true })
        return
      }

      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password)
      }
      clearLoginSkipped()
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

  const showPasswordFields = mode === 'login' || mode === 'register' || mode === 'update'
  const showEmailField = mode !== 'update'
  const title =
    mode === 'forgot'
      ? 'Reset password'
      : mode === 'update'
        ? 'Set new password'
        : mode === 'register'
          ? 'Create account'
          : 'Sign in'

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
              {mode === 'forgot'
                ? 'Enter your account email and we will send a reset link via Supabase Auth.'
                : mode === 'update'
                  ? 'You opened a password recovery link. Set a new password to finish signing in.'
                  : isSupabaseEnabled
                    ? 'Sign in to sync settings and your active run plan, and keep backups private to this device and account. You can keep using the app locally without an account.'
                    : isCloudEnabled
                      ? 'Sign in to sync workouts and body metrics to the cloud.'
                      : 'Cloud sync is not configured. Continue locally — data stays on this device.'}
            </p>
          </div>

          {isCloudEnabled ? (
            <>
              {mode !== 'forgot' && mode !== 'update' && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
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
                    onClick={() => switchMode('register')}
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
              )}

              {(mode === 'forgot' || mode === 'update') && (
                <p className="font-mono text-xs uppercase tracking-wider text-neon-orange">
                  {title}
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                {showEmailField && (
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
                )}

                {showPasswordFields && (
                  <div>
                    <label className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
                      {mode === 'update' ? 'New password' : 'Password'}
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      autoComplete={
                        mode === 'login'
                          ? 'current-password'
                          : mode === 'update'
                            ? 'new-password'
                            : 'new-password'
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-11 bg-input/60 border border-border rounded-md px-3 font-mono text-sm focus:outline-none focus:border-neon-orange/60"
                    />
                  </div>
                )}

                {mode === 'update' && (
                  <div>
                    <label className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
                      Confirm password
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-11 bg-input/60 border border-border rounded-md px-3 font-mono text-sm focus:outline-none focus:border-neon-orange/60"
                    />
                  </div>
                )}

                {displayError && (
                  <p className="font-mono text-xs text-neon-red">{displayError}</p>
                )}

                {infoMessage && (
                  <p className="font-mono text-xs text-neon-yellow">{infoMessage}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  data-haptic-off="true"
                  className="w-full min-h-[48px] rounded-lg bg-neon-orange text-primary-foreground font-mono text-xs font-bold tracking-widest uppercase hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : mode === 'forgot' ? (
                    <>
                      <Mail className="w-4 h-4" />
                      Send reset link
                    </>
                  ) : mode === 'update' ? (
                    <>
                      <KeyRound className="w-4 h-4" />
                      Update password
                    </>
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

              {isSupabaseEnabled && mode === 'login' && (
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  data-haptic="light"
                  className="w-full font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-neon-orange transition-colors"
                >
                  Forgot password?
                </button>
              )}

              {(mode === 'forgot' || (mode === 'update' && !isPasswordRecovery)) && (
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  data-haptic="light"
                  className="w-full font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-neon-orange transition-colors"
                >
                  Back to sign in
                </button>
              )}
            </>
          ) : null}

          {mode !== 'update' && (
            <button
              type="button"
              onClick={continueLocal}
              data-haptic="light"
              className="w-full min-h-[44px] rounded-lg border border-border font-mono text-xs tracking-wider uppercase text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
            >
              Continue without signing in
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
