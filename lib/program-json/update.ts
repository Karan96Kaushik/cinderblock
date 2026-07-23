import { deepMerge } from './template'
import type { DeepPartial, ProgramDocument } from './types'

function clone<T>(value: T): T {
  return structuredClone(value)
}

export function updateProgramDocument(
  document: ProgramDocument,
  patch: DeepPartial<ProgramDocument>,
): ProgramDocument {
  return deepMerge(document, patch)
}

/**
 * Set a value at a dotted path, e.g. `workouts.upperA.exercises.0.sets`.
 * Numeric path segments index into arrays.
 */
export function setProgramPath(
  document: ProgramDocument,
  path: string,
  value: unknown,
): ProgramDocument {
  const segments = path.split('.').filter(Boolean)
  if (segments.length === 0) {
    throw new Error('Path must not be empty')
  }

  const root = clone(document) as unknown
  let cursor: unknown = root

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]!
    const nextSegment = segments[i + 1]!
    const key = arrayIndexOrKey(segment)

    if (cursor === null || typeof cursor !== 'object') {
      throw new Error(`Cannot traverse into non-object at "${segments.slice(0, i + 1).join('.')}"`)
    }

    const container = cursor as Record<string | number, unknown>
    let child = container[key as keyof typeof container]

    if (child === undefined || child === null) {
      child = looksLikeArrayIndex(nextSegment) ? [] : {}
      container[key as keyof typeof container] = child
    }

    cursor = child
  }

  const last = segments[segments.length - 1]!
  const lastKey = arrayIndexOrKey(last)

  if (cursor === null || typeof cursor !== 'object') {
    throw new Error(`Cannot set property on non-object at "${path}"`)
  }

  ;(cursor as Record<string | number, unknown>)[lastKey as keyof typeof cursor] = clone(value)
  return root as ProgramDocument
}

function looksLikeArrayIndex(segment: string): boolean {
  return /^\d+$/.test(segment)
}

function arrayIndexOrKey(segment: string): string | number {
  return looksLikeArrayIndex(segment) ? Number(segment) : segment
}
