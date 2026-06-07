import { useCallback, useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { ChevronRight, Pause, Play, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Haptic } from '@/lib/haptics'
import { useWakeLock } from '@/hooks/use-wake-lock'
import { useSettings } from '@/hooks/use-settings'
import { useMediaSession } from '@/hooks/use-media-session'
import { MediaTrackControls } from '@/components/media-track-controls'
import { AlwaysAwakeToggle } from '@/components/always-awake-toggle'
import {
  clearActiveRunSession,
  formatTimer,
  PHASE_HINTS,
  PHASE_LABELS,
  PHASE_ORDER,
  phaseDurationSeconds,
  planTotalSeconds,
  readActiveRunSession,
  restoreActiveRunSession,
  saveRunSession,
  writeActiveRunSession,
  type RunningPlan,
} from '@/lib/running'

interface RunningFlowProps {
  plan: RunningPlan
  onBack: () => void
  onFinish: () => void
}

function loadInitialState(planProp: RunningPlan) {
  const saved = readActiveRunSession()
  if (saved?.started) {
    return restoreActiveRunSession(saved)
  }
  return {
    plan: planProp,
    phaseIndex: 0,
    remaining: phaseDurationSeconds(planProp, 'warmup'),
    running: false,
    started: false,
    finished: false,
    phaseStartedAt: null as number | null,
  }
}

function endAtFromPhaseStart(phaseStartedAt: number, phaseSeconds: number): number {
  return phaseStartedAt + phaseSeconds * 1000
}

export function RunningFlow({ plan: planProp, onBack, onFinish }: RunningFlowProps) {
  const { settings } = useSettings()
  const initial = useRef(loadInitialState(planProp)).current

  const [plan] = useState(initial.plan)
  const [phaseIndex, setPhaseIndex] = useState(initial.phaseIndex)
  const [remaining, setRemaining] = useState(initial.remaining)
  const [running, setRunning] = useState(initial.running)
  const [finished, setFinished] = useState(initial.finished)
  const [phaseStartedAt, setPhaseStartedAt] = useState<number | null>(initial.phaseStartedAt)

  const endAtRef = useRef<number | null>(null)
  const tickRef = useRef<number | null>(null)

  const phase = PHASE_ORDER[phaseIndex]
  const phaseSeconds = phaseDurationSeconds(plan, phase)
  const totalSeconds = planTotalSeconds(plan)

  const elapsedBeforePhase = PHASE_ORDER.slice(0, phaseIndex).reduce(
    (sum, p) => sum + phaseDurationSeconds(plan, p),
    0,
  )
  const elapsedInSession = elapsedBeforePhase + (phaseSeconds - remaining)
  const sessionProgress = totalSeconds > 0 ? elapsedInSession / totalSeconds : 0
  const phaseProgress = phaseSeconds > 0 ? (phaseSeconds - remaining) / phaseSeconds : 0
  const notStarted = !running && !finished && remaining === phaseSeconds && elapsedInSession === 0 && !initial.started
  const sessionActive = !finished && (initial.started || !notStarted)

  useWakeLock(settings.alwaysAwake && sessionActive && !finished)

  const clearTick = useCallback(() => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [])

  const halt = useCallback(() => {
    clearTick()
    endAtRef.current = null
    setRunning(false)
    setPhaseStartedAt(null)
  }, [clearTick])

  const syncEndAtFromPhaseStart = useCallback(
    (startedAt: number, index: number) => {
      const seconds = phaseDurationSeconds(plan, PHASE_ORDER[index])
      endAtRef.current = endAtFromPhaseStart(startedAt, seconds)
    },
    [plan],
  )

  useEffect(() => {
    if (initial.finished) {
      saveRunSession(initial.plan, format(new Date(), 'yyyy-MM-dd'))
      return
    }
    if (initial.running && initial.phaseStartedAt != null) {
      syncEndAtFromPhaseStart(initial.phaseStartedAt, initial.phaseIndex)
    }
  }, [initial, syncEndAtFromPhaseStart])

  const completeSession = useCallback(() => {
    halt()
    setFinished(true)
    clearActiveRunSession()
    saveRunSession(plan, format(new Date(), 'yyyy-MM-dd'))
    Haptic.success()
  }, [halt, plan])

  const advancePhase = useCallback(() => {
    const nextIndex = phaseIndex + 1
    if (nextIndex >= PHASE_ORDER.length) {
      completeSession()
      return
    }
    const nextDuration = phaseDurationSeconds(plan, PHASE_ORDER[nextIndex])
    const startedAt = Date.now()
    setPhaseIndex(nextIndex)
    setRemaining(nextDuration)
    setPhaseStartedAt(startedAt)
    syncEndAtFromPhaseStart(startedAt, nextIndex)
    setRunning(true)
    Haptic.success()
  }, [completeSession, phaseIndex, plan, syncEndAtFromPhaseStart])

  useEffect(() => {
    if (!running || endAtRef.current === null) return

    const tick = () => {
      const left = Math.max(0, Math.ceil((endAtRef.current! - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0) {
        clearTick()
        advancePhase()
      }
    }

    tick()
    tickRef.current = window.setInterval(tick, 200)
    return clearTick
  }, [running, clearTick, advancePhase])

  useEffect(() => () => clearTick(), [clearTick])

  useEffect(() => {
    if (finished) {
      clearActiveRunSession()
      return
    }

    const started = sessionActive && !notStarted
    writeActiveRunSession({
      plan,
      phaseIndex,
      phaseStartedAt: running ? phaseStartedAt : null,
      remainingSeconds: remaining,
      running,
      started,
      updatedAt: Date.now(),
    })
  }, [plan, phaseIndex, phaseStartedAt, remaining, running, finished, sessionActive, notStarted])

  const toggleRun = () => {
    if (finished) return
    if (running) {
      if (endAtRef.current !== null) {
        setRemaining(Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000)))
      }
      halt()
      Haptic.light()
      return
    }
    if (remaining <= 0) return
    const startedAt = Date.now() - (phaseSeconds - remaining) * 1000
    setPhaseStartedAt(startedAt)
    syncEndAtFromPhaseStart(startedAt, phaseIndex)
    setRunning(true)
    Haptic.selection()
  }

  const skipPhase = () => {
    halt()
    advancePhase()
    Haptic.warning()
  }

  const startSession = () => {
    const startedAt = Date.now()
    setRemaining(phaseSeconds)
    setPhaseStartedAt(startedAt)
    syncEndAtFromPhaseStart(startedAt, phaseIndex)
    setRunning(true)
    Haptic.selection()
  }

  const toggleRunRef = useRef(toggleRun)
  toggleRunRef.current = toggleRun

  useMediaSession({
    enabled: sessionActive,
    title: `${PHASE_LABELS[phase]} · ${formatTimer(remaining)}`,
    artist: 'CINDERBLOCK Run',
    album: `${plan.warmupMinutes} · ${plan.runMinutes} · ${plan.cooldownMinutes}`,
    playbackState: running ? 'playing' : 'paused',
    duration: phaseSeconds,
    position: Math.max(0, phaseSeconds - remaining),
    enableTrackControls: true,
    onPlay: () => toggleRunRef.current(),
    onPause: () => toggleRunRef.current(),
  })

  if (finished) {
    return (
      <div className="px-4 py-8 flex flex-col items-center text-center min-h-[60vh] justify-center">
        <div className="bg-neon-orange/10 border border-neon-orange/30 rounded-xl p-8 w-full max-w-md">
          <div className="font-sans text-2xl font-bold text-neon-orange neon-text-orange mb-2">
            RUN COMPLETE
          </div>
          <p className="font-mono text-xs text-muted-foreground mb-6">
            {plan.warmupMinutes}m warmup · {plan.runMinutes}m run · {plan.cooldownMinutes}m cooldown
          </p>
          <button
            type="button"
            onClick={onFinish}
            data-haptic="success"
            className="w-full min-h-[48px] rounded-lg bg-neon-orange text-primary-foreground font-mono text-sm font-bold tracking-widest uppercase hover:opacity-90 transition-opacity neon-border-orange"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  const resumed = initial.started && !initial.finished

  return (
    <div className="px-4 pb-32">
      {resumed && (
        <div className="mt-2 mb-4 rounded-lg border border-neon-yellow/30 bg-neon-yellow/5 px-3 py-2">
          <p className="font-mono text-xs text-neon-yellow">Session restored after refresh</p>
        </div>
      )}

      <div className="flex gap-2 mb-6 pt-2">
        {PHASE_ORDER.map((p, i) => {
          const isCurrent = i === phaseIndex
          const isPast = i < phaseIndex
          return (
            <div key={p} className="flex-1">
              <div
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  isPast && 'bg-neon-orange',
                  isCurrent && 'bg-neon-orange/50',
                  !isPast && !isCurrent && 'bg-border',
                )}
              />
              <p
                className={cn(
                  'font-mono text-[9px] uppercase tracking-wider mt-1.5 text-center',
                  isCurrent ? 'text-neon-orange' : isPast ? 'text-muted-foreground' : 'text-muted-foreground/50',
                )}
              >
                {PHASE_LABELS[p]}
              </p>
            </div>
          )
        })}
      </div>

      <div className="mb-6">
        <div className="h-1 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-neon-orange/70 transition-all duration-300"
            style={{ width: `${sessionProgress * 100}%` }}
          />
        </div>
        <p className="font-mono text-[10px] text-muted-foreground mt-1 text-center">
          {Math.round(sessionProgress * 100)}% of session
        </p>
      </div>

      <div className="text-center mb-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-neon-orange mb-2">
          {PHASE_LABELS[phase]}
        </p>
        <h2 className="font-sans text-3xl sm:text-4xl font-bold text-foreground uppercase tracking-wide mb-2">
          {PHASE_LABELS[phase]}
        </h2>
        <p className="font-mono text-xs text-muted-foreground">{PHASE_HINTS[phase]}</p>
      </div>

      <div className="relative mb-8 max-w-sm mx-auto">
        <div
          className="absolute inset-0 rounded-2xl opacity-20 transition-all duration-300"
          style={{
            background: `conic-gradient(var(--text-accent) ${phaseProgress * 360}deg, transparent 0)`,
          }}
        />
        <div className="relative rounded-2xl border border-border/60 bg-card/50 py-10 text-center">
          <div className="font-sans text-6xl sm:text-7xl font-bold tabular-nums tracking-wider text-foreground">
            {formatTimer(remaining)}
          </div>
          <div className="font-mono text-[10px] text-muted-foreground mt-2 uppercase tracking-wider">
            {running ? 'In progress' : notStarted ? 'Ready' : 'Paused'}
          </div>
        </div>
      </div>

      <div className="max-w-sm mx-auto space-y-3">
        {notStarted ? (
          <button
            type="button"
            onClick={startSession}
            data-haptic="success"
            className="w-full min-h-[52px] rounded-lg bg-neon-orange text-primary-foreground font-mono text-sm font-bold tracking-widest uppercase hover:opacity-90 transition-opacity neon-border-orange flex items-center justify-center gap-2"
          >
            Start run
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={toggleRun}
              data-haptic="selection"
              className="flex-1 min-h-[48px] rounded-lg bg-neon-orange text-primary-foreground font-mono text-xs font-bold tracking-widest uppercase hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              {running ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Resume
                </>
              )}
            </button>
            <button
              type="button"
              onClick={skipPhase}
              data-haptic="warning"
              className="min-h-[48px] px-4 rounded-lg border border-border font-mono text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors flex items-center justify-center gap-2"
            >
              <SkipForward className="w-4 h-4" />
              Skip
            </button>
          </div>
        )}

        <AlwaysAwakeToggle active={sessionActive} />
        <MediaTrackControls />

        <button
          type="button"
          onClick={onBack}
          data-haptic="light"
          className="w-full min-h-[40px] rounded-lg border border-border font-mono text-xs tracking-widest uppercase text-muted-foreground hover:text-neon-orange hover:border-neon-orange/40 transition-colors"
        >
          Back to plan
        </button>
      </div>
    </div>
  )
}
