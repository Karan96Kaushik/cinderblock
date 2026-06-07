import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Check, Timer, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExerciseLog, ProgramExercise, SetLog } from './gym-tracker'
import { ExerciseStopwatch } from './exercise-stopwatch'

interface ExerciseStepProps {
  exercise: ProgramExercise
  log: ExerciseLog | undefined
  isActive?: boolean
  onUpdateSets: (sets: SetLog[]) => void
  onMarkDone: () => void
  onSkip: () => void
  onMarkUndone: () => void
}

function hasSetData(set: SetLog): boolean {
  return Boolean(set.weight.trim() || set.reps.trim())
}

function computeVisibleSetCount(
  sets: SetLog[],
  totalSets: number,
  isAddressed: boolean,
): number {
  if (isAddressed) return totalSets

  let lastWithData = -1
  for (let i = 0; i < Math.min(sets.length, totalSets); i++) {
    if (hasSetData(sets[i])) lastWithData = i
  }

  if (lastWithData === -1) return 1
  if (lastWithData >= totalSets - 1) return totalSets
  return Math.min(lastWithData + 2, totalSets)
}

function fillSetFromPrevious(sets: SetLog[], index: number): SetLog[] {
  if (index <= 0 || hasSetData(sets[index])) return sets

  const prev = sets[index - 1]
  if (!hasSetData(prev)) return sets

  const next = [...sets]
  next[index] = { weight: prev.weight, reps: prev.reps }
  return next
}

