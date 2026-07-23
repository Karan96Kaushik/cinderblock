import type { DeepPartial, ProgramDocument, ProgramExercise } from '@/lib/program-json'

/**
 * Cerebras structured outputs (strict mode) require every object's keys to
 * be enumerated up front — arbitrary/dynamic keys (`additionalProperties`)
 * are not supported. `ProgramDocument.workouts` and `.weeks` are keyed
 * dictionaries, so the generation schema below models them as arrays with an
 * explicit key field instead, and {@link toProgramDocumentPatch} converts the
 * result back into the dictionary shape `ProgramJsonManager` expects.
 */

const nullableString = { type: ['string', 'null'] } as const

export const cerebrasExerciseSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    sets: { type: 'integer' },
    reps: nullableString,
    duration: nullableString,
    seconds: nullableString,
    muscles: { type: 'array', items: { type: 'string' } },
    refVideo: nullableString,
    notes: { type: 'array', items: { type: 'string' } },
  },
  required: ['name', 'sets', 'reps', 'duration', 'seconds', 'muscles', 'refVideo', 'notes'],
  additionalProperties: false,
} as const

export const cerebrasWorkoutSchema = {
  type: 'object',
  properties: {
    key: {
      type: 'string',
      description: 'Short camelCase identifier for this workout, e.g. "upperA".',
    },
    name: { type: 'string' },
    exercises: { type: 'array', items: cerebrasExerciseSchema },
  },
  required: ['key', 'name', 'exercises'],
  additionalProperties: false,
} as const

export const cerebrasWeekPhaseSchema = {
  type: 'object',
  properties: {
    phase: {
      type: 'string',
      description: 'Identifier for this training phase, e.g. "week1-2".',
    },
    notes: { type: 'array', items: { type: 'string' } },
  },
  required: ['phase', 'notes'],
  additionalProperties: false,
} as const

export const cerebrasScheduleSchema = {
  type: 'object',
  properties: {
    day1: { type: 'string' },
    day2: { type: 'string' },
    day3: { type: 'string' },
    day4: { type: 'string' },
    day5: { type: 'string' },
    day6: { type: 'string' },
    day7: { type: 'string' },
  },
  required: ['day1', 'day2', 'day3', 'day4', 'day5', 'day6', 'day7'],
  additionalProperties: false,
} as const

export const cerebrasProgressionSchema = {
  type: 'object',
  properties: {
    method: { type: 'string' },
    example: {
      type: 'object',
      properties: {
        exercise: { type: 'string' },
        week1: { type: 'array', items: { type: 'string' } },
        week2: { type: 'array', items: { type: 'string' } },
        week3: { type: 'array', items: { type: 'string' } },
        nextStep: { type: 'string' },
      },
      required: ['exercise', 'week1', 'week2', 'week3', 'nextStep'],
      additionalProperties: false,
    },
  },
  required: ['method', 'example'],
  additionalProperties: false,
} as const

/** JSON Schema for the Cerebras structured-output response. */
export const cerebrasProgramGenerationSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    version: { type: 'string' },
    goal: { type: 'array', items: { type: 'string' } },
    schedule: cerebrasScheduleSchema,
    globalNotes: { type: 'array', items: { type: 'string' } },
    progression: cerebrasProgressionSchema,
    weeks: { type: 'array', items: cerebrasWeekPhaseSchema },
    workouts: { type: 'array', items: cerebrasWorkoutSchema },
    successMetrics: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'name',
    'version',
    'goal',
    'schedule',
    'globalNotes',
    'progression',
    'weeks',
    'workouts',
    'successMetrics',
  ],
  additionalProperties: false,
} as const

export type CerebrasProgramExercise = {
  name: string
  sets: number
  reps: string | null
  duration: string | null
  seconds: string | null
  muscles: string[]
  refVideo: string | null
  notes: string[]
}

export type CerebrasProgramWorkout = {
  key: string
  name: string
  exercises: CerebrasProgramExercise[]
}

export type CerebrasProgramWeekPhase = {
  phase: string
  notes: string[]
}

export type CerebrasProgramGeneration = {
  name: string
  version: string
  goal: string[]
  schedule: {
    day1: string
    day2: string
    day3: string
    day4: string
    day5: string
    day6: string
    day7: string
  }
  globalNotes: string[]
  progression: {
    method: string
    example: {
      exercise: string
      week1: string[]
      week2: string[]
      week3: string[]
      nextStep: string
    }
  }
  weeks: CerebrasProgramWeekPhase[]
  workouts: CerebrasProgramWorkout[]
  successMetrics: string[]
}

function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value
}

function toProgramExercise(exercise: CerebrasProgramExercise): ProgramExercise {
  return {
    name: exercise.name,
    sets: exercise.sets,
    reps: nullToUndefined(exercise.reps),
    duration: nullToUndefined(exercise.duration),
    seconds: nullToUndefined(exercise.seconds),
    muscles: exercise.muscles,
    refVideo: nullToUndefined(exercise.refVideo),
    notes: exercise.notes,
  }
}

/**
 * Converts a Cerebras structured-output generation (arrays + explicit keys)
 * into the `DeepPartial<ProgramDocument>` shape expected by
 * `ProgramJsonManager`, ready to hand to `createFromTemplate` / `update`.
 */
export function toProgramDocumentPatch(
  generation: CerebrasProgramGeneration,
): DeepPartial<ProgramDocument> {
  return {
    name: generation.name,
    version: generation.version,
    goal: generation.goal,
    schedule: generation.schedule,
    globalNotes: generation.globalNotes,
    progression: generation.progression,
    weeks: Object.fromEntries(generation.weeks.map((week) => [week.phase, week.notes])),
    workouts: Object.fromEntries(
      generation.workouts.map((workout) => [
        workout.key,
        { name: workout.name, exercises: workout.exercises.map(toProgramExercise) },
      ]),
    ),
    successMetrics: generation.successMetrics,
  }
}
