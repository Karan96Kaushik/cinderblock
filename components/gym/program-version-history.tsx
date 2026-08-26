import { useState, useEffect } from 'react'
import { History, RotateCcw, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Haptic } from '@/lib/haptics'
import { useAuth } from '@/hooks/use-auth'
import { 
  listProgramVersions, 
  type ProgramVersionRecord 
} from '@/lib/supabase/program-version-sync'
import { getActiveProgramId, getActiveProgram, writeActiveProgram } from '@/lib/active-plan'
import { assignNextProgramVersion } from '@/lib/program-version'
import { upsertRemoteActivePlan } from '@/lib/supabase/plan-sync'
import { insertProgramVersion } from '@/lib/supabase/program-version-sync'
import { buildActivePlanPayload } from '@/lib/active-plan'
import { readDefaultRunningPlan } from '@/lib/running'
import { notifyActivePlanChanged } from '@/lib/supabase/cloud-sync'

interface ProgramVersionHistoryProps {
  currentVersion?: string
}

export function ProgramVersionHistory({ currentVersion }: ProgramVersionHistoryProps) {
  const { userId } = useAuth()
  const [isExpanded, setIsExpanded] = useState(false)
  const [versions, setVersions] = useState<ProgramVersionRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [reverting, setReverting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isExpanded || !userId) return

    setLoading(true)
    setError(null)
    const programId = getActiveProgramId()

    listProgramVersions(userId, { programId, limit: 20 })
      .then(setVersions)
      .catch((err) => {
        console.error('Failed to load version history:', err)
        setError('Failed to load version history')
      })
      .finally(() => setLoading(false))
  }, [isExpanded, userId])

  const handleRevert = async (versionRecord: ProgramVersionRecord) => {
    if (!userId) return
    
    const confirmed = window.confirm(
      `Revert to version ${versionRecord.version}? This will create a new version based on that older version.`
    )
    if (!confirmed) return

    setReverting(versionRecord.version)
    setError(null)

    try {
      const currentProgram = getActiveProgram()
      const revertedProgram = assignNextProgramVersion(versionRecord.program, currentProgram)
      
      // Update local state
      writeActiveProgram(versionRecord.programId, revertedProgram)
      
      // Save to cloud
      const runningPlan = readDefaultRunningPlan()
      const payload = buildActivePlanPayload(runningPlan)
      await upsertRemoteActivePlan(userId, payload)
      
      // Record version in history
      await insertProgramVersion(userId, {
        programId: versionRecord.programId,
        version: revertedProgram.version,
        program: revertedProgram,
        source: 'restore',
        note: `Reverted from v${versionRecord.version}`,
      })
      
      notifyActivePlanChanged(runningPlan)
      
      Haptic.success()
      
      // Refresh version list
      const updatedVersions = await listProgramVersions(userId, { 
        programId: versionRecord.programId, 
        limit: 20 
      })
      setVersions(updatedVersions)
    } catch (err) {
      console.error('Failed to revert version:', err)
      setError('Failed to revert version')
      Haptic.error()
    } finally {
      setReverting(null)
    }
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
    Haptic.selection()
  }

  return (
    <div className="px-4 mb-6">
      <div className="bg-card/40 border border-border rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={toggleExpanded}
          data-haptic="selection"
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono text-xs uppercase tracking-wider text-foreground">
              Program Version History
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {isExpanded && (
          <div className="border-t border-border">
            {loading && (
              <div className="px-4 py-8 flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-mono text-xs">Loading history...</span>
              </div>
            )}

            {error && (
              <div className="px-4 py-3 text-center">
                <p className="font-mono text-xs text-destructive">{error}</p>
              </div>
            )}

            {!loading && !error && versions.length === 0 && (
              <div className="px-4 py-8 text-center text-muted-foreground">
                <p className="font-mono text-xs">No version history available</p>
              </div>
            )}

            {!loading && !error && versions.length > 0 && (
              <div className="divide-y divide-border">
                {versions.map((version) => {
                  const isCurrent = version.version === currentVersion
                  const isReverting = reverting === version.version

                  return (
                    <div
                      key={version.id}
                      className={cn(
                        'px-4 py-3 flex items-start justify-between gap-3',
                        isCurrent && 'bg-neon-orange/5'
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-foreground">
                            v{version.version}
                          </span>
                          {isCurrent && (
                            <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-neon-orange/20 text-neon-orange">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {format(new Date(version.createdAt), 'MMM d, yyyy · h:mm a')}
                        </p>
                        {version.note && (
                          <p className="font-mono text-[10px] text-muted-foreground mt-1 italic">
                            {version.note}
                          </p>
                        )}
                      </div>

                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleRevert(version)}
                          disabled={isReverting}
                          data-haptic="light"
                          className="shrink-0 px-3 py-1.5 rounded-lg border border-border font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-neon-orange hover:border-neon-orange/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                          {isReverting ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Reverting...</span>
                            </>
                          ) : (
                            <>
                              <RotateCcw className="w-3 h-3" />
                              <span>Revert</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
