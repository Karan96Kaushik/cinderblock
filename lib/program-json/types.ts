export type ProgramIssueSeverity = 'error' | 'warning'

export type ProgramIssue = {
  severity: ProgramIssueSeverity
  path: string
  code: string
  message: string
}

export type ProgramExercise = {
  name: string
  sets: number
  reps?: string
  duration?: string
  /** Present on timed holds — each set logs seconds held. */
  seconds?: string
  muscles: string[]
  refVideo?: string
  notes: string[]
}

export type ProgramWorkout = {
  name: string
  exercises: ProgramExercise[]
}

export type ProgramSchedule = {
  day1: string
  day2: string
  day3: string
  day4: string
  day5: string
  day6: string
  day7: string
}

export type ProgramProgressionExample = {
  exercise: string
  week1: string[]
  week2: string[]
  week3: string[]
  nextStep: string
}

export type ProgramProgression = {
  method: string
  example: ProgramProgressionExample
}

export type ProgramDocument = {
  name: string
  version: string
  goal: string[]
  schedule: ProgramSchedule
  globalNotes: string[]
  progression: ProgramProgression
  weeks: Record<string, string[]>
  workouts: Record<string, ProgramWorkout>
  successMetrics: string[]
}

export type ValidationResult =
  | { ok: true; data: ProgramDocument; issues: ProgramIssue[] }
  | { ok: false; data?: undefined; issues: ProgramIssue[] }

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (infer U)[]
    ? DeepPartial<U>[]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K]
}
