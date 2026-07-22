import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Cloud, CloudOff, Loader2, LogIn, LogOut, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Haptic } from '@/lib/haptics'
import { useAuth } from '@/hooks/use-auth'
import { paths } from '@/lib/routes'

export function AuthPanel() {
  const {
    user,
    isAuthenticated,
    isCloudEnabled,
    isSupabaseEnabled,
    isSyncing,
    error,
    login,
    register,
    logout,
    syncNow,
    clearError,
  } = useAuth()

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

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
      setOpen(false)
      setPassword('')
    } catch (err) {
      Haptic.error()
      setLocalError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setSubmitting(false)
    }
  }

  const displayError = localError ?? error

  if (!isCloudEnabled) {
    return (
      <div
        className="hidden sm:flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground border border-border px-2 py-1 rounded"
        title="Set VITE_SUPABASE_URL / VITE_API_URL to enable cloud sync"
      >
        <CloudOff className="w-3 h-3" />
        LOCAL ONLY
      </div>
    )
  }

  return (
    <div className="relative">
      {isAuthenticated ? (
        <div className="flex items-center gap-2">
          <button
            onClick={() => syncNow().catch(() => undefined)}
            disabled={isSyncing}
            data-haptic="light"
            className="hidden sm:flex items-center gap-1.5 font-mono text-[10px] text-neon-orange border border-neon-orange/30 px-2 py-1 rounded hover:bg-neon-orange/10 transition-colors disabled:opacity-50"
            title={user?.email}
          >
            {isSyncing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Cloud className="w-3 h-3" />
            )}
            SYNCED
          </button>
          <button
            onClick={() => {
              logout().catch(() => undefined)
            }}
            data-haptic="selection"
            className="flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-neon-orange border border-border px-2 py-1 rounded transition-colors min-h-[32px]"
          >
            <LogOut className="w-3 h-3" />
            <span className="hidden sm:inline">OUT</span>
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen((value) => !value)}
          data-haptic="selection"
          className="flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-neon-orange border border-border px-2 py-1 rounded transition-colors min-h-[32px]"
        >
          <LogIn className="w-3 h-3" />
          <span className="hidden sm:inline">SIGN IN</span>
        </button>
      )}

      {open && !isAuthenticated && (
        <>
          <button
            className="fixed inset-0 z-40 bg-background/60"
            aria-label="Close sign in"
            onClick={() => setOpen(false)}
            data-haptic="light"
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-card border border-border rounded-lg p-4 shadow-lg">
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setMode('login')}
                data-haptic="selection"
                className={cn(
                  'flex-1 min-h-[36px] rounded font-mono text-xs tracking-wider uppercase transition-colors',
                  mode === 'login'
                    ? 'bg-neon-orange/20 text-neon-orange border border-neon-orange/40'
                    : 'text-muted-foreground border border-border',
                )}
              >
                Sign in
              </button>
              <button
                onClick={() => setMode('register')}
                data-haptic="selection"
                className={cn(
                  'flex-1 min-h-[36px] rounded font-mono text-xs tracking-wider uppercase transition-colors',
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 bg-input/60 border border-border rounded-md px-3 font-mono text-sm focus:outline-none focus:border-neon-orange/60"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-10 bg-input/60 border border-border rounded-md px-3 font-mono text-sm focus:outline-none focus:border-neon-orange/60"
                />
              </div>

              {displayError && (
                <p className="font-mono text-xs text-neon-red">{displayError}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                data-haptic-off="true"
                className="w-full min-h-[40px] rounded-lg bg-neon-orange text-primary-foreground font-mono text-xs font-bold tracking-widest uppercase hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : mode === 'login' ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    SIGN IN & SYNC
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    CREATE & SYNC
                  </>
                )}
              </button>
            </form>

            <p className="font-mono text-[10px] text-muted-foreground mt-3 leading-relaxed">
              {isSupabaseEnabled
                ? 'When signed in, settings, your active run plan, and backups sync via Supabase.'
                : 'When signed in, workouts and body metrics sync to the cloud. Offline changes merge on login.'}
            </p>

            <Link
              to={paths.login()}
              onClick={() => setOpen(false)}
              className="mt-3 block font-mono text-[10px] text-neon-orange hover:underline"
            >
              Open full sign-in screen →
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
