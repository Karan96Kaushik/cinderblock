import { z } from 'zod'

export const programExerciseSchema = z
  .object({
    name: z.string(),
    sets: z.number().int().positive(),
    reps: z.string().optional(),
    duration: z.string().optional(),
    seconds: z.string().optional(),
    muscles: z.array(z.string()),
    refVideo: z.string().optional(),
    notes: z.array(z.string()),
  })
  .strict()

export const programWorkoutSchema = z
  .object({
    name: z.string(),
    exercises: z.array(programExerciseSchema),
  })
  .strict()

export const programScheduleSchema = z
  .object({
    day1: z.string(),
    day2: z.string(),
    day3: z.string(),
    day4: z.string(),
    day5: z.string(),
    day6: z.string(),
    day7: z.string(),
  })
  .strict()

export const programProgressionExampleSchema = z
  .object({
    exercise: z.string(),
    week1: z.array(z.string()),
    week2: z.array(z.string()),
    week3: z.array(z.string()),
    nextStep: z.string(),
  })
  .strict()

export const programProgressionSchema = z
  .object({
    method: z.string(),
    example: programProgressionExampleSchema,
  })
  .strict()

export const programDocumentSchema = z
  .object({
    name: z.string(),
    version: z.string(),
    goal: z.array(z.string()),
    schedule: programScheduleSchema,
    globalNotes: z.array(z.string()),
    progression: programProgressionSchema,
    weeks: z.record(z.string(), z.array(z.string())),
    workouts: z.record(z.string(), programWorkoutSchema),
    successMetrics: z.array(z.string()),
  })
  .strict()
