import type { DeepPartial, ProgramDocument } from './types'

function clone<T>(value: T): T {
  return structuredClone(value)
}

export function createProgramTemplate(
  overrides?: DeepPartial<ProgramDocument>,
): ProgramDocument {
  const template: ProgramDocument = {
    name: '',
    version: '1.0',
    goal: [],
    schedule: {
      day1: '',
      day2: '',
      day3: '',
      day4: '',
      day5: '',
      day6: '',
      day7: '',
    },
    globalNotes: [],
    progression: {
      method: '',
      example: {
        exercise: '',
        week1: [],
        week2: [],
        week3: [],
        nextStep: '',
      },
    },
    weeks: {},
    workouts: {},
    successMetrics: [],
  }

  if (!overrides) return clone(template)
  return deepMerge(template, overrides)
}

export function deepMerge<T>(target: T, patch: DeepPartial<T>): T {
  if (patch === undefined) return clone(target)

  if (Array.isArray(target) || Array.isArray(patch)) {
    return clone(patch as T)
  }

  if (
    target !== null &&
    typeof target === 'object' &&
    patch !== null &&
    typeof patch === 'object'
  ) {
    const result: Record<string, unknown> = {
      ...(clone(target) as Record<string, unknown>),
    }
    for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
      if (value === undefined) continue
      const current = result[key]
      if (
        current !== null &&
        typeof current === 'object' &&
        !Array.isArray(current) &&
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        result[key] = deepMerge(current, value as DeepPartial<typeof current>)
      } else {
        result[key] = clone(value)
      }
    }
    return result as T
  }

  return clone(patch as T)
}