export function ExerciseStep({
  exercise,
  log,
  isActive = true,
  onUpdateSets,
  onMarkDone,
  onSkip,
  onMarkUndone,
}: ExerciseStepProps) {
  const [notesOpen, setNotesOpen] = useState(false)

  const sets = log?.sets ?? Array.from({ length: exercise.sets }, () => ({ weight: '', reps: '' }))
  const isCompleted = log?.completed ?? false
  const isSkipped = log?.skipped ?? false
  const isAddressed = isCompleted || isSkipped
  const hasDuration = Boolean(exercise.duration)
  const targetLabel = hasDuration ? exercise.duration : exercise.reps

  const [visibleSetCount, setVisibleSetCount] = useState(() =>
    computeVisibleSetCount(sets, exercise.sets, isAddressed),
  )

  useEffect(() => {
    setVisibleSetCount(computeVisibleSetCount(sets, exercise.sets, isAddressed))
  }, [exercise.name, exercise.sets, isAddressed])

  const updateSet = (index: number, field: keyof SetLog, value: string) => {
    const next = sets.map((s, i) => (i === index ? { ...s, [field]: value } : s))

    if (
      hasSetData(next[index]) &&
      index === visibleSetCount - 1 &&
      visibleSetCount < exercise.sets
    ) {
      setVisibleSetCount((count) => Math.min(count + 1, exercise.sets))
    }

    onUpdateSets(next)
  }

  const handleSetFocus = (index: number) => {
    const next = fillSetFromPrevious(sets, index)
    if (next !== sets) {
      onUpdateSets(next)
    }

    if (index > 0 && index === visibleSetCount - 1 && visibleSetCount < exercise.sets) {
      setVisibleSetCount((count) => Math.min(count + 1, exercise.sets))
    }
  }

  const visibleSets = sets.slice(0, visibleSetCount)

  return (
    <div className="flex flex-col">
      {/* Exercise name + target */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <h2
            className={cn(
              'font-sans text-3xl sm:text-4xl font-bold tracking-wide uppercase leading-tight',
              isCompleted && 'text-neon-orange neon-text-orange',
              isSkipped && 'text-muted-foreground line-through decoration-muted-foreground/50',
              !isAddressed && 'text-foreground',
            )}
          >
            {exercise.name}
          </h2>
          {isCompleted && (
            <div className="shrink-0 w-8 h-8 rounded-full bg-neon-orange/20 border border-neon-orange/50 flex items-center justify-center mt-0.5">
              <Check className="w-4 h-4 text-neon-orange" />
            </div>
          )}
          {isSkipped && (
            <div className="shrink-0 w-8 h-8 rounded-full bg-muted/30 border border-muted-foreground/40 flex items-center justify-center mt-0.5">
              <SkipForward className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <span className="font-mono text-xs bg-card/80 border border-border rounded px-2 py-1 text-muted-foreground">
            {exercise.sets} {exercise.sets === 1 ? 'set' : 'sets'}
          </span>
          <span className="font-mono text-xs bg-card/80 border border-border rounded px-2 py-1 text-muted-foreground flex items-center gap-1">
            {hasDuration && <Timer className="w-3 h-3" />}
            {targetLabel ?? '—'}
          </span>
          {isCompleted && (
            <span className="font-mono text-xs text-neon-orange tracking-wider">DONE</span>
          )}
          {isSkipped && (
            <span className="font-mono text-xs text-muted-foreground tracking-wider">SKIPPED</span>
          )}
        </div>
      </div>

      {/* Set rows */}
      {!hasDuration ? (
        <div className="space-y-2 mb-5">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Log sets
            </span>
            {!isAddressed && (
              <span className="font-mono text-[10px] text-muted-foreground">
                {visibleSetCount} of {exercise.sets} shown
              </span>
            )}
          </div>
          {visibleSets.map((set, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-3 py-3 transition-colors',
                isCompleted && 'bg-neon-orange/5 border-neon-orange/20',
                isSkipped && 'bg-muted/20 border-border/60 opacity-60',
                !isAddressed && 'bg-card/50 border-border',
              )}
            >
              <span className="font-mono text-xs text-muted-foreground w-10 shrink-0">
                SET {i + 1}
              </span>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1">
                  <label className="font-mono text-xs text-muted-foreground block mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={set.weight}
                    onChange={(e) => updateSet(i, 'weight', e.target.value)}
                    onFocus={() => handleSetFocus(i)}
                    placeholder="—"
                    disabled={isAddressed}
                    className={cn(
                      'w-full h-11 bg-input/60 border border-border rounded-md px-3',
                      'font-mono text-base text-foreground placeholder:text-muted-foreground/40',
                      'focus:outline-none focus:border-neon-orange/60 focus:ring-1 focus:ring-neon-orange/30',
                      'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                  />
                </div>
                <div className="flex-1">
                  <label className="font-mono text-xs text-muted-foreground block mb-1">
                    Reps
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={set.reps}
                    onChange={(e) => updateSet(i, 'reps', e.target.value)}
                    onFocus={() => handleSetFocus(i)}
                    placeholder="—"
                    disabled={isAddressed}
                    className={cn(
                      'w-full h-11 bg-input/60 border border-border rounded-md px-3',
                      'font-mono text-base text-foreground placeholder:text-muted-foreground/40',
                      'focus:outline-none focus:border-neon-orange/60 focus:ring-1 focus:ring-neon-orange/30',
                      'transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className={cn(
            'rounded-lg border p-4 mb-5 flex items-center gap-4',
            isCompleted && 'bg-neon-orange/5 border-neon-orange/20',
            isSkipped && 'bg-muted/20 border-border/60 opacity-60',
            !isAddressed && 'bg-card/50 border-border',
          )}
        >
          <Timer className="w-6 h-6 text-muted-foreground shrink-0" />
          <div>
            <div className="font-sans text-lg font-bold text-foreground">{exercise.duration}</div>
            <div className="font-mono text-xs text-muted-foreground">
              {exercise.sets} {exercise.sets === 1 ? 'set' : 'sets'} · hold time
            </div>
          </div>
        </div>
      )}

      {isActive && <ExerciseStopwatch key={exercise.name} sessionLabel={exercise.name} />}

      {/* Notes (collapsible) */}
      {exercise.notes && exercise.notes.length > 0 && (
        <div className="mb-5">
          <button
            onClick={() => setNotesOpen((o) => !o)}
            data-haptic="light"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors min-h-[36px] w-full text-left"
          >
            <span className="font-mono text-xs uppercase tracking-wider">Notes</span>
            {notesOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
          {notesOpen && (
            <ul className="mt-2 space-y-1.5 pl-2 border-l-2 border-neon-orange/20">
              {exercise.notes.map((note, i) => (
                <li key={i} className="font-mono text-xs text-muted-foreground flex gap-2">
                  <span className="text-neon-orange/40 shrink-0">›</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Actions */}
      {isAddressed ? (
        <button
          onClick={onMarkUndone}
          data-haptic="selection"
          className="w-full min-h-[44px] rounded-lg border border-neon-orange/30 font-mono text-sm text-neon-orange/70 hover:text-neon-orange hover:border-neon-orange/60 transition-colors flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          UNDO
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            onClick={onMarkDone}
            data-haptic="success"
            className="w-full min-h-[52px] rounded-lg bg-neon-orange text-primary-foreground font-mono text-sm font-bold tracking-widest uppercase hover:opacity-90 active:opacity-75 transition-opacity neon-border-orange"
          >
            MARK DONE
          </button>
          <button
            onClick={onSkip}
            data-haptic="warning"
            className="w-full min-h-[44px] rounded-lg border border-border font-mono text-sm tracking-widest uppercase text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors flex items-center justify-center gap-2"
          >
            <SkipForward className="w-4 h-4" />
            SKIP
          </button>
        </div>
      )}
    </div>
  )
}
