import { useSyncExternalStore } from 'react'
import {
  getActiveProgram,
  getActiveProgramId,
  subscribeActiveProgram,
} from '@/lib/active-plan'
import type { ProgramDocument } from '@/lib/program-json'

export function useActiveProgram(): {
  programId: string
  program: ProgramDocument
} {
  const program = useSyncExternalStore(
    subscribeActiveProgram,
    getActiveProgram,
    getActiveProgram,
  )
  const programId = useSyncExternalStore(
    subscribeActiveProgram,
    getActiveProgramId,
    getActiveProgramId,
  )
  return { programId, program }
}
