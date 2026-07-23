import { ZodError } from 'zod'
import { programDocumentSchema } from './schema'
import type { ProgramDocument, ProgramIssue, ValidationResult } from './types'

function zodIssuesToProgramIssues(error: ZodError): ProgramIssue[] {
  return error.issues.map((issue) => ({
    severity: 'error' as const,
    path: issue.path.length > 0 ? issue.path.join('.') : '$',
    code: issue.code,
    message: issue.message,
  }))
}

export function validateProgramDocument(raw: unknown): ValidationResult {
  const parsed = programDocumentSchema.safeParse(raw)
  if (parsed.success) {
    return { ok: true, data: parsed.data as ProgramDocument, issues: [] }
  }
  return { ok: false, issues: zodIssuesToProgramIssues(parsed.error) }
}

export class ProgramValidationError extends Error {
  readonly issues: ProgramIssue[]

  constructor(issues: ProgramIssue[]) {
    const summary = issues.map((i) => `${i.path}: ${i.message}`).join('; ')
    super(`Program document validation failed: ${summary}`)
    this.name = 'ProgramValidationError'
    this.issues = issues
  }
}
