import { useState, useMemo } from 'react'
import { X, Search, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Haptic } from '@/lib/haptics'
import type { ProgramExercise } from '@/lib/program-json'
import {
  searchExercises,
  createExerciseFromPreset,
  CATEGORY_LABELS,
  type ExerciseCategory,
  type ExercisePreset,
} from '@/lib/exercise-library'

interface ExercisePickerProps {
  onSelect: (exercise: ProgramExercise) => void
  onClose: () => void
}

export function ExercisePicker({ onSelect, onClose }: ExercisePickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | 'all'>('all')
  const [showCustomForm, setShowCustomForm] = useState(false)

  const filteredExercises = useMemo(() => {
    let results = searchExercises(searchQuery)

    if (selectedCategory !== 'all') {
      results = results.filter((ex) => ex.category === selectedCategory)
    }

    return results
  }, [searchQuery, selectedCategory])

  const handleSelectPreset = (preset: ExercisePreset) => {
    const exercise = createExerciseFromPreset(preset)
    onSelect(exercise)
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="w-full max-w-2xl bg-background border border-border rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-mono text-sm uppercase tracking-wider text-foreground">
            {showCustomForm ? 'Create Custom Exercise' : 'Add Exercise'}
          </h2>
          <button
            onClick={onClose}
            data-haptic="light"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {showCustomForm ? (
          <CustomExerciseForm
            onSave={onSelect}
            onCancel={() => setShowCustomForm(false)}
          />
        ) : (
          <>
            {/* Search and Filters */}
            <div className="p-4 space-y-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search exercises..."
                  className="w-full pl-10 pr-3 py-2 bg-background border border-border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neon-orange"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setSelectedCategory('all')}
                  data-haptic="selection"
                  className={cn(
                    'px-3 py-1.5 rounded-lg font-mono text-xs uppercase tracking-wider whitespace-nowrap transition-colors',
                    selectedCategory === 'all'
                      ? 'bg-neon-orange text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  All
                </button>
                {(Object.keys(CATEGORY_LABELS) as ExerciseCategory[]).map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    data-haptic="selection"
                    className={cn(
                      'px-3 py-1.5 rounded-lg font-mono text-xs uppercase tracking-wider whitespace-nowrap transition-colors',
                      selectedCategory === category
                        ? 'bg-neon-orange text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {CATEGORY_LABELS[category]}
                  </button>
                ))}
              </div>
            </div>

            {/* Exercise List */}
            <div className="flex-1 overflow-y-auto">
              {filteredExercises.length > 0 ? (
                <div className="divide-y divide-border">
                  {filteredExercises.map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => handleSelectPreset(preset)}
                      data-haptic="selection"
                      className="w-full px-4 py-3 flex items-start justify-between gap-3 hover:bg-muted/20 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-sans text-sm font-bold text-foreground">
                          {preset.name}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground mt-0.5">
                          {preset.defaultSets} sets × {preset.duration || preset.reps}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground/80 mt-1">
                          {preset.muscles.slice(0, 3).join(', ')}
                          {preset.muscles.length > 3 && '...'}
                        </p>
                      </div>
                      <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground px-2 py-1 bg-muted rounded shrink-0">
                        {CATEGORY_LABELS[preset.category]}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-12 text-center text-muted-foreground">
                  <p className="font-mono text-xs">No exercises found</p>
                  <p className="font-mono text-xs mt-1">Try a different search or category</p>
                </div>
              )}
            </div>

            {/* Create Custom Button */}
            <div className="p-4 border-t border-border">
              <button
                onClick={() => setShowCustomForm(true)}
                data-haptic="selection"
                className="w-full min-h-[44px] rounded-lg border-2 border-dashed border-border hover:border-neon-orange/40 hover:bg-neon-orange/5 transition-colors flex items-center justify-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-neon-orange"
              >
                <Plus className="w-4 h-4" />
                <span>Create Custom Exercise</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

interface CustomExerciseFormProps {
  onSave: (exercise: ProgramExercise) => void
  onCancel: () => void
}

function CustomExerciseForm({ onSave, onCancel }: CustomExerciseFormProps) {
  const [name, setName] = useState('')
  const [sets, setSets] = useState(3)
  const [reps, setReps] = useState('8-12')
  const [isTimedHold, setIsTimedHold] = useState(false)
  const [duration, setDuration] = useState('30-60s')
  const [muscles, setMuscles] = useState('')
  const [notes, setNotes] = useState('')

  const handleSave = () => {
    if (!name.trim()) {
      Haptic.error()
      return
    }

    const exercise: ProgramExercise = {
      name: name.trim(),
      sets,
      muscles: muscles.split(',').map((m) => m.trim()).filter(Boolean),
      notes: notes.split(',').map((n) => n.trim()).filter(Boolean),
    }

    if (isTimedHold) {
      exercise.duration = duration
      exercise.seconds = ''
    } else {
      exercise.reps = reps
    }

    onSave(exercise)
    Haptic.success()
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <label className="block">
        <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
          Exercise Name *
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Bench Press"
          className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg font-sans text-sm focus:outline-none focus:ring-2 focus:ring-neon-orange"
          autoFocus
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
            Sets
          </span>
          <input
            type="number"
            min="1"
            max="10"
            value={sets}
            onChange={(e) => setSets(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
            className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neon-orange"
          />
        </label>

        {!isTimedHold ? (
          <label className="block">
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              Reps
            </span>
            <input
              type="text"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder="e.g. 8-12"
              className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neon-orange"
            />
          </label>
        ) : (
          <label className="block">
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              Duration
            </span>
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 30-60s"
              className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neon-orange"
            />
          </label>
        )}
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isTimedHold}
          onChange={(e) => setIsTimedHold(e.target.checked)}
          className="w-4 h-4 rounded border-border"
        />
        <span className="font-mono text-xs text-muted-foreground">
          This is a timed hold exercise (e.g. plank)
        </span>
      </label>

      <label className="block">
        <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
          Muscles (comma separated)
        </span>
        <input
          type="text"
          value={muscles}
          onChange={(e) => setMuscles(e.target.value)}
          placeholder="e.g. Chest, Triceps, Front delts"
          className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neon-orange"
        />
      </label>

      <label className="block">
        <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
          Notes (comma separated, optional)
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="e.g. Control the weight, Full range of motion"
          className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neon-orange resize-none"
        />
      </label>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          data-haptic="light"
          className="flex-1 min-h-[44px] rounded-lg border border-border font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          data-haptic="success"
          className={cn(
            'flex-1 min-h-[44px] rounded-lg font-mono text-xs uppercase tracking-wider transition-colors',
            name.trim()
              ? 'bg-neon-orange text-primary-foreground hover:opacity-90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          Add Exercise
        </button>
      </div>
    </div>
  )
}
