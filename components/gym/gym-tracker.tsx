import { useState, useEffect, useCallback } from 'react'
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import {
  getProgramWorkout,
  isProgramWorkoutKey,
  isTimedHoldExercise,
  program,
  REST_DAY_KEY,
  type ProgramExercise,
  type ProgramWorkoutKey,
  type WorkoutKey,
} from '@/lib/program'
import { readGymLog, saveGymLog } from '@/lib/sync/storage'
import { readRunLog, type RunSessionLog } from '@/lib/running'
import { isValidDateParam, parseGymPath, paths, type GymView } from '@/lib/routes'
import { WorkoutCalendar } from './workout-calendar'
import { WorkoutExplore } from './workout-explore'
import { WorkoutSelector } from './workout-selector'
import { WorkoutFlow } from './workout-flow'

export type { ProgramExercise, ProgramWorkoutKey, WorkoutKey } from '@/lib/program'
export { getWorkoutLabel, program } from '@/lib/program'

export type SetLog = { weight: string; reps: string; seconds?: string }

export function createEmptySet(exercise: ProgramExercise): SetLog {
  if (isTimedHoldExercise(exercise)) {
    return { weight: '', reps: '', seconds: '' }
  }
  return { weight: '', reps: '' }
}

export function hasSetLogData(set: SetLog): boolean {
  return Boolean(set.weight.trim() || set.reps.trim() || set.seconds?.trim())
}

export type ExerciseLog = {
  sets: SetLog[]
  completed: boolean
  skipped?: boolean
}

export type DayLog = {
  workoutKey: WorkoutKey | string
  exercises: Record<string, ExerciseLog>
}

export type GymStore = Record<string, DayLog>

export function isExerciseAddressed(log: ExerciseLog | undefined): boolean {
  if (!log) return false
  return log.completed || Boolean(log.skipped)
}

export type DayStatus = 'complete' | 'partial' | 'rest' | 'empty'

export type ExerciseStatus = 'done' | 'skipped' | 'logged' | 'pending'

export function hasLoggedSetData(log: ExerciseLog | undefined): boolean {
  if (!log) return false
  return log.sets.some(hasSetLogData)
}

export function getExerciseStatus(log: ExerciseLog | undefined): ExerciseStatus {
  if (!log) return 'pending'
  if (log.completed) return 'done'
  if (log.skipped) return 'skipped'
  if (hasLoggedSetData(log)) return 'logged'
  return 'pending'
}

export function formatSetSummary(log: ExerciseLog): string | null {
  const parts = log.sets
    .map((set) => {
      const seconds = set.seconds?.trim()
      if (seconds) return `${seconds}s`
      const weight = set.weight.trim()
      const reps = set.reps.trim()
      if (weight && reps) return `${weight}kg × ${reps}`
      if (weight) return `${weight}kg`
      if (reps) return `${reps} reps`
      return null
    })
    .filter(Boolean)

  return parts.length > 0 ? parts.join(' · ') : null
}

export type LastExerciseRecord = {
  date: string
  log: ExerciseLog
}

/** Most recent logged sets for an exercise on a day before `beforeDate`. */
export function getLastExerciseRecord(
  store: GymStore,
  exerciseName: string,
  beforeDate: string,
): LastExerciseRecord | null {
  const dates = Object.keys(store)
    .filter((d) => d < beforeDate)
    .sort((a, b) => b.localeCompare(a))

  for (const date of dates) {
    const dayLog = store[date]
    if (!dayLog || dayLog.workoutKey === REST_DAY_KEY) continue

    const exerciseLog = dayLog.exercises[exerciseName]
    if (!exerciseLog || !hasLoggedSetData(exerciseLog)) continue

    return { date, log: exerciseLog }
  }

  return null
}

