import { useState, useEffect } from 'react'
import type { ProgramDocument } from '@/lib/program-json'
import { getActiveProgram, getActiveProgramId } from '@/lib/active-plan'
import { fetchProgramVersion } from '@/lib/supabase/program-version-sync'
import { useAuth } from './use-auth'
import type { DayLog } from '@/components/gym/gym-tracker'

/**
 * Resolve the program for a logged workout.
 * - If the log has a programVersion, fetch that version from the database
 * - If no version or fetch fails, fall back to the current active program (backwards compatibility)
 */
export function useLoggedProgram(log: DayLog | undefined): {
  program: ProgramDocument
  programId: string
  isHistorical: boolean
  loading: boolean
} {
  const { userId } = useAuth()
  const [program, setProgram] = useState<ProgramDocument>(() => getActiveProgram())
  const [programId, setProgramId] = useState<string>(() => getActiveProgramId())
  const [isHistorical, setIsHistorical] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!log?.programVersion || !userId) {
      // No version logged or not authenticated - use current program
      setProgram(getActiveProgram())
      setProgramId(getActiveProgramId())
      setIsHistorical(false)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    const currentProgramId = getActiveProgramId()
    const currentProgram = getActiveProgram()

    // Check if the logged version matches current version (common case)
    if (log.programVersion === currentProgram.version) {
      setProgram(currentProgram)
      setProgramId(currentProgramId)
      setIsHistorical(false)
      setLoading(false)
      return
    }

    // Fetch historical version
    fetchProgramVersion(userId, currentProgramId, log.programVersion)
      .then((versionRecord) => {
        if (cancelled) return

        if (versionRecord) {
          setProgram(versionRecord.program)
          setProgramId(versionRecord.programId)
          setIsHistorical(true)
        } else {
          // Version not found - fall back to current
          setProgram(currentProgram)
          setProgramId(currentProgramId)
          setIsHistorical(false)
        }
      })
      .catch((error) => {
        console.error('Failed to fetch program version:', error)
        if (cancelled) return
        // Fall back to current program on error
        setProgram(currentProgram)
        setProgramId(currentProgramId)
        setIsHistorical(false)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [log?.programVersion, userId])

  return { program, programId, isHistorical, loading }
}
