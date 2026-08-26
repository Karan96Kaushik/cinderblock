import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  ArrowUp,
  ArrowDown,
  GripVertical,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Haptic } from '@/lib/haptics'
import type { ProgramExercise } from '@/lib/program-json'

interface ExerciseEditorProps {
  exercise: ProgramExercise
  canMoveUp: boolean
  canMoveDown: boolean
  onUpdate: (exercise: ProgramExercise) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

export function ExerciseEditor({
  exercise,
  canMoveUp,
  canMoveDown,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: ExerciseEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isTimedHold = Boolean(exercise.duration)

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
    Haptic.selection()
  }

  return (
    <div className="bg-background/40">
      {/* Exercise Header */}
      <div className="px-4 py-3 flex items-center gap-2">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            data-haptic="light"
            className={cn(
              'p-0.5 rounded transition-colors',
              canMoveUp
                ? 'text-muted-foreground hover:text-neon-orange'
                : 'text-muted-foreground/30 cursor-not-allowed'
            )}
          >
            <ArrowUp className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            data-haptic="light"
            className={cn(
              'p-0.5 rounded transition-colors',
              canMoveDown
                ? 'text-muted-foreground hover:text-neon-orange'
                : 'text-muted-foreground/30 cursor-not-allowed'
            )}
          >
            <ArrowDown className="w-3 h-3" />
          </button>
        </div>

        <button
          type="button"
          onClick={toggleExpanded}
          className="flex-1 flex items-start gap-2 text-left min-h-[44px] py-1"
        >
          <div className="flex-1">
            <p className="font-sans text-sm font-bold text-foreground">{exercise.name}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {exercise.sets} set{exercise.sets !== 1 ? 's' : ''} ×{' '}
              {isTimedHold ? exercise.duration : exercise.reps}
            </p>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={onRemove}
          data-haptic="warning"
          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                Sets
              </span>
              <input
                type="number"
                min="1"
                max="10"
                value={exercise.sets}
                onChange={(e) => {
                  const sets = Math.max(1, Math.min(10, parseInt(e.target.value) || 1))
                  onUpdate({ ...exercise, sets })
                  Haptic.selection()
                }}
                className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neon-orange"
              />
            </label>

            {!isTimedHold && (
              <label className="block">
                <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                  Reps
                </span>
                <input
                  type="text"
                  value={exercise.reps || ''}
                  onChange={(e) => {
                    onUpdate({ ...exercise, reps: e.target.value })
                    Haptic.selection()
                  }}
                  placeholder="e.g. 8-12"
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neon-orange"
                />
              </label>
            )}

            {isTimedHold && (
              <label className="block">
                <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                  Duration
                </span>
                <input
                  type="text"
                  value={exercise.duration || ''}
                  onChange={(e) => {
                    onUpdate({ ...exercise, duration: e.target.value })
                    Haptic.selection()
                  }}
                  placeholder="e.g. 30-60s"
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neon-orange"
                />
              </label>
            )}
          </div>

          <label className="block">
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              Muscles
            </span>
            <input
              type="text"
              value={exercise.muscles.join(', ')}
              onChange={(e) => {
                const muscles = e.target.value
                  .split(',')
                  .map((m) => m.trim())
                  .filter(Boolean)
                onUpdate({ ...exercise, muscles })
                Haptic.selection()
              }}
              placeholder="e.g. Chest, Triceps, Front delts"
              className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neon-orange"
            />
          </label>

          <label className="block">
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              Notes (comma separated)
            </span>
            <textarea
              value={exercise.notes.join(', ')}
              onChange={(e) => {
                const notes = e.target.value
                  .split(',')
                  .map((n) => n.trim())
                  .filter(Boolean)
                onUpdate({ ...exercise, notes })
                Haptic.selection()
              }}
              rows={3}
              placeholder="e.g. Control the weight, Full range of motion"
              className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neon-orange resize-none"
            />
          </label>

          <label className="block">
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              Reference Video (optional)
            </span>
            <input
              type="url"
              value={exercise.refVideo || ''}
              onChange={(e) => {
                onUpdate({ ...exercise, refVideo: e.target.value || undefined })
                Haptic.selection()
              }}
              placeholder="https://youtube.com/..."
              className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neon-orange"
            />
          </label>
        </div>
      )}
    </div>
  )
}