export function getDayStatus(log: DayLog | undefined): DayStatus {
  if (!log) return 'empty'
  if (log.workoutKey === REST_DAY_KEY) return 'rest'
  const exercises = Object.values(log.exercises)
  if (exercises.length === 0) return 'empty'
  if (exercises.every((e) => isExerciseAddressed(e))) return 'complete'
  return 'partial'
}

export function isDayComplete(log: DayLog | undefined): boolean {
  return getDayStatus(log) === 'complete' || getDayStatus(log) === 'rest'
}

export function getLastWorkoutEntry(
  store: GymStore,
): { date: string; log: DayLog } | null {
  const dates = Object.keys(store).sort((a, b) => b.localeCompare(a))
  for (const date of dates) {
    const log = store[date]
    if (log && log.workoutKey !== REST_DAY_KEY) return { date, log }
  }
  return null
}

export function getIncompleteWorkoutEntry(
  store: GymStore,
): { date: string; log: DayLog } | null {
  const entry = getLastWorkoutEntry(store)
  if (!entry) return null
  if (getDayStatus(entry.log) === 'partial') return entry
  return null
}

export function getCurrentWeekEntries(
  store: GymStore,
): Array<{ date: string; log: DayLog }> {
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

  return Object.keys(store)
    .filter((date) => {
      const day = parseISO(`${date}T12:00:00`)
      return day >= weekStart && day <= weekEnd
    })
    .sort()
    .map((date) => ({ date, log: store[date]! }))
}

export function initExercises(key: WorkoutKey | string): Record<string, ExerciseLog> {
  if (key === REST_DAY_KEY || !isProgramWorkoutKey(key)) return {}
  const workout = getProgramWorkout(key)
  const result: Record<string, ExerciseLog> = {}
  workout.exercises.forEach((ex) => {
    result[ex.name] = {
      sets: Array.from({ length: ex.sets }, () => createEmptySet(ex)),
      completed: false,
      skipped: false,
    }
  })
  return result
}

interface GymTrackerProps {
  onBack: () => void
}

function resolveViewFromStore(
  requestedView: GymView,
  date: string,
  store: GymStore,
): GymView {
  if (requestedView === 'workout') {
    const log = store[date]
    if (log && log.workoutKey !== REST_DAY_KEY && isProgramWorkoutKey(log.workoutKey)) return 'workout'
    if (log) return 'select'
    return 'select'
  }
  return requestedView
}

