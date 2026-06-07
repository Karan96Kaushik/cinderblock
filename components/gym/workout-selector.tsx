import { useState } from 'react'
import { format } from 'date-fns'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getProgramWorkoutKeys,
  getScheduleHint,
  getWorkoutAccentClasses,
  getWorkoutExerciseCount,
  getWorkoutLabel,
  isProgramWorkoutKey,
  isWorkoutKey,
  program,
  REST_DAY_KEY,
  type ProgramWorkoutKey,
  type WorkoutKey,
} from '@/lib/program'

interface WorkoutSelectorProps {
  date: string
  existingKey?: WorkoutKey | string
  onSelect: (key: WorkoutKey) => void
  onBack: () => void
}

export function WorkoutSelector({ date, existingKey, onBack, onSelect }: WorkoutSelectorProps) {
  const [selected, setSelected] = useState<WorkoutKey | string | null>(existingKey ?? null)
  const displayDate = format(new Date(date + 'T12:00:00'), 'EEEE, MMMM d')
  const workoutKeys = getProgramWorkoutKeys()

  const isResume = existingKey && existingKey !== REST_DAY_KEY && selected === existingKey

  const exerciseCount =
    selected && selected !== REST_DAY_KEY && isProgramWorkoutKey(selected)
      ? getWorkoutExerciseCount(selected)
      : 0

  return (
    <div className="min-h-[calc(100vh-57px)] flex flex-col pb-28">
      {/* Back + date header */}
      <div className="px-4 pt-5 pb-4">
        <button
          onClick={onBack}
          data-haptic="light"
          className="flex items-center gap-1 text-muted-foreground hover:text-neon-orange transition-colors mb-4 min-h-[44px]"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="font-mono text-xs">Back</span>
        </button>
        <h2 className="font-sans text-xl font-bold text-foreground tracking-wider uppercase">
          What's today's workout?
        </h2>
        <p className="font-mono text-xs text-muted-foreground mt-1">{displayDate}</p>
      </div>

      {/* Workout grid */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-3">
        {workoutKeys.map((key: ProgramWorkoutKey) => {
          const isActive = selected === key
          const styles = getWorkoutAccentClasses(key)
          const workout = program.workouts[key]
          const exercises = workout.exercises

          return (
            <button
              key={key}
              onClick={() => setSelected(key)}
              data-haptic="selection"
              className={cn(
                'relative flex flex-col items-start text-left rounded-xl border p-4 transition-all min-h-[100px]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-orange/50',
                isActive
                  ? cn(styles.accentClass, styles.borderClass, 'ring-1', styles.borderClass)
                  : 'bg-card/40 border-border hover:border-muted-foreground',
              )}
            >
              {isActive && (
                <span
                  className={cn('absolute top-2.5 right-2.5 w-2 h-2 rounded-full', styles.dotClass)}
                />
              )}
              <span className={cn('font-sans text-sm font-bold tracking-wider', styles.color)}>
                {workout.name.toUpperCase()}
              </span>
              <span className="font-mono text-xs text-muted-foreground mt-1 leading-relaxed">
                {getScheduleHint(key)}
              </span>
              <span className="font-mono text-xs text-muted-foreground/60 mt-2">
                {exercises.length} exercises
              </span>
            </button>
          )
        })}
      </div>

      {/* Rest button */}
      <div className="px-4 mb-6">
        <button
          onClick={() => setSelected(REST_DAY_KEY)}
          data-haptic="selection"
          className={cn(
            'w-full flex items-center justify-center rounded-xl border py-4 transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-muted',
            selected === REST_DAY_KEY
              ? 'bg-muted/30 border-muted-foreground/50'
              : 'bg-card/20 border-border hover:border-muted-foreground',
          )}
        >
          <span className="font-mono text-sm text-muted-foreground tracking-wider">
            {getWorkoutLabel(REST_DAY_KEY).toUpperCase()}
          </span>
          {selected === REST_DAY_KEY && (
            <span className="ml-3 w-2 h-2 rounded-full bg-muted-foreground" />
          )}
        </button>
      </div>

      {/* Global notes preview */}
      <div className="px-4 mb-6">
        <div className="bg-card/20 border border-border/40 rounded-lg p-4">
          <h3 className="font-mono text-xs text-neon-orange uppercase tracking-wider mb-2">
            GLOBAL NOTES
          </h3>
          <ul className="space-y-1.5">
            {program.globalNotes.slice(0, 3).map((note, i) => (
              <li key={i} className="font-mono text-xs text-muted-foreground flex gap-2">
                <span className="text-neon-orange/40 shrink-0">›</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 border-t border-border backdrop-blur-sm">
        <div className="max-w-2xl mx-auto space-y-2">
          {selected && (
            <div className="text-center font-mono text-xs text-muted-foreground">
              {selected === REST_DAY_KEY
                ? 'Log rest day'
                : `${exerciseCount} exercises · ${isResume ? 'Resume session' : 'Start fresh'}`}
            </div>
          )}
          <button
            onClick={() => selected && isWorkoutKey(selected) && onSelect(selected)}
            disabled={!selected || !isWorkoutKey(selected)}
            data-haptic="success"
            className={cn(
              'w-full min-h-[52px] rounded-lg font-mono text-sm font-bold tracking-widest uppercase transition-all',
              selected
                ? 'bg-neon-orange text-primary-foreground hover:opacity-90 active:opacity-75 neon-border-orange'
                : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50',
            )}
          >
            {selected === REST_DAY_KEY
              ? 'LOG REST DAY'
              : isResume
                ? 'RESUME WORKOUT →'
                : selected
                  ? 'START WORKOUT →'
                  : 'SELECT A WORKOUT'}
          </button>
        </div>
      </div>
    </div>
  )
}
