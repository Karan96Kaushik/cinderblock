import { useEffect, useRef, useState, type ReactNode } from 'react'
import { format } from 'date-fns'
import { ChevronDown, ChevronUp, Check, Keyboard, Timer, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ExerciseLog, LastExerciseRecord, ProgramExercise, SetLog } from './gym-tracker'
import { createEmptySet, formatSetSummary, hasSetLogData, isSetComplete } from './gym-tracker'
import { isTimedHoldExercise } from '@/lib/program'
import { useSettings } from '@/hooks/use-settings'
import { ExerciseRefVideoLink } from './exercise-ref-video-link'
interface ExerciseStepProps {
  exercise: ProgramExercise
  log: ExerciseLog | undefined
  userVideoUrl?: string
  lastRecord?: LastExerciseRecord | null
  isActive?: boolean
  restTimer?: ReactNode
  onAutoStartRestTimer?: () => void
  programReminders?: string[]
  onUpdateSets: (sets: SetLog[]) => void
  onMarkDone: () => void
  onSkip: () => void
  onMarkUndone: () => void
}

function setsForExercise(log: ExerciseLog | undefined, exercise: ProgramExercise): SetLog[] {
  const logged = log?.sets ?? []
  if (logged.length >= exercise.sets) return logged
  return [
    ...logged,
    ...Array.from({ length: exercise.sets - logged.length }, () => createEmptySet(exercise)),
  ]
}

function LogField({
  label,
  value,
  onChange,
  onFocus,
  disabled,
  inputMode,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  onFocus: () => void
  disabled: boolean
  inputMode: 'numeric' | 'decimal'
}) {
  const showHint = !disabled && value.trim() === ''

  return (
    <div className="flex-1 min-w-0">
      <label className="font-mono text-xs text-muted-foreground block mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          inputMode={inputMode}
          enterKeyHint="done"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          placeholder={disabled ? '—' : 'Tap to enter'}
          disabled={disabled}
          aria-label={label}
          className={cn(
            'w-full h-11 rounded-md bg-background border-2 px-3',
            showHint ? 'pr-9' : 'pr-3',
            'font-mono text-base text-foreground placeholder:text-muted-foreground/75',
            'border-neon-orange/50 focus:outline-none focus:border-neon-orange focus:ring-2 focus:ring-neon-orange/25',
            'transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:border-border disabled:bg-input/40',
          )}
        />
        {showHint && (
          <Keyboard
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neon-orange/80 pointer-events-none"
            aria-hidden
          />
        )}
      </div>
    </div>
  )
}

function fillSetFromPrevious(sets: SetLog[], index: number): SetLog[] {
  if (index <= 0 || hasSetLogData(sets[index])) return sets

  const prev = sets[index - 1]
  if (!hasSetLogData(prev)) return sets

  const next = [...sets]
  next[index] = { ...prev }
  return next
}

