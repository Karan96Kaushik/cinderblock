import { endOfWeek, parseISO, startOfWeek } from 'date-fns'
import { notifyTrainingLogChanged } from '@/lib/sync/events'

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
  /** User ended before the timer finished all phases */
  endedEarly?: boolean
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
export const DEFAULT_RUNNING_PLAN_STORAGE_KEY = 'cinderblock_default_running_plan'

function isValidRunningPlan(plan: unknown): plan is RunningPlan {
  if (!plan || typeof plan !== 'object') return false
  const p = plan as RunningPlan
  return [p.warmupMinutes, p.runMinutes, p.cooldownMinutes].every(
    (minutes) => typeof minutes === 'number' && minutes > 0 && minutes <= 180,
  )
}

export function readDefaultRunningPlan(): RunningPlan {
  try {
    const raw = localStorage.getItem(DEFAULT_RUNNING_PLAN_STORAGE_KEY)
    if (!raw) return DEFAULT_RUNNING_PLAN
    const parsed = JSON.parse(raw) as unknown
    if (isValidRunningPlan(parsed)) return parsed
  } catch {
    // ignore invalid stored plan
  }
  return DEFAULT_RUNNING_PLAN
}

export function writeDefaultRunningPlan(plan: RunningPlan): void {
  if (!isValidRunningPlan(plan)) return
  localStorage.setItem(DEFAULT_RUNNING_PLAN_STORAGE_KEY, JSON.stringify(plan))
}

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
  /** Run phase ended early; cooldown still in progress */
  runEndedEarly?: boolean
  /** Plan to log once cooldown completes */
  earlyLoggedPlan?: RunningPlan
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

export function writeRunLog(runs: RunSessionLog[], opts?: { silent?: boolean }): void {
  localStorage.setItem(RUN_LOG_STORAGE_KEY, JSON.stringify(runs))
  if (!opts?.silent) notifyTrainingLogChanged()
}

export function saveRunSession(
  plan: RunningPlan,
  date: string,
  options?: { endedEarly?: boolean },
): RunSessionLog {
  const entry: RunSessionLog = {
    id: `${date}-${Date.now()}`,
    date,
    plan,
    completedAt: Date.now(),
    ...(options?.endedEarly ? { endedEarly: true } : {}),
  }
  const next = [entry, ...readRunLog()]
  writeRunLog(next)
  return entry
}

/** Logged plan when ending early: full warmup/cooldown from session, actual run time only */
export function buildLoggedRunPlan(
  plan: RunningPlan,
  phaseIndex: number,
  remainingSeconds: number,
): RunningPlan {
  const runPhaseIndex = PHASE_ORDER.indexOf('run')
  let runMinutes = 0

  if (phaseIndex > runPhaseIndex) {
    runMinutes = plan.runMinutes
  } else if (phaseIndex === runPhaseIndex) {
    const runSeconds = phaseDurationSeconds(plan, 'run')
    const elapsedSeconds = Math.max(0, runSeconds - remainingSeconds)
    runMinutes = elapsedSeconds > 0 ? Math.max(1, Math.round(elapsedSeconds / 60)) : 0
  }

  return {
    warmupMinutes: plan.warmupMinutes,
    runMinutes,
    cooldownMinutes: plan.cooldownMinutes,
  }
}

export function deleteRunSession(id: string): void {
  writeRunLog(readRunLog().filter((run) => run.id !== id))
}

export function removeRunsOlderThan(days: number): void {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  writeRunLog(readRunLog().filter((run) => run.completedAt >= cutoff))
}

export function clearRunLog(): void {
  writeRunLog([])
}

export function plansMatch(a: RunningPlan, b: RunningPlan): boolean {
  return (
    a.warmupMinutes === b.warmupMinutes &&
    a.runMinutes === b.runMinutes &&
    a.cooldownMinutes === b.cooldownMinutes
  )
}

export function getRunTotalMinutes(plan: RunningPlan): number {
  return plan.warmupMinutes + plan.runMinutes + plan.cooldownMinutes
}

export function formatRunSummary(run: RunSessionLog): string {
  const suffix = run.endedEarly ? ' · ended early' : ''
  return `Run ${formatPlanSummary(run.plan)} · ${getRunTotalMinutes(run.plan)} min${suffix}`
}

export function getRunsForDate(runs: RunSessionLog[], date: string): RunSessionLog[] {
  return runs
    .filter((run) => run.date === date)
    .sort((a, b) => b.completedAt - a.completedAt)
}

export function getLastRun(runs: RunSessionLog[]): RunSessionLog | null {
  return runs[0] ?? null
}

export function getCurrentWeekRuns(runs: RunSessionLog[]): RunSessionLog[] {
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  return runs
    .filter((run) => {
      const day = parseISO(`${run.date}T12:00:00`)
      return day >= weekStart && day <= weekEnd
    })
    .sort((a, b) => b.completedAt - a.completedAt)
}

export function groupRunsByDate(runs: RunSessionLog[]): Record<string, RunSessionLog[]> {
  const map: Record<string, RunSessionLog[]> = {}
  for (const run of runs) {
    if (!map[run.date]) map[run.date] = []
    map[run.date].push(run)
  }
  for (const date of Object.keys(map)) {
    map[date].sort((a, b) => b.completedAt - a.completedAt)
  }
  return map
}
