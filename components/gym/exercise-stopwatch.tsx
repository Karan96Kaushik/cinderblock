import { useMemo } from 'react'
import { ChevronRight, Pause, Play, RotateCcw, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettings } from '@/hooks/use-settings'
import { MediaTrackControls } from '@/components/media-track-controls'
import { AlwaysAwakeToggle } from '@/components/always-awake-toggle'

const BASE_PRESETS = [
  { label: '30s', seconds: 30 },
  { label: '45s', seconds: 45 },
  { label: '1m', seconds: 60 },
] as const

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatPresetLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds % 60 === 0) return `${seconds / 60}m`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function buildPresets(customRestSeconds: number) {
  const custom = { label: formatPresetLabel(customRestSeconds), seconds: customRestSeconds }
  const unique = new Map([...BASE_PRESETS, custom].map((preset) => [preset.seconds, preset]))
  return [...unique.values()].sort((a, b) => a.seconds - b.seconds)
}

/** Opaque floating bar shown when the active timer belongs to another exercise. */
export function RestTimerBar({
  exerciseName,
  remaining,
  running,
  finished,
  onOpen,
}: {
  exerciseName: string
  remaining: number
  running: boolean
  finished: boolean
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      data-haptic="light"
      className={cn(
        'w-full min-h-[44px] rounded-lg border px-3 shadow-lg',
        'flex items-center gap-2 transition-colors',
        'border-neon-orange/50 bg-card text-neon-orange',
      )}
    >
      <Timer className="w-4 h-4 shrink-0" />
      <span className="font-sans text-base font-bold tabular-nums tracking-wider shrink-0">
        {finished ? 'GO!' : formatTime(remaining)}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground truncate">
        {exerciseName}
      </span>
      <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground shrink-0 flex items-center gap-1">
        {finished ? 'Done' : running ? 'Running' : 'Paused'}
        <ChevronRight className="w-3.5 h-3.5" />
      </span>
    </button>
  )
}

export type ExerciseStopwatchProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  duration: number
  remaining: number
  running: boolean
  finished: boolean
  timerActive: boolean
  onSelectPreset: (seconds: number) => void
  onToggleRun: () => void
  onReset: () => void
}

export function ExerciseStopwatch({
  open,
  onOpenChange,
  duration,
  remaining,
  running,
  finished,
  timerActive,
  onSelectPreset,
  onToggleRun,
  onReset,
}: ExerciseStopwatchProps) {
  const { settings } = useSettings()
  const presets = useMemo(
    () => buildPresets(settings.restTimerMinutes * 60),
    [settings.restTimerMinutes],
  )

  const progress = duration > 0 ? remaining / duration : 0
  const activePreset =
    presets.find((preset) => preset.seconds === duration)?.label ??
    (duration > 0 ? formatTime(duration) : undefined)

  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        data-haptic="light"
        className={cn(
          'w-full min-h-[44px] rounded-lg border font-mono text-xs tracking-widest uppercase',
          'flex items-center justify-center gap-2 transition-colors',
          open || running
            ? 'border-neon-orange/50 bg-neon-orange/10 text-neon-orange'
            : 'border-border text-muted-foreground hover:text-neon-orange hover:border-neon-orange/40',
        )}
      >
        <Timer className="w-4 h-4" />
        {running ? `${formatTime(remaining)}` : open ? 'Hide timer' : 'Timer'}
      </button>

      {open && (
        <div
          className={cn(
            'mt-2 rounded-xl border p-4 transition-colors',
            finished
              ? 'border-neon-orange/50 bg-neon-orange/10'
              : 'border-border bg-card/50',
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Rest stopwatch
            </span>
            {activePreset && (
              <span className="font-mono text-[10px] text-neon-orange/80">{activePreset}</span>
            )}
          </div>

          <div
            className={cn(
              'grid gap-2 mb-4',
              presets.length > 3 ? 'grid-cols-2' : 'grid-cols-3',
            )}
          >
            {presets.map((preset) => (
              <button
                key={preset.seconds}
                type="button"
                onClick={() => onSelectPreset(preset.seconds)}
                data-haptic="selection"
                className={cn(
                  'min-h-[40px] rounded-lg border font-mono text-sm font-bold tracking-wider transition-colors',
                  duration === preset.seconds && (running || remaining > 0 || finished)
                    ? 'bg-neon-orange/20 border-neon-orange/50 text-neon-orange'
                    : 'border-border text-muted-foreground hover:border-neon-orange/40 hover:text-neon-orange',
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="relative mb-4">
            <div
              className="absolute inset-0 rounded-lg opacity-20 transition-all duration-300"
              style={{
                background: `conic-gradient(var(--text-accent) ${progress * 360}deg, transparent 0)`,
              }}
            />
            <div
              className={cn(
                'relative rounded-lg border py-6 text-center',
                finished ? 'border-neon-orange/40' : 'border-border/60 bg-background/40',
              )}
            >
              <div
                className={cn(
                  'font-sans text-5xl font-bold tabular-nums tracking-wider',
                  finished ? 'text-neon-orange neon-text-orange' : 'text-foreground',
                )}
              >
                {finished ? 'GO!' : formatTime(remaining)}
              </div>
              <div className="font-mono text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">
                {finished ? 'Rest complete' : running ? 'Running' : remaining > 0 ? 'Paused' : 'Pick a preset'}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onToggleRun}
              disabled={!running && remaining <= 0 && !finished}
              data-haptic="selection"
              className={cn(
                'flex-1 min-h-[44px] rounded-lg font-mono text-xs font-bold tracking-widest uppercase',
                'flex items-center justify-center gap-2 transition-opacity',
                'bg-neon-orange text-primary-foreground hover:opacity-90 disabled:opacity-40',
              )}
            >
              {finished ? (
                <>
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </>
              ) : running ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onReset}
              disabled={duration === 0 && remaining === 0}
              data-haptic="light"
              className="min-h-[44px] px-4 rounded-lg border border-border font-mono text-xs tracking-wider uppercase text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors disabled:opacity-40"
            >
              Reset
            </button>
          </div>

          <MediaTrackControls compact className="mt-3" />
          <AlwaysAwakeToggle active={timerActive} className="mt-2" />
        </div>
      )}
    </div>
  )
}
