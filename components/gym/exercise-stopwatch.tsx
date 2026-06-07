import { useCallback, useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Haptic } from '@/lib/haptics'

const PRESETS = [
  { label: '30s', seconds: 30 },
  { label: '45s', seconds: 45 },
  { label: '1m', seconds: 60 },
] as const

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function ExerciseStopwatch() {
  const [open, setOpen] = useState(false)
  const [duration, setDuration] = useState(0)
  const [remaining, setRemaining] = useState(0)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const endAtRef = useRef<number | null>(null)
  const tickRef = useRef<number | null>(null)

  const clearTick = useCallback(() => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    clearTick()
    setRunning(false)
    endAtRef.current = null
  }, [clearTick])

  const reset = useCallback(() => {
    stop()
    setFinished(false)
    setRemaining(duration)
  }, [stop, duration])

  const startPreset = useCallback(
    (seconds: number) => {
      stop()
      setFinished(false)
      setDuration(seconds)
      setRemaining(seconds)
      setOpen(true)
      endAtRef.current = Date.now() + seconds * 1000
      setRunning(true)
      Haptic.selection()
    },
    [stop],
  )

  useEffect(() => {
    if (!running || endAtRef.current === null) return

    const tick = () => {
      const left = Math.max(0, Math.ceil((endAtRef.current! - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0) {
        clearTick()
        setRunning(false)
        setFinished(true)
        endAtRef.current = null
        Haptic.success()
      }
    }

    tick()
    tickRef.current = window.setInterval(tick, 200)
    return clearTick
  }, [running, clearTick])

  useEffect(() => () => clearTick(), [clearTick])

  const toggleRun = () => {
    if (finished) {
      reset()
      return
    }
    if (running) {
      if (endAtRef.current !== null) {
        setRemaining(Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000)))
      }
      stop()
      Haptic.light()
      return
    }
    if (remaining <= 0 && duration > 0) {
      setRemaining(duration)
    }
    if (remaining <= 0) return
    endAtRef.current = Date.now() + remaining * 1000
    setRunning(true)
    Haptic.selection()
  }

  const progress = duration > 0 ? remaining / duration : 0
  const activePreset = PRESETS.find((p) => p.seconds === duration)?.label

  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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
        {running ? `Rest · ${formatTime(remaining)}` : open ? 'Hide timer' : 'Rest timer'}
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

          {/* Presets */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => startPreset(preset.seconds)}
                data-haptic="selection"
                className={cn(
                  'min-h-[40px] rounded-lg border font-mono text-sm font-bold tracking-wider transition-colors',
                  duration === preset.seconds
                    ? 'bg-neon-orange/20 border-neon-orange/50 text-neon-orange'
                    : 'border-border text-muted-foreground hover:border-neon-orange/40 hover:text-neon-orange',
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Countdown display */}
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

          {/* Controls */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleRun}
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
              onClick={reset}
              disabled={duration === 0 && remaining === 0}
              data-haptic="light"
              className="min-h-[44px] px-4 rounded-lg border border-border font-mono text-xs tracking-wider uppercase text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors disabled:opacity-40"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
