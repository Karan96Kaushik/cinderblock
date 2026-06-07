export type RunningPhase = 'warmup' | 'run' | 'cooldown'

export type RunningPlan = {
  warmupMinutes: number
  runMinutes: number
  cooldownMinutes: number
}

export type RunSessionLog = {
  id: string
  date: string
  plan: RunningPlan
  completedAt: number
}

export const WARMUP_PRESETS_MINUTES = [3, 5, 10, 15] as const
export const RUN_PRESETS_MINUTES = [15, 20, 30, 45, 60] as const
export const COOLDOWN_PRESETS_MINUTES = [3, 5, 10] as const

export const PLAN_PRESETS: Array<RunningPlan & { label: string }> = [
  { label: '5 · 30 · 5', warmupMinutes: 5, runMinutes: 30, cooldownMinutes: 5 },
  { label: '5 · 20 · 5', warmupMinutes: 5, runMinutes: 20, cooldownMinutes: 5 },
  { label: '10 · 45 · 10', warmupMinutes: 10, runMinutes: 45, cooldownMinutes: 10 },
  { label: '5 · 15 · 5', warmupMinutes: 5, runMinutes: 15, cooldownMinutes: 5 },
]

export const DEFAULT_RUNNING_PLAN: RunningPlan = {
  warmupMinutes: 5,
  runMinutes: 30,
  cooldownMinutes: 5,
}

export const PHASE_ORDER: RunningPhase[] = ['warmup', 'run', 'cooldown']

export const PHASE_LABELS: Record<RunningPhase, string> = {
  warmup: 'Warmup',
  run: 'Run',
  cooldown: 'Cooldown',
}

export const PHASE_HINTS: Record<RunningPhase, string> = {
  warmup: 'Easy pace · loosen up',
  run: 'Steady effort · stay relaxed',
  cooldown: 'Slow down · recover',
}

export function planTotalSeconds(plan: RunningPlan): number {
  return (plan.warmupMinutes + plan.runMinutes + plan.cooldownMinutes) * 60
}

export function phaseDurationSeconds(plan: RunningPlan, phase: RunningPhase): number {
  switch (phase) {
    case 'warmup':
      return plan.warmupMinutes * 60
    case 'run':
      return plan.runMinutes * 60
    case 'cooldown':
      return plan.cooldownMinutes * 60
  }
}

export function formatPlanSummary(plan: RunningPlan): string {
  return `${plan.warmupMinutes} · ${plan.runMinutes} · ${plan.cooldownMinutes}`
}

export function formatMinutes(minutes: number): string {
  return `${minutes}m`
}

export function formatTimer(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export const RUN_LOG_STORAGE_KEY = 'cinderblock_run_log'
export const ACTIVE_RUN_STORAGE_KEY = 'cinderblock_active_run'

/** In-progress run persisted for crash / refresh recovery */
export type ActiveRunSession = {
  plan: RunningPlan
  phaseIndex: number
  /** When the current phase countdown started (null while paused) */
  phaseStartedAt: number | null
  remainingSeconds: number
  running: boolean
  started: boolean
  updatedAt: number
}

export type RestoredRunState = {
  plan: RunningPlan
  phaseIndex: number
  remaining: number
  running: boolean
  started: boolean
  finished: boolean
  phaseStartedAt: number | null
}

export function readActiveRunSession(): ActiveRunSession | null {
  try {
    const raw = localStorage.getItem(ACTIVE_RUN_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ActiveRunSession
  } catch {
    return null
  }
}

export function writeActiveRunSession(session: ActiveRunSession): void {
  localStorage.setItem(
    ACTIVE_RUN_STORAGE_KEY,
    JSON.stringify({ ...session, updatedAt: Date.now() }),
  )
}

export function clearActiveRunSession(): void {
  localStorage.removeItem(ACTIVE_RUN_STORAGE_KEY)
}

export function restoreActiveRunSession(session: ActiveRunSession): RestoredRunState {
  const { plan, started } = session

  if (!started) {
    return {
      plan,
      phaseIndex: 0,
      remaining: phaseDurationSeconds(plan, 'warmup'),
      running: false,
      started: false,
      finished: false,
      phaseStartedAt: null,
    }
  }

  let phaseIndex = Math.min(session.phaseIndex, PHASE_ORDER.length - 1)
  let running = session.running
  let phaseStartedAt = session.phaseStartedAt
  let remaining = session.remainingSeconds

  if (running && phaseStartedAt != null) {
    while (phaseIndex < PHASE_ORDER.length) {
      const phase = PHASE_ORDER[phaseIndex]
      const duration = phaseDurationSeconds(plan, phase)
      remaining = duration - Math.floor((Date.now() - phaseStartedAt) / 1000)

      if (remaining > 0) break

      phaseIndex += 1
      if (phaseIndex >= PHASE_ORDER.length) {
        clearActiveRunSession()
        return {
          plan,
          phaseIndex: PHASE_ORDER.length - 1,
          remaining: 0,
          running: false,
          started: true,
          finished: true,
          phaseStartedAt: null,
        }
      }

      phaseStartedAt = Date.now()
      remaining = phaseDurationSeconds(plan, PHASE_ORDER[phaseIndex])
    }
  }

  return {
    plan,
    phaseIndex,
    remaining: Math.max(0, remaining),
    running,
    started: true,
    finished: false,
    phaseStartedAt: running ? phaseStartedAt : null,
  }
}

export function hasResumableRunSession(): boolean {
  const session = readActiveRunSession()
  if (!session?.started) return false
  const restored = restoreActiveRunSession(session)
  return !restored.finished
}

export function readRunLog(): RunSessionLog[] {
  try {
    const raw = localStorage.getItem(RUN_LOG_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RunSessionLog[]
    return [...parsed].sort((a, b) => b.completedAt - a.completedAt)
  } catch {
    return []
  }
}

export function saveRunSession(plan: RunningPlan, date: string): RunSessionLog {
  const entry: RunSessionLog = {
    id: `${date}-${Date.now()}`,
    date,
    plan,
    completedAt: Date.now(),
  }
  const next = [entry, ...readRunLog()]
  localStorage.setItem(RUN_LOG_STORAGE_KEY, JSON.stringify(next))
  return entry
}

export function plansMatch(a: RunningPlan, b: RunningPlan): boolean {
  return (
    a.warmupMinutes === b.warmupMinutes &&
    a.runMinutes === b.runMinutes &&
    a.cooldownMinutes === b.cooldownMinutes
  )
}
