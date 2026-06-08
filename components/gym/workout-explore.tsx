import { ChevronLeft, ChevronRight, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getProgramWorkout,
  getProgramWorkoutKeys,
  getScheduleHint,
  getWorkoutAccentClasses,
  getWorkoutExerciseCount,
  isProgramWorkoutKey,
  program,
  type ProgramExercise,
  type ProgramWorkoutKey,
} from '@/lib/program'

interface WorkoutExploreProps {
  workoutKey?: string
  onSelectWorkout: (key: ProgramWorkoutKey) => void
  onBack: () => void
  onStartTraining: () => void
}

function ExercisePreview({ exercise, index }: { exercise: ProgramExercise; index: number }) {
  const hasDuration = Boolean(exercise.duration)
  const target = hasDuration ? exercise.duration : exercise.reps

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="flex items-start gap-3 mb-3">
        <span className="font-mono text-xs text-neon-orange w-6 shrink-0 pt-1">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-sans text-lg font-bold text-foreground leading-tight">
            {exercise.name}
          </h3>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="font-mono text-xs bg-background/60 border border-border rounded px-2 py-1 text-muted-foreground">
              {exercise.sets} {exercise.sets === 1 ? 'set' : 'sets'}
            </span>
            {target && (
              <span className="font-mono text-xs bg-background/60 border border-border rounded px-2 py-1 text-muted-foreground flex items-center gap-1">
                {hasDuration && <Timer className="w-3 h-3" />}
                {target}
              </span>
            )}
          </div>
        </div>
      </div>

      {exercise.notes.length > 0 && (
        <ul className="space-y-1.5 pl-9 border-l-2 border-neon-orange/20 ml-3">
          {exercise.notes.map((note, i) => (
            <li key={i} className="font-mono text-xs text-muted-foreground flex gap-2">
              <span className="text-neon-orange/40 shrink-0">›</span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function WorkoutExplore({
  workoutKey,
  onSelectWorkout,
  onBack,
  onStartTraining,
}: WorkoutExploreProps) {
  const workoutKeys = getProgramWorkoutKeys()
  const selectedKey =
    workoutKey && isProgramWorkoutKey(workoutKey) ? workoutKey : undefined

  if (selectedKey) {
    const workout = getProgramWorkout(selectedKey)
    const styles = getWorkoutAccentClasses(selectedKey)

    return (
      <div className="pb-28">
        <div className="px-4 pt-6 pb-4">
          <button
            type="button"
            onClick={onBack}
            data-haptic="light"
            className="flex items-center gap-1 text-muted-foreground hover:text-neon-orange transition-colors mb-4 min-h-[44px]"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="font-mono text-xs">All workouts</span>
          </button>

          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1">
            Explore · read only
          </p>
          <h1 className={cn('font-sans text-3xl font-bold tracking-wider uppercase', styles.color)}>
            {workout.name}
          </h1>
          <p className="font-mono text-sm text-muted-foreground mt-2">
            {getScheduleHint(selectedKey)} · {workout.exercises.length} exercises
          </p>
        </div>

        <div className="px-4 space-y-3 mb-8">
          {workout.exercises.map((exercise, index) => (
            <ExercisePreview key={exercise.name} exercise={exercise} index={index} />
          ))}
        </div>

        <div className="px-4">
          <div className="rounded-xl border border-border/60 bg-card/20 p-4 mb-4">
            <p className="font-mono text-xs text-muted-foreground leading-relaxed">
              This is a preview of your program template. No sets are logged here — start a session
              from the training log when you are ready to train.
            </p>
          </div>
          <button
            type="button"
            onClick={onStartTraining}
            data-haptic="success"
            className="w-full min-h-[52px] rounded-xl bg-neon-orange text-primary-foreground font-mono text-sm font-bold tracking-widest uppercase hover:opacity-90 transition-opacity neon-border-orange"
          >
            Start training session
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-28">
      <div className="px-4 pt-6 pb-4">
        <button
          type="button"
          onClick={onBack}
          data-haptic="light"
          className="flex items-center gap-1 text-muted-foreground hover:text-neon-orange transition-colors mb-4 min-h-[44px]"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="font-mono text-xs">Training log</span>
        </button>

        <h1 className="font-sans text-2xl font-bold fire-gradient-text tracking-wider">
          EXPLORE WORKOUT
        </h1>
        <p className="font-mono text-xs text-muted-foreground mt-2 leading-relaxed">
          {program.name} — preview exercises, sets, and notes without starting a session.
        </p>
      </div>

      <div className="px-4 space-y-3">
        {workoutKeys.map((key) => {
          const workout = program.workouts[key]
          const styles = getWorkoutAccentClasses(key)
          const count = getWorkoutExerciseCount(key)

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectWorkout(key)}
              data-haptic="selection"
              className={cn(
                'w-full text-left rounded-xl border p-4 transition-all min-h-[88px]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-orange/50',
                'bg-card/40 border-border hover:border-muted-foreground',
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className={cn('font-sans text-lg font-bold tracking-wider uppercase', styles.color)}>
                    {workout.name}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground mt-1">
                    {getScheduleHint(key)}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground/70 mt-1">
                    {count} exercises
                  </p>
                </div>
                <ChevronRight className={cn('w-5 h-5 shrink-0', styles.color)} />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