export function ExerciseStep({
  exercise,
  log,
  userVideoUrl,
  lastRecord,
  isActive = true,
  restTimer,
  programReminders = [],
  onAutoStartRestTimer,
  onUpdateSets,
  onMarkDone,
  onSkip,
  onMarkUndone,
}: ExerciseStepProps) {
  const { settings } = useSettings()
  const [notesOpen, setNotesOpen] = useState(false)
  const [remindersOpen, setRemindersOpen] = useState(true)

  const sets = setsForExercise(log, exercise)
  const isCompleted = log?.completed ?? false
  const isSkipped = log?.skipped ?? false
  const isAddressed = isCompleted || isSkipped
  const isTimedHold = isTimedHoldExercise(exercise)
  const targetLabel = isTimedHold ? exercise.duration : exercise.reps
  const displayedSets = sets.slice(0, exercise.sets)
  const loggedSetCount = displayedSets.filter((set) => isSetComplete(set, isTimedHold)).length

  // Sets after the first are prefilled from the previous set on focus, so they are
  // already "complete" before the user types. Tracking which sets have fired keeps
  // auto-start working for them without restarting on every later keystroke.
  const autoStartedSets = useRef<Set<number>>(new Set())

  useEffect(() => {
    autoStartedSets.current = new Set()
  }, [exercise.name])

  const updateSet = (index: number, field: keyof SetLog, value: string) => {
    const next = sets.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    const nowComplete = isSetComplete(next[index], isTimedHold)

    if (
      settings.autoStartRestTimer &&
      nowComplete &&
      !autoStartedSets.current.has(index) &&
      index < exercise.sets - 1
    ) {
      autoStartedSets.current.add(index)
      onAutoStartRestTimer?.()
    }

    onUpdateSets(next)
  }

  const handleSetFocus = (index: number) => {
    const next = fillSetFromPrevious(sets, index)
    if (next !== sets) {
      onUpdateSets(next)
    }
  }

  const lastSessionSummary = lastRecord ? formatSetSummary(lastRecord.log) : null

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
            {isTimedHold && <Timer className="w-3 h-3" />}
            {targetLabel ?? '—'}
          </span>
          {isCompleted && (
            <span className="font-mono text-xs text-neon-orange tracking-wider">DONE</span>
          )}
          {isSkipped && (
            <span className="font-mono text-xs text-muted-foreground tracking-wider">SKIPPED</span>
          )}
        </div>

        {(userVideoUrl || exercise.refVideo) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {userVideoUrl && <ExerciseRefVideoLink url={userVideoUrl} label="Reference" />}
            {exercise.refVideo && (
              <ExerciseRefVideoLink url={exercise.refVideo} label="Video" />
            )}
          </div>
        )}
      </div>

      <div className="mb-3 rounded-lg border border-border/60 bg-card/30 px-3 py-2.5 space-y-2">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block">
            This session
          </span>
          <span
            className={cn(
              'font-mono text-sm',
              loggedSetCount > 0 ? 'text-neon-orange' : 'text-foreground',
            )}
          >
            Set {loggedSetCount} of {exercise.sets} logged
          </span>
        </div>
        {lastRecord && lastSessionSummary && (
          <div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block">
              Last session · {format(new Date(`${lastRecord.date}T12:00:00`), 'MMM d')}
            </span>
            <span className="font-mono text-xs text-foreground/80">{lastSessionSummary}</span>
          </div>
        )}
      </div>

      {/* Every programmed set is listed so later sets are never hidden. */}
      <div className="space-y-2 mb-5">
        <div className="mb-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Log sets
          </span>
        </div>
        {displayedSets.map((set, i) => {
          const setDone = isSetComplete(set, isTimedHold)
          return (
          <div
            key={i}
            className={cn(
              'flex items-center gap-3 rounded-lg border px-3 py-3 transition-colors',
              isCompleted && 'bg-neon-orange/5 border-neon-orange/20',
              isSkipped && 'bg-muted/20 border-border/60 opacity-60',
              !isAddressed && 'bg-card/50 border-border',
            )}
          >
            <span className="font-mono text-xs text-muted-foreground w-14 shrink-0 inline-flex items-center gap-1">
              SET {i + 1}
              {setDone && <Check className="w-3 h-3 text-neon-orange" aria-hidden />}
            </span>
            <div className="flex-1 flex items-center gap-2 min-w-0">
              {isTimedHold ? (
                <LogField
                  label="Seconds held"
                  value={set.seconds ?? ''}
                  onChange={(value) => updateSet(i, 'seconds', value)}
                  onFocus={() => handleSetFocus(i)}
                  disabled={isAddressed}
                  inputMode="numeric"
                />
              ) : (
                <>
                  <LogField
                    label="Weight (kg)"
                    value={set.weight}
                    onChange={(value) => updateSet(i, 'weight', value)}
                    onFocus={() => handleSetFocus(i)}
                    disabled={isAddressed}
                    inputMode="decimal"
                  />
                  <LogField
                    label="Reps"
                    value={set.reps}
                    onChange={(value) => updateSet(i, 'reps', value)}
                    onFocus={() => handleSetFocus(i)}
                    disabled={isAddressed}
                    inputMode="numeric"
                  />
                </>
              )}
            </div>
          </div>
          )
        })}
      </div>

      {exercise.muscles.length > 0 && (
        <div className="mb-5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block mb-1.5">
            Muscles trained
          </span>
          <div className="flex flex-wrap gap-1.5">
            {exercise.muscles.map((muscle) => (
              <span
                key={muscle}
                className="font-mono text-xs bg-neon-orange/10 border border-neon-orange/20 rounded px-2 py-0.5 text-neon-orange/80"
              >
                {muscle}
              </span>
            ))}
          </div>
        </div>
      )}

      {isActive && restTimer}

      <div className="mb-2 space-y-3">
        {exercise.notes && exercise.notes.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setNotesOpen((o) => !o)}
              data-haptic="light"
              aria-expanded={notesOpen}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors min-h-[36px] w-full text-left"
            >
              <span className="font-mono text-xs uppercase tracking-wider">Exercise notes</span>
              <span className="font-mono text-[10px] uppercase tracking-wider border border-border rounded px-1.5 py-0.5 text-muted-foreground">
                This exercise
              </span>
              {notesOpen ? (
                <ChevronUp className="w-3.5 h-3.5 ml-auto" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 ml-auto" />
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

        {programReminders.length > 0 && (
          <div className="rounded-lg border border-border/40 bg-card/20 px-3 py-2.5">
            <button
              type="button"
              onClick={() => setRemindersOpen((o) => !o)}
              data-haptic="light"
              aria-expanded={remindersOpen}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors min-h-[36px] w-full text-left"
            >
              <span className="font-mono text-xs uppercase tracking-wider text-neon-orange/80">
                Program reminders
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider border border-neon-orange/30 rounded px-1.5 py-0.5 text-neon-orange/80">
                Every workout
              </span>
              {remindersOpen ? (
                <ChevronUp className="w-3.5 h-3.5 ml-auto" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 ml-auto" />
              )}
            </button>
            {remindersOpen && (
              <ul className="mt-2 space-y-1.5">
                {programReminders.map((note, i) => (
                  <li key={i} className="font-mono text-xs text-muted-foreground/80 flex gap-2">
                    <span className="text-neon-orange/30 shrink-0">›</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {/* {isAddressed ? (
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
      )} */}
    </div>
  )
}
