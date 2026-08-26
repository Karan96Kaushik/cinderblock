import foundationData from '@/foundation-7-june.json'
import { getActiveProgram } from '@/lib/active-plan'
import type { ProgramDocument, ProgramExercise as JsonProgramExercise } from '@/lib/program-json'

export type ProgramExercise = JsonProgramExercise

export type ProgramWorkoutKey = keyof typeof foundationData.workouts

export type WorkoutKey = ProgramWorkoutKey | 'rest'

export type ProgramWorkout = {
  name: string
  exercises: ProgramExercise[]
}

/**
 * Live view of the user's active program (defaults to foundation-7-june,
 * replaced when a plan is loaded from Supabase / local storage).
 */
export const program: ProgramDocument = new Proxy({} as ProgramDocument, {
  get(_target, prop, _receiver) {
    const current = getActiveProgram()
    const value = Reflect.get(current, prop, current)
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(current) : value
  },
  ownKeys() {
    return Reflect.ownKeys(getActiveProgram())
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Reflect.getOwnPropertyDescriptor(getActiveProgram(), prop)
  },
  has(_target, prop) {
    return Reflect.has(getActiveProgram(), prop)
  },
})

export const REST_DAY_KEY = 'rest' as const
export const REST_DAY_LABEL = 'Rest day'

export function getProgramWorkoutKeys(): ProgramWorkoutKey[] {
  return Object.keys(program.workouts) as ProgramWorkoutKey[]
}

export function isProgramWorkoutKey(key: string): key is ProgramWorkoutKey {
  return Object.prototype.hasOwnProperty.call(program.workouts, key)
}

export function isWorkoutKey(key: string): key is WorkoutKey {
  return key === REST_DAY_KEY || isProgramWorkoutKey(key)
}

/**
 * Resolve the display name for a workout key.
 *
 * Pass the `ProgramDocument` a log actually belongs to (e.g. from
 * `useLoggedProgram`) so historical logs keep showing the name they were
 * logged under, even if the current active program has since renamed or
 * removed that workout key. Falls back to the current active program, and
 * finally to the raw key if it can't be found anywhere.
 */
export function getWorkoutLabel(key: WorkoutKey | string, sourceProgram: ProgramDocument = program): string {
  if (key === REST_DAY_KEY) return REST_DAY_LABEL
  const sourceWorkouts = sourceProgram.workouts as Record<string, { name: string }>
  if (Object.prototype.hasOwnProperty.call(sourceWorkouts, key)) return sourceWorkouts[key].name
  if (isProgramWorkoutKey(key)) return program.workouts[key].name
  return key
}

/**
 * Resolve the display name for a logged workout day.
 *
 * Prefers the `workoutName` saved on the log itself (captured at the time it
 * was logged), so history keeps the original name even after the workout is
 * renamed or removed from the program. Falls back to a program-based lookup,
 * and ultimately to the raw key, for older logs saved before `workoutName`
 * was recorded.
 */
export function getWorkoutLogLabel(
  log: { workoutKey: WorkoutKey | string; workoutName?: string },
  sourceProgram?: ProgramDocument,
): string {
  if (log.workoutKey === REST_DAY_KEY) return REST_DAY_LABEL
  if (log.workoutName) return log.workoutName
  return getWorkoutLabel(log.workoutKey, sourceProgram)
}

export function getSelectableWorkoutKeys(): WorkoutKey[] {
  return [...getProgramWorkoutKeys(), REST_DAY_KEY]
}

export type WorkoutColorGroup = 'upper' | 'lower'

export function getWorkoutColorGroup(key: string): WorkoutColorGroup {
  const normalized = key.toLowerCase()
  if (normalized.includes('upper')) return 'upper'
  if (normalized.includes('lower')) return 'lower'

  const keys = getProgramWorkoutKeys()
  const idx = keys.indexOf(key as ProgramWorkoutKey)
  return idx >= 0 && idx % 2 === 1 ? 'lower' : 'upper'
}

export function getWorkoutDotColorClass(key: string): string {
  if (key === REST_DAY_KEY) return 'bg-muted-foreground'
  return getWorkoutColorGroup(key) === 'upper' ? 'bg-neon-orange' : 'bg-neon-amber'
}

export function getWorkoutTextColorClass(key: string): string {
  if (key === REST_DAY_KEY) return 'text-muted-foreground'
  return getWorkoutColorGroup(key) === 'upper' ? 'text-neon-orange' : 'text-neon-amber'
}

export function getWorkoutAccentClasses(key: string) {
  const group = getWorkoutColorGroup(key)
  if (group === 'upper') {
    return {
      color: 'text-neon-orange',
      accentClass: 'bg-neon-orange/10 hover:bg-neon-orange/20',
      borderClass: 'border-neon-orange/40 hover:border-neon-orange',
      dotClass: 'bg-neon-orange',
    }
  }
  return {
    color: 'text-neon-amber',
    accentClass: 'bg-neon-amber/10 hover:bg-neon-amber/20',
    borderClass: 'border-neon-amber/40 hover:border-neon-amber',
    dotClass: 'bg-neon-amber',
  }
}

export function getScheduleHint(workoutKey: ProgramWorkoutKey): string {
  const name = program.workouts[workoutKey].name
  for (const [dayKey, label] of Object.entries(program.schedule)) {
    const scheduleLabel = String(label)
    if (scheduleLabel.toLowerCase().includes(name.toLowerCase())) {
      return `${dayKey.replace(/^day/i, 'Day ')} — ${scheduleLabel}`
    }
  }
  const count = program.workouts[workoutKey].exercises.length
  return `${count} exercise${count === 1 ? '' : 's'}`
}

export function getProgramWorkout(key: ProgramWorkoutKey): ProgramWorkout {
  return program.workouts[key] as ProgramWorkout
}

export function getWorkoutExerciseCount(key: ProgramWorkoutKey): number {
  return program.workouts[key].exercises.length
}

/** Label for the weekly schedule section, derived from program data */
export function getScheduleSectionLabel(): string {
  const workoutCount = getProgramWorkoutKeys().length
  const hasRunning = Object.values(program.schedule).some((label) =>
    String(label).toLowerCase().includes('run'),
  )
  return hasRunning ? `${workoutCount}-day split + running` : `${workoutCount}-day split`
}

export function isTimedHoldExercise(exercise: ProgramExercise): boolean {
  return Boolean(exercise.duration)
}