export function GymTracker({ onBack }: GymTrackerProps) {
  const { token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const today = format(new Date(), 'yyyy-MM-dd')
  const [store, setStore] = useState<GymStore>(() => readGymLog())
  const [runs, setRuns] = useState<RunSessionLog[]>(() => readRunLog())

  useEffect(() => {
    const refreshRuns = () => setRuns(readRunLog())
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshRuns()
    }
    refreshRuns()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  const route = parseGymPath(location.pathname)
  const selectedDate =
    route.date && isValidDateParam(route.date) ? route.date : today
  const view = resolveViewFromStore(route.view, selectedDate, store)

  useEffect(() => {
    if (route.view === 'explore') return

    if (route.date && !isValidDateParam(route.date)) {
      navigate(paths.gym(), { replace: true })
      return
    }

    const resolved = resolveViewFromStore(route.view, selectedDate, store)
    const target = paths.gym({ date: selectedDate, view: resolved })
    if (location.pathname !== target) {
      navigate(target, { replace: true })
    }
  }, [location.pathname, navigate, route.date, route.view, selectedDate, store])

  const saveStore = useCallback(
    (newStore: GymStore) => {
      setStore(newStore)
      saveGymLog(newStore, token)
    },
    [token],
  )

  const goToGym = useCallback(
    (date: string, nextView: GymView) => {
      navigate(paths.gym({ date, view: nextView }))
    },
    [navigate],
  )

  const handleSelectDate = (date: string) => {
    goToGym(date, 'calendar')
  }

  const handleOpenWorkout = () => {
    const existing = store[selectedDate]
    if (existing && existing.workoutKey !== REST_DAY_KEY && isProgramWorkoutKey(existing.workoutKey)) {
      goToGym(selectedDate, 'workout')
    } else {
      goToGym(selectedDate, 'select')
    }
  }

  const handleStartWorkout = () => {
    goToGym(selectedDate, 'select')
  }

  const handleStartToday = () => {
    goToGym(today, 'select')
  }

  const handleSelectWorkout = (key: WorkoutKey) => {
    if (key === REST_DAY_KEY) {
      saveStore({ ...store, [selectedDate]: { workoutKey: REST_DAY_KEY, exercises: {} } })
      goToGym(selectedDate, 'calendar')
      return
    }
    const existing = store[selectedDate]
    if (!existing || existing.workoutKey !== key) {
      saveStore({
        ...store,
        [selectedDate]: { workoutKey: key, exercises: initExercises(key) },
      })
    }
    goToGym(selectedDate, 'workout')
  }

  const handleUpdateStore = (newStore: GymStore) => {
    saveStore(newStore)
  }

  const handleFinish = () => {
    goToGym(selectedDate, 'calendar')
  }

  const handleBackToCalendar = () => {
    goToGym(selectedDate, 'calendar')
  }

  const handleBackToSelector = () => {
    goToGym(selectedDate, 'select')
  }

  const handleExploreWorkout = (key: ProgramWorkoutKey) => {
    navigate(paths.gym({ view: 'explore', exploreWorkoutKey: key }))
  }

  const handleExploreBack = () => {
    if (route.exploreWorkoutKey) {
      navigate(paths.gym({ view: 'explore' }))
    } else {
      navigate(paths.gym())
    }
  }

  const handleExploreStartTraining = () => {
    navigate(paths.gym({ date: today, view: 'select' }))
  }

  const dayLog = store[selectedDate]
  const isExplore = route.view === 'explore'
  const hasFlow =
    dayLog &&
    dayLog.workoutKey !== REST_DAY_KEY &&
    isProgramWorkoutKey(dayLog.workoutKey)

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-background/95 border-b border-border backdrop-blur-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
          <button
            onClick={onBack}
            data-haptic="light"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-neon-orange transition-colors min-h-[44px] px-1"
          >
            <span className="font-mono text-xs">← CINDERBLOCK</span>
          </button>
          <span className="font-sans text-xs font-bold tracking-widest text-neon-orange neon-text-orange">
            {isExplore ? 'EXPLORE' : 'TRAINING'}
          </span>
          <span className="font-mono text-xs text-muted-foreground w-[100px] text-right">
            {isExplore ? 'Preview' : format(new Date(selectedDate + 'T12:00:00'), 'MMM d, yyyy')}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {view === 'explore' && (
          <WorkoutExplore
            workoutKey={route.exploreWorkoutKey}
            onSelectWorkout={handleExploreWorkout}
            onBack={handleExploreBack}
            onStartTraining={handleExploreStartTraining}
          />
        )}

        {view === 'calendar' && (
          <WorkoutCalendar
            store={store}
            runs={runs}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            onOpenWorkout={handleOpenWorkout}
            onStartWorkout={handleStartWorkout}
            onStartToday={handleStartToday}
            onExploreWorkout={() => navigate(paths.gym({ view: 'explore' }))}
          />
        )}

        {view === 'select' && (
          <WorkoutSelector
            date={selectedDate}
            existingKey={store[selectedDate]?.workoutKey}
            onSelect={handleSelectWorkout}
            onBack={handleBackToCalendar}
          />
        )}

        {view === 'workout' && hasFlow && isProgramWorkoutKey(dayLog.workoutKey) && (
          <WorkoutFlow
            date={selectedDate}
            workoutKey={dayLog.workoutKey}
            dayLog={dayLog}
            store={store}
            onUpdateStore={handleUpdateStore}
            onBack={handleBackToSelector}
            onFinish={handleFinish}
          />
        )}
      </div>
    </div>
  )
}
