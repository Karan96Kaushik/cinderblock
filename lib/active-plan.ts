import foundationProgram from '@/foundation-7-june.json'
import {
  DEFAULT_RUNNING_PLAN,
  type RunningPlan,
} from '@/lib/running'
import type { ProgramDocument } from '@/lib/program-json'
import { validateProgramDocument } from '@/lib/program-json'

export const DEFAULT_PROGRAM_ID = 'foundation-7-june'

export const ACTIVE_PROGRAM_STORAGE_KEY = 'cinderblock_active_program'
export const ACTIVE_PROGRAM_ID_STORAGE_KEY = 'cinderblock_active_program_id'

/** Cloud + local shape for the user's active training plan. */
export type ActivePlanPayload = {
  programId: string
  program: ProgramDocument
  running: RunningPlan
}

const listeners = new Set<() => void>()

let cachedProgram: ProgramDocument | null = null
let cachedProgramId: string | null = null

function cloneProgram(program: ProgramDocument): ProgramDocument {
  return structuredClone(program)
}

function isRunningPlanShape(value: unknown): value is RunningPlan {
  if (!value || typeof value !== 'object') return false
  const plan = value as RunningPlan
  return [plan.warmupMinutes, plan.runMinutes, plan.cooldownMinutes].every(
    (minutes) => typeof minutes === 'number' && minutes > 0 && minutes <= 180,
  )
}

export function getDefaultFoundationProgram(): ProgramDocument {
  return cloneProgram(foundationProgram as ProgramDocument)
}

export function createDefaultActivePlan(
  running: RunningPlan = DEFAULT_RUNNING_PLAN,
): ActivePlanPayload {
  return {
    programId: DEFAULT_PROGRAM_ID,
    program: getDefaultFoundationProgram(),
    running: { ...running },
  }
}

/** Accept legacy RunningPlan rows and newer { programId, program, running } payloads. */
export function normalizeActivePlanPayload(
  raw: unknown,
  fallbackRunning: RunningPlan = DEFAULT_RUNNING_PLAN,
): ActivePlanPayload {
  if (isRunningPlanShape(raw)) {
    return createDefaultActivePlan(raw)
  }

  if (!raw || typeof raw !== 'object') {
    return createDefaultActivePlan(fallbackRunning)
  }

  const record = raw as Record<string, unknown>
  const running = isRunningPlanShape(record.running) ? record.running : fallbackRunning
  const programId =
    typeof record.programId === 'string' && record.programId.trim()
      ? record.programId.trim()
      : DEFAULT_PROGRAM_ID

  const validated = validateProgramDocument(record.program)
  if (validated.ok) {
    return {
      programId,
      program: cloneProgram(validated.data),
      running: { ...running },
    }
  }

  // Older/partial rows: keep running, seed foundation program
  return createDefaultActivePlan(running)
}

function readStoredProgram(): { programId: string; program: ProgramDocument } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(ACTIVE_PROGRAM_STORAGE_KEY)
    if (!raw) return null
    const validated = validateProgramDocument(JSON.parse(raw))
    if (!validated.ok) return null
    const programId =
      localStorage.getItem(ACTIVE_PROGRAM_ID_STORAGE_KEY)?.trim() || DEFAULT_PROGRAM_ID
    return { programId, program: cloneProgram(validated.data) }
  } catch {
    return null
  }
}

function ensureCache() {
  if (cachedProgram && cachedProgramId) return
  const stored = readStoredProgram()
  if (stored) {
    cachedProgram = stored.program
    cachedProgramId = stored.programId
    return
  }
  cachedProgram = getDefaultFoundationProgram()
  cachedProgramId = DEFAULT_PROGRAM_ID
}

export function getActiveProgramId(): string {
  ensureCache()
  return cachedProgramId ?? DEFAULT_PROGRAM_ID
}

export function getActiveProgram(): ProgramDocument {
  ensureCache()
  return cachedProgram ?? getDefaultFoundationProgram()
}

export function subscribeActiveProgram(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function emitActiveProgramChanged() {
  listeners.forEach((listener) => listener())
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('cinderblock:active-program', {
        detail: {
          programId: getActiveProgramId(),
          program: getActiveProgram(),
        },
      }),
    )
  }
}

export function writeActiveProgram(
  programId: string,
  program: ProgramDocument,
  opts?: { silent?: boolean },
): void {
  const validated = validateProgramDocument(program)
  if (!validated.ok) return

  cachedProgramId = programId.trim() || DEFAULT_PROGRAM_ID
  cachedProgram = cloneProgram(validated.data)

  if (typeof window !== 'undefined') {
    localStorage.setItem(ACTIVE_PROGRAM_ID_STORAGE_KEY, cachedProgramId)
    localStorage.setItem(ACTIVE_PROGRAM_STORAGE_KEY, JSON.stringify(cachedProgram))
  }

  if (!opts?.silent) emitActiveProgramChanged()
}

export function applyActivePlanProgram(payload: ActivePlanPayload, opts?: { silent?: boolean }) {
  writeActiveProgram(payload.programId, payload.program, opts)
}

export function buildActivePlanPayload(running: RunningPlan): ActivePlanPayload {
  return {
    programId: getActiveProgramId(),
    program: cloneProgram(getActiveProgram()),
    running: { ...running },
  }
}
