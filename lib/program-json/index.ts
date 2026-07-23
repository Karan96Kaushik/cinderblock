import { diagnoseProgramDocument } from './diagnose'
import { createProgramTemplate } from './template'
import type { DeepPartial, ProgramDocument, ProgramIssue, ValidationResult } from './types'
import { setProgramPath, updateProgramDocument } from './update'
import { ProgramValidationError, validateProgramDocument } from './validate'

function clone<T>(value: T): T {
  return structuredClone(value)
}

/**
 * In-memory manager for training-program JSON matching the foundation schema.
 * All reads/writes return clones; nothing is persisted to disk.
 */
export class ProgramJsonManager {
  private document: ProgramDocument

  private constructor(document: ProgramDocument) {
    this.document = clone(document)
  }

  static createFromTemplate(overrides?: DeepPartial<ProgramDocument>): ProgramJsonManager {
    return new ProgramJsonManager(createProgramTemplate(overrides))
  }

  /**
   * Load unknown JSON (object or JSON string). Validates schema; throws
   * {@link ProgramValidationError} when invalid.
   */
  static from(raw: unknown): ProgramJsonManager {
    const value = typeof raw === 'string' ? parseJsonString(raw) : raw
    const result = validateProgramDocument(value)
    if (!result.ok) {
      throw new ProgramValidationError(result.issues)
    }
    return new ProgramJsonManager(result.data)
  }

  /** Deep clone of the current document. */
  get(): ProgramDocument {
    return clone(this.document)
  }

  /** Deep-merge a patch into the document; returns the new clone. */
  update(patch: DeepPartial<ProgramDocument>): ProgramDocument {
    this.document = updateProgramDocument(this.document, patch)
    return this.get()
  }

  /**
   * Dot-path set (e.g. `workouts.upperA.exercises.0.sets`); returns the new clone.
   */
  set(path: string, value: unknown): ProgramDocument {
    this.document = setProgramPath(this.document, path, value)
    return this.get()
  }

  validate(): ValidationResult {
    return validateProgramDocument(this.document)
  }

  diagnose(): ProgramIssue[] {
    return diagnoseProgramDocument(this.document)
  }

  /** Serializable clone for callers. */
  toJSON(): ProgramDocument {
    return this.get()
  }
}

function parseJsonString(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON'
    throw new ProgramValidationError([
      {
        severity: 'error',
        path: '$',
        code: 'invalid_json',
        message,
      },
    ])
  }
}

export type {
  DeepPartial,
  ProgramDocument,
  ProgramExercise,
  ProgramIssue,
  ProgramIssueSeverity,
  ProgramProgression,
  ProgramProgressionExample,
  ProgramSchedule,
  ProgramWorkout,
  ValidationResult,
} from './types'
export { programDocumentSchema, programExerciseSchema, programWorkoutSchema } from './schema'
export { createProgramTemplate } from './template'
export { diagnoseProgramDocument } from './diagnose'
export { setProgramPath, updateProgramDocument } from './update'
export { ProgramValidationError, validateProgramDocument } from './validate'
