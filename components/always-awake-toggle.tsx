import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettings } from '@/hooks/use-settings'

interface AlwaysAwakeToggleProps {
  active?: boolean
  className?: string
}

export function AlwaysAwakeToggle({ active = true, className }: AlwaysAwakeToggleProps) {
  const { settings, setAlwaysAwake } = useSettings()
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator

  if (!supported) return null

  const enabled = settings.alwaysAwake
  const engaged = enabled && active

  return (
    <button
      type="button"
      onClick={() => setAlwaysAwake(!enabled)}
      data-haptic="selection"
      aria-pressed={enabled}
      className={cn(
        'w-full min-h-[40px] rounded-lg border font-mono text-xs tracking-widest uppercase',
        'flex items-center justify-center gap-2 transition-colors',
        engaged
          ? 'border-neon-yellow/50 bg-neon-yellow/10 text-neon-yellow'
          : enabled
            ? 'border-border text-muted-foreground hover:text-neon-yellow hover:border-neon-yellow/40'
            : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground',
        className,
      )}
    >
      {engaged ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
      {engaged ? 'Screen awake' : enabled ? 'Screen awake (idle)' : 'Screen awake off'}
    </button>
  )
}

export function isWakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator
}
