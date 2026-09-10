export const ACTIVE_REST_TIMER_STORAGE_KEY = 'cinderblock_active_rest_timer'

/** In-progress rest timer persisted across navigation and refresh */
export type ActiveRestTimer = {
  workoutDate: string
  exerciseName: string
  durationSeconds: number
  remainingSeconds: number
  running: boolean
  /** ISO timestamp when the countdown started (null while paused) */
  startedAtIso: string | null
  open: boolean
  finished: boolean
  updatedAtIso: string
}

export type RestoredRestTimerState = {
  duration: number
  remaining: number
  running: boolean
  open: boolean
  finished: boolean
  startedAtIso: string | null
}

function parseIsoTimestamp(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}

function isValidActiveRestTimer(value: unknown): value is ActiveRestTimer {
  if (!value || typeof value !== 'object') return false
  const session = value as ActiveRestTimer
  return (
    typeof session.workoutDate === 'string' &&
    typeof session.exerciseName === 'string' &&
    typeof session.durationSeconds === 'number' &&
    session.durationSeconds > 0 &&
    typeof session.remainingSeconds === 'number' &&
    typeof session.running === 'boolean' &&
    (session.startedAtIso === null || typeof session.startedAtIso === 'string') &&
    typeof session.open === 'boolean' &&
    typeof session.finished === 'boolean'
  )
}

export function matchesRestTimerScope(
  session: ActiveRestTimer,
  workoutDate: string,
  exerciseName: string,
): boolean {
  return session.workoutDate === workoutDate && session.exerciseName === exerciseName
}

export function readActiveRestTimer(): ActiveRestTimer | null {
  try {
    const raw = localStorage.getItem(ACTIVE_REST_TIMER_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!isValidActiveRestTimer(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

export function writeActiveRestTimer(
  session: Omit<ActiveRestTimer, 'updatedAtIso'>,
): void {
  localStorage.setItem(
    ACTIVE_REST_TIMER_STORAGE_KEY,
    JSON.stringify({ ...session, updatedAtIso: new Date().toISOString() }),
  )
}

export function clearActiveRestTimer(): void {
  localStorage.removeItem(ACTIVE_REST_TIMER_STORAGE_KEY)
}

export function restoreActiveRestTimer(session: ActiveRestTimer): RestoredRestTimerState {
  const { durationSeconds, running, open, finished, startedAtIso } = session
  let remainingSeconds = session.remainingSeconds

  if (finished) {
    return {
      duration: durationSeconds,
      remaining: 0,
      running: false,
      open,
      finished: true,
      startedAtIso: null,
    }
  }

  if (running && startedAtIso) {
    const startedAt = parseIsoTimestamp(startedAtIso)
    if (startedAt != null) {
      remainingSeconds = Math.max(
        0,
        durationSeconds - Math.floor((Date.now() - startedAt) / 1000),
      )
    }
  }

  if (remainingSeconds <= 0) {
    return {
      duration: durationSeconds,
      remaining: 0,
      running: false,
      open,
      finished: true,
      startedAtIso: null,
    }
  }

  return {
    duration: durationSeconds,
    remaining: remainingSeconds,
    running,
    open,
    finished: false,
    startedAtIso: running ? startedAtIso : null,
  }
}

export function loadRestTimerState(
  workoutDate: string,
  exerciseName: string,
): RestoredRestTimerState {
  const saved = readActiveRestTimer()
  if (!saved || !matchesRestTimerScope(saved, workoutDate, exerciseName)) {
    return {
      duration: 0,
      remaining: 0,
      running: false,
      open: false,
      finished: false,
      startedAtIso: null,
    }
  }

  const restored = restoreActiveRestTimer(saved)
  if (restored.finished) {
    clearActiveRestTimer()
  }
  return restored
}
