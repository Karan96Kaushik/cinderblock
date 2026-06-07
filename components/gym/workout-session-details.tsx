import { format, parseISO } from 'date-fns'
import { Check, ChevronRight, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getWorkoutLabel,
  isProgramWorkoutKey,
  program,
  REST_DAY_KEY,
  type ProgramExercise,
} from '@/lib/program'
import type { DayLog, ExerciseLog, GymStore } from './gym-tracker'
import {
  formatSetSummary,
  getDayStatus,
  getExerciseStatus,
  hasLoggedSetData,
  isExerciseAddressed,
} from './gym-tracker'

interface WorkoutSessionDetailsProps {
  date: string
  log: DayLog | undefined
  onOpenWorkout?: () => void
  onStartWorkout?: () => void
}

const STATUS_LABELS = {
  done: 'Done',
  skipped: 'Skipped',
  logged: 'Logged',
  pending: 'Not started',
} as const

const STATUS_STYLES = {
  done: 'text-neon-orange',
  skipped: 'text-muted-foreground',
  logged: 'text-neon-yellow',
  pending: 'text-muted-foreground/60',
} as const

function ExerciseDetailRow({
  name,
  log,
}: {
  name: string
  log: ExerciseLog | undefined
}) {
  const status = getExerciseStatus(log)
  const setSummary = log ? formatSetSummary(log) : null

  return (
    <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div
            className={cn(
              'font-sans text-sm font-bold leading-tight',
              status === 'done' && 'text-neon-orange',
              status === 'skipped' && 'text-muted-foreground line-through',
              status === 'logged' && 'text-foreground',
              status === 'pending' && 'text-muted-foreground',
            )}
          >
            {name}
          </div>
          {setSummary && (
            <div className="font-mono text-xs text-muted-foreground mt-1 leading-relaxed">
              {setSummary}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {status === 'done' && <Check className="w-3.5 h-3.5 text-neon-orange" />}
          {status === 'skipped' && <SkipForward className="w-3.5 h-3.5 text-muted-foreground" />}
          <span className={cn('font-mono text-[10px] uppercase tracking-wider', STATUS_STYLES[status])}>
            {STATUS_LABELS[status]}
          </span>
        </div>
      </div>
    </div>
  )
}

export function WorkoutSessionDetails({
  date,
  log,
  onOpenWorkout,
  onStartWorkout,
}: WorkoutSessionDetailsProps) {
  const displayDate = format(parseISO(date + 'T12:00:00'), 'EEEE, MMM d')
  const status = getDayStatus(log)

  if (!log) {
    return (
      <div className="px-4 mb-6">
        <div className="bg-card/40 border border-border rounded-xl p-4">
          <h3 className="font-mono text-xs text-neon-orange uppercase tracking-wider mb-1">
            {displayDate}
          </h3>
          <p className="font-mono text-xs text-muted-foreground mb-4">No workout logged</p>
          {onStartWorkout && (
            <button
              type="button"
              onClick={onStartWorkout}
              data-haptic="success"
              className="w-full min-h-[44px] rounded-lg bg-neon-orange text-primary-foreground font-mono text-xs font-bold tracking-widest uppercase hover:opacity-90 transition-opacity"
            >
              Log workout
            </button>
          )}
        </div>
      </div>
    )
  }

  const workout =
    log.workoutKey !== REST_DAY_KEY && isProgramWorkoutKey(log.workoutKey)
      ? program.workouts[log.workoutKey]
      : undefined
  const exercises: ProgramExercise[] =
    workout?.exercises ??
    Object.keys(log.exercises).map((name) => ({ name, sets: 0, notes: [] }))
  const completed = Object.values(log.exercises).filter((e) => e.completed).length
  const skipped = Object.values(log.exercises).filter((e) => e.skipped).length
  const logged = Object.values(log.exercises).filter(
    (e) => !isExerciseAddressed(e) && hasLoggedSetData(e),
  ).length
  const total = exercises.length

  return (
    <div className="px-4 mb-6">
      <div className="bg-card/40 border border-border rounded-xl p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="font-mono text-xs text-neon-orange uppercase tracking-wider">
              {displayDate}
            </h3>
            <p className="font-sans text-lg font-bold text-foreground mt-1">
              {getWorkoutLabel(log.workoutKey)}
            </p>
            <p className="font-mono text-xs text-muted-foreground mt-0.5">
              {status === 'complete' && total > 0 && `${completed}/${total} exercises complete`}
              {status === 'partial' &&
                total > 0 &&
                `${completed} done · ${skipped} skipped · ${logged} with sets logged`}
              {status === 'rest' && 'Rest day logged'}
            </p>
          </div>
          <DayStatusBadge status={status} />
        </div>

        {log.workoutKey !== REST_DAY_KEY && exercises.length > 0 && (
          <div className="space-y-2 mb-4">
            {exercises.map((exercise) => (
              <ExerciseDetailRow
                key={exercise.name}
                name={exercise.name}
                log={log.exercises[exercise.name]}
              />
            ))}
          </div>
        )}

        {onOpenWorkout && log.workoutKey !== REST_DAY_KEY && (
          <button
            type="button"
            onClick={onOpenWorkout}
            data-haptic="selection"
            className="w-full min-h-[44px] rounded-lg border border-neon-orange/40 font-mono text-xs font-bold tracking-widest uppercase text-neon-orange hover:bg-neon-orange/10 transition-colors flex items-center justify-center gap-2"
          >
            {status === 'complete' ? 'Review workout' : 'Continue workout'}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {onStartWorkout && log.workoutKey === REST_DAY_KEY && (
          <button
            type="button"
            onClick={onStartWorkout}
            data-haptic="selection"
            className="w-full min-h-[44px] rounded-lg border border-border font-mono text-xs tracking-widest uppercase text-muted-foreground hover:text-neon-orange hover:border-neon-orange/40 transition-colors"
          >
            Change workout
          </button>
        )}
      </div>
    </div>
  )
}

function DayStatusBadge({ status }: { status: ReturnType<typeof getDayStatus> }) {
  const styles = {
    complete: 'bg-neon-orange/20 text-neon-orange',
    partial: 'bg-neon-yellow/10 text-neon-yellow',
    rest: 'bg-muted text-muted-foreground',
    empty: 'bg-muted/50 text-muted-foreground',
  }
  const labels = {
    complete: 'Complete',
    partial: 'In progress',
    rest: 'Rest',
    empty: 'Empty',
  }
  return (
    <span className={cn('font-mono text-[10px] uppercase px-2 py-0.5 rounded shrink-0', styles[status])}>
      {labels[status]}
    </span>
  )
}

/** Summary line for a day entry in lists */
export function formatDayLogSummary(log: GymStore[string]): string {
  const status = getDayStatus(log)
  const total = Object.keys(log.exercises).length
  const completed = Object.values(log.exercises).filter((e) => e.completed).length
  const withSets = Object.values(log.exercises).filter((e) => formatSetSummary(e)).length

  if (status === 'rest') return getWorkoutLabel(REST_DAY_KEY)
  const label = getWorkoutLabel(log.workoutKey)
  if (status === 'complete') return `${label} · ${completed}/${total} done`
  if (withSets > 0) {
    return `${label} · ${completed}/${total} done · ${withSets} logged`
  }
  return `${label} · ${completed}/${total} in progress`
}
