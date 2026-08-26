import { useState, useEffect } from 'react'
import { ChevronLeft, Save, Loader2, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Haptic } from '@/lib/haptics'
import { useAuth } from '@/hooks/use-auth'
import { useActiveProgram } from '@/hooks/use-active-program'
import type { ProgramDocument } from '@/lib/program-json'
import { validateProgramDocument } from '@/lib/program-json'
import { assignNextProgramVersion } from '@/lib/program-version'
import { writeActiveProgram } from '@/lib/active-plan'
import { upsertRemoteActivePlan } from '@/lib/supabase/plan-sync'
import { insertProgramVersion } from '@/lib/supabase/program-version-sync'
import { buildActivePlanPayload } from '@/lib/active-plan'
import { readDefaultRunningPlan } from '@/lib/running'
import { notifyActivePlanChanged } from '@/lib/supabase/cloud-sync'
import { WorkoutEditor } from './workout-editor'

interface ProgramEditorPageProps {
  onBack: () => void
}

export function ProgramEditorPage({ onBack }: ProgramEditorPageProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user?.id
  const { program: activeProgram, programId } = useActiveProgram()
  const [editedProgram, setEditedProgram] = useState<ProgramDocument>(() =>
    structuredClone(activeProgram)
  )
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    const hasEdits = JSON.stringify(editedProgram) !== JSON.stringify(activeProgram)
    setHasChanges(hasEdits)
  }, [editedProgram, activeProgram])

  const handleSave = async () => {
    if (!userId) {
      setValidationError('You must be logged in to save changes')
      return
    }

    // Validate program
    const validation = validateProgramDocument(editedProgram)
    if (!validation.ok) {
      setValidationError(
        validation.issues.length > 0
          ? validation.issues[0].message
          : 'Program validation failed'
      )
      Haptic.error()
      return
    }

    if (validation.issues.length > 0) {
      const errors = validation.issues.filter((i) => i.severity === 'error')
      if (errors.length > 0) {
        setValidationError(errors[0].message)
        Haptic.error()
        return
      }
    }

    setSaving(true)
    setValidationError(null)

    try {
      // Create new version
      const newVersion = assignNextProgramVersion(editedProgram, activeProgram)

      // Update local state
      writeActiveProgram(programId, newVersion)

      // Save to cloud
      const runningPlan = readDefaultRunningPlan()
      const payload = buildActivePlanPayload(runningPlan)
      await upsertRemoteActivePlan(userId, payload)

      // Record version in history
      await insertProgramVersion(userId, {
        programId,
        version: newVersion.version,
        program: newVersion,
        source: 'ai-chat',
        note: 'Manual program edit',
      })

      notifyActivePlanChanged(runningPlan)

      Haptic.success()
      setHasChanges(false)
      
      // Navigate back after short delay
      setTimeout(() => {
        onBack()
      }, 500)
    } catch (error) {
      console.error('Failed to save program:', error)
      setValidationError('Failed to save program. Please try again.')
      Haptic.error()
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateProgram = (updated: Partial<ProgramDocument>) => {
    setEditedProgram((prev) => ({ ...prev, ...updated }))
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 border-b border-border backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-4 py-3">
          <button
            onClick={onBack}
            data-haptic="light"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors min-h-[44px] px-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="font-mono text-xs uppercase tracking-wider">Back</span>
          </button>
          
          <span className="font-sans text-xs font-bold tracking-widest text-neon-orange neon-text-orange">
            EDIT PROGRAM
          </span>

          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            data-haptic="success"
            className={cn(
              'flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider min-h-[44px] px-3 rounded-lg transition-all',
              hasChanges && !saving
                ? 'bg-neon-orange text-primary-foreground hover:opacity-90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto pb-8">
        {/* Program Info */}
        <div className="px-4 pt-6 pb-4">
          <div className="bg-card/40 border border-border rounded-xl p-4">
            <label className="block mb-2">
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                Program Name
              </span>
              <input
                type="text"
                value={editedProgram.name}
                onChange={(e) => handleUpdateProgram({ name: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg font-sans text-sm focus:outline-none focus:ring-2 focus:ring-neon-orange"
              />
            </label>

            <div className="flex items-center gap-2 mt-3">
              <span className="font-mono text-xs text-muted-foreground">Current version:</span>
              <span className="font-mono text-xs font-bold text-neon-orange">
                v{activeProgram.version}
              </span>
              {hasChanges && (
                <span className="font-mono text-xs text-neon-yellow">
                  → v{assignNextProgramVersion(editedProgram, activeProgram).version}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Validation Error */}
        {validationError && (
          <div className="px-4 mb-4">
            <div className="bg-destructive/10 border border-destructive/40 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-mono text-xs font-bold text-destructive mb-1">
                  Validation Error
                </p>
                <p className="font-mono text-xs text-destructive/80">{validationError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Workouts */}
        <div className="px-4 space-y-4">
          {Object.entries(editedProgram.workouts).map(([workoutKey, workout]) => (
            <WorkoutEditor
              key={workoutKey}
              workoutKey={workoutKey}
              workout={workout}
              onUpdate={(updated) => {
                setEditedProgram((prev) => ({
                  ...prev,
                  workouts: {
                    ...prev.workouts,
                    [workoutKey]: updated,
                  },
                }))
              }}
            />
          ))}
        </div>

        {/* Save Changes Reminder */}
        {hasChanges && (
          <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto">
            <div className="bg-neon-orange/10 border border-neon-orange/40 rounded-xl p-3 backdrop-blur-sm">
              <p className="font-mono text-xs text-neon-orange text-center">
                You have unsaved changes
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
