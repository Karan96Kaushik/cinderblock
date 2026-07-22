import { useNavigate } from 'react-router-dom'
import { Cloud, CloudOff, Loader2, LogIn, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { paths } from '@/lib/routes'
import { clearLoginSkipped } from '@/lib/auth/login-skip'

type AuthPanelProps = {
  /** Called before navigating away (e.g. close parent drawer). */
  onNavigate?: () => void
}

export function AuthPanel({ onNavigate }: AuthPanelProps = {}) {
  const navigate = useNavigate()
  const {
    user,
    isAuthenticated,
    isCloudEnabled,
    isSyncing,
    error,
    logout,
    syncNow,
    clearError,
  } = useAuth()

  const goToLogin = () => {
    clearLoginSkipped()
    onNavigate?.()
    navigate(paths.login())
  }

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

  if (isAuthenticated) {
    const label = isSyncing ? 'SYNCING' : error ? 'SYNC ERR' : 'SYNCED'
    const title = error
      ? `${user?.email ?? 'Signed in'} — ${error}`
      : user?.email

    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            clearError()
            syncNow().catch(() => undefined)
          }}
          disabled={isSyncing}
          data-haptic="light"
          className={`hidden sm:flex items-center gap-1.5 font-mono text-[10px] border px-2 py-1 rounded transition-colors disabled:opacity-50 ${
            error
              ? 'text-destructive border-destructive/40 hover:bg-destructive/10'
              : 'text-neon-orange border-neon-orange/30 hover:bg-neon-orange/10'
          }`}
          title={title}
        >
          {isSyncing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Cloud className="w-3 h-3" />
          )}
          {label}
        </button>
        <button
          type="button"
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
    )
  }

  return (
    <button
      type="button"
      onClick={goToLogin}
      data-haptic="selection"
      className="flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-neon-orange border border-border px-2 py-1 rounded transition-colors min-h-[32px]"
    >
      <LogIn className="w-3 h-3" />
      <span className="hidden sm:inline">IN</span>
    </button>
  )
}
