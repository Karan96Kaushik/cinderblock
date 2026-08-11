import type { ProgramDocument } from '@/lib/program-json'

export type ProgramVersionSource =
  | 'ai-chat'
  | 'cloud-sync'
  | 'seed'
  | 'import'
  | 'restore'

/**
 * Increment a program version string.
 * "1.0" → "1.1", "1.9" → "1.10", "2" → "2.1", unparseable → "<value>.1"
 */
export function bumpProgramVersion(version: string): string {
  const trimmed = version.trim() || '1.0'
  const match = /^(\d+)(?:\.(\d+))?/.exec(trimmed)
  if (!match) return `${trimmed}.1`
  const major = Number(match[1])
  const minor = match[2] !== undefined ? Number(match[2]) : 0
  return `${major}.${minor + 1}`
}

/**
 * Assign the version for a program about to be saved.
 * - New program (no previous): keep a non-empty version or default to "1.0"
 * - Existing program: always bump from the previous version for monotonic history
 */
export function assignNextProgramVersion(
  program: ProgramDocument,
  previous: ProgramDocument | null,
): ProgramDocument {
  const version = previous
    ? bumpProgramVersion(previous.version)
    : program.version.trim() || '1.0'
  return { ...program, version }
}

export function formatProgramVersionLabel(version: string): string {
  const trimmed = version.trim()
  if (!trimmed) return 'v?'
  return trimmed.toLowerCase().startsWith('v') ? trimmed : `v${trimmed}`
}
