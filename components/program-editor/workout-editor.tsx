import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Haptic } from '@/lib/haptics'
import type { ProgramWorkout } from '@/lib/program-json'
import { ExerciseEditor } from './exercise-editor'
import { ExercisePicker } from './exercise-picker'

interface WorkoutEditorProps {
  workoutKey: string
  workout: ProgramWorkout
  onUpdate: (workout: ProgramWorkout) => void
}

export function WorkoutEditor({ workoutKey, workout, onUpdate }: WorkoutEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showExercisePicker, setShowExercisePicker] = useState(false)

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
    Haptic.selection()
  }

  const handleAddExercise = () => {
    setShowExercisePicker(true)
    Haptic.selection()
  }

  const handleRemoveExercise = (index: number) => {
    const confirmed = window.confirm('Remove this exercise?')
    if (!confirmed) return

    const updated = {
      ...workout,
      exercises: workout.exercises.filter((_, i) => i !== index),
    }
    onUpdate(updated)
    Haptic.warning()
  }

  const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= workout.exercises.length) return

    const exercises = [...workout.exercises]
    const [removed] = exercises.splice(index, 1)
    exercises.splice(newIndex, 0, removed)

    onUpdate({ ...workout, exercises })
    Haptic.selection()
  }

  return (
    <div className="bg-card/40 border border-border rounded-xl overflow-hidden">
      {/* Workout Header */}
      <button
        type="button"
        onClick={toggleExpanded}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-2 h-2 rounded-full',
            workoutKey.toLowerCase().includes('upper') ? 'bg-neon-orange' : 'bg-neon-amber'
          )} />
          <div className="text-left">
            <p className="font-sans text-sm font-bold text-foreground">{workout.name}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {workout.exercises.length} exercise{workout.exercises.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border">
          {/* Exercises */}
          {workout.exercises.length > 0 ? (
            <div className="divide-y divide-border">
              {workout.exercises.map((exercise, index) => (
                <ExerciseEditor
                  key={index}
                  exercise={exercise}
                  canMoveUp={index > 0}
                  canMoveDown={index < workout.exercises.length - 1}
                  onUpdate={(updated) => {
                    const exercises = [...workout.exercises]
                    exercises[index] = updated
                    onUpdate({ ...workout, exercises })
                  }}
                  onRemove={() => handleRemoveExercise(index)}
                  onMoveUp={() => handleMoveExercise(index, 'up')}
                  onMoveDown={() => handleMoveExercise(index, 'down')}
                />
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-muted-foreground">
              <p className="font-mono text-xs">No exercises yet</p>
            </div>
          )}

          {/* Add Exercise Button */}
          <div className="p-4">
            <button
              type="button"
              onClick={handleAddExercise}
              data-haptic="selection"
              className="w-full min-h-[44px] rounded-lg border-2 border-dashed border-border hover:border-neon-orange/40 hover:bg-neon-orange/5 transition-colors flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-neon-orange"
            >
              <Plus className="w-4 h-4" />
              <span>Add Exercise</span>
            </button>
          </div>
        </div>
      )}

      {/* Exercise Picker Modal */}
      {showExercisePicker && (
        <ExercisePicker
          onSelect={(exercise) => {
            onUpdate({
              ...workout,
              exercises: [...workout.exercises, exercise],
            })
            setShowExercisePicker(false)
            Haptic.success()
          }}
          onClose={() => {
            setShowExercisePicker(false)
            Haptic.light()
          }}
        />
      )}
    </div>
  )
}
