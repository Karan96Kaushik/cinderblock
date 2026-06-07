import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePreventPullToRefresh } from '@/hooks/use-prevent-pull-to-refresh'
import program from '@/foundation-7-june.json'
import type { DayLog, GymStore, ProgramExercise, SetLog, WorkoutKey } from './gym-tracker'
import { isExerciseAddressed } from './gym-tracker'
import { ExerciseStep } from './exercise-step'

interface WorkoutFlowProps {
  date: string
  workoutKey: WorkoutKey
  dayLog: DayLog
  store: GymStore
  onUpdateStore: (store: GymStore) => void
  onBack: () => void
  onFinish: () => void
}

type WorkoutMap = Record<string, { name: string; exercises: ProgramExercise[] }>

export function WorkoutFlow({
  date,
  workoutKey,
  dayLog,
  store,
  onUpdateStore,
  onBack,
  onFinish,
}: WorkoutFlowProps) {
  const workouts = program.workouts as WorkoutMap
  const workout = workouts[workoutKey]
  const exercises = workout?.exercises ?? []

  const [currentStep, setCurrentStep] = useState<number>(() => {
    const firstPending = exercises.findIndex(
      (ex) => !isExerciseAddressed(dayLog.exercises[ex.name]),
    )
    return firstPending === -1 ? 0 : firstPending
  })

  const progressStripRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  usePreventPullToRefresh(scrollRef)

  // Scroll the active progress dot into view when step changes
  useEffect(() => {
    const strip = progressStripRef.current
    if (!strip) return
    const dot = strip.children[currentStep] as HTMLElement | undefined
    if (dot) {
      dot.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [currentStep])

  const completedCount = exercises.filter(
    (ex) => dayLog.exercises[ex.name]?.completed,
  ).length
  const skippedCount = exercises.filter(
    (ex) => dayLog.exercises[ex.name]?.skipped,
  ).length
  const addressedCount = exercises.filter(
    (ex) => isExerciseAddressed(dayLog.exercises[ex.name]),
  ).length
  const allAddressed = addressedCount === exercises.length

  const displayDate = format(new Date(date + 'T12:00:00'), 'MMM d')

  const updateExerciseLog = (
    exerciseName: string,
    patch: { sets?: SetLog[]; completed?: boolean; skipped?: boolean },
  ) => {
    const prev = dayLog.exercises[exerciseName] ?? {
      sets: [],
      completed: false,
      skipped: false,
    }
    const updatedLog: DayLog = {
      ...dayLog,
      exercises: {
        ...dayLog.exercises,
        [exerciseName]: { ...prev, ...patch },
      },
    }
    onUpdateStore({ ...store, [date]: updatedLog })
  }

  const advanceToNextPending = (fromStep: number) => {
    const nextPending = exercises.findIndex(
      (ex, i) =>
        i !== fromStep &&
        !isExerciseAddressed(dayLog.exercises[ex.name]) &&
        i > fromStep,
    )
    const anyPending = exercises.findIndex(
      (ex, i) => i !== fromStep && !isExerciseAddressed(dayLog.exercises[ex.name]),
    )
    setCurrentStep(nextPending !== -1 ? nextPending : anyPending !== -1 ? anyPending : fromStep)
  }

  const handleMarkDone = () => {
    const exercise = exercises[currentStep]
    if (!exercise) return
    updateExerciseLog(exercise.name, { completed: true, skipped: false })
    advanceToNextPending(currentStep)
  }

  const handleSkip = () => {
    const exercise = exercises[currentStep]
    if (!exercise) return
    updateExerciseLog(exercise.name, { completed: false, skipped: true })
    advanceToNextPending(currentStep)
  }

  const handleMarkUndone = () => {
    const exercise = exercises[currentStep]
    if (!exercise) return
    updateExerciseLog(exercise.name, { completed: false, skipped: false })
  }

  const handleUpdateSets = (sets: SetLog[]) => {
    const exercise = exercises[currentStep]
    if (!exercise) return
    updateExerciseLog(exercise.name, { sets })
  }

  const currentExercise = exercises[currentStep]
  const currentLog = currentExercise ? dayLog.exercises[currentExercise.name] : undefined

  return (
    <div className="min-h-[calc(100vh-57px)] flex flex-col overscroll-none">
      {/* Workout header row */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <button
          onClick={onBack}
          data-haptic="light"
          className="flex items-center gap-1 text-muted-foreground hover:text-neon-orange transition-colors min-h-[44px]"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="font-mono text-xs">Change</span>
        </button>
        <div className="text-center">
          <div className="font-sans text-xs font-bold tracking-widest uppercase text-foreground">
            {workout?.name}
          </div>
          <div className="font-mono text-xs text-muted-foreground">{displayDate}</div>
        </div>
        <div className="font-mono text-xs text-muted-foreground min-w-[44px] text-right">
          {currentStep + 1} / {exercises.length}
        </div>
      </div>

      {/* Progress strip */}
      <div className="px-4 pb-3">
        <div
          ref={progressStripRef}
          className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1"
          style={{ scrollbarWidth: 'none' }}
        >
          {exercises.map((ex, i) => {
            const log = dayLog.exercises[ex.name]
            const done = log?.completed
            const skipped = log?.skipped
            const isCurrent = i === currentStep

            return (
              <button
                key={ex.name}
                onClick={() => setCurrentStep(i)}
                data-haptic="selection"
                title={ex.name}
                className={cn(
                  'shrink-0 rounded-full transition-all focus-visible:outline-none',
                  'focus-visible:ring-2 focus-visible:ring-neon-orange/50',
                  isCurrent
                    ? 'w-6 h-3 bg-neon-orange animate-pulse rounded-full'
                    : done
                      ? 'w-3 h-3 bg-neon-orange/80'
                      : skipped
                        ? 'w-3 h-3 bg-muted-foreground/40 ring-1 ring-muted-foreground/60'
                        : 'w-3 h-3 bg-border hover:bg-muted-foreground/50',
                )}
              />
            )
          })}
        </div>

        {/* Progress text */}
        <div className="flex items-center gap-3 mt-1">
          <div className="h-px flex-1 bg-border/50" />
          <span className="font-mono text-xs text-muted-foreground shrink-0">
            {completedCount}/{exercises.length} done
            {skippedCount > 0 && ` · ${skippedCount} skipped`}
          </span>
          <div className="h-px flex-1 bg-border/50" />
        </div>
      </div>

      {/* Exercise step — scrollable main content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-none px-4 pb-40">
        {currentExercise && (
          <div className="py-2">
            <ExerciseStep
              exercise={currentExercise}
              log={currentLog}
              onUpdateSets={handleUpdateSets}
              onMarkDone={handleMarkDone}
              onSkip={handleSkip}
              onMarkUndone={handleMarkUndone}
            />
          </div>
        )}

        {/* All done celebration */}
        {allAddressed && (
          <div className="mt-6 bg-neon-orange/10 border border-neon-orange/30 rounded-xl p-6 text-center">
            <div className="font-sans text-lg font-bold text-neon-orange neon-text-orange mb-1">
              {skippedCount > 0 ? 'WORKOUT COMPLETE' : 'ALL DONE'}
            </div>
            <div className="font-mono text-xs text-muted-foreground">
              {workout?.name} · {displayDate}
              {skippedCount > 0 && ` · ${skippedCount} skipped`}
            </div>
          </div>
        )}

        {/* Global reminder notes */}
        <div className="mt-8 bg-card/20 border border-border/40 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings2 className="w-3 h-3 text-neon-orange/60" />
            <span className="font-mono text-xs text-neon-orange/70 uppercase tracking-wider">
              Reminders
            </span>
          </div>
          <ul className="space-y-1.5">
            {program.globalNotes.slice(0, 4).map((note, i) => (
              <li key={i} className="font-mono text-xs text-muted-foreground/70 flex gap-2">
                <span className="text-neon-orange/30 shrink-0">›</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Sticky bottom bar: prev | (finish if all done, else mark done) | next */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 border-t border-border backdrop-blur-sm">
        <div className="max-w-2xl mx-auto p-4 flex items-center gap-3">
          <button
            onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
            data-haptic="selection"
            disabled={currentStep === 0}
            className={cn(
              'h-12 w-12 shrink-0 rounded-lg border flex items-center justify-center transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-orange/50',
              currentStep === 0
                ? 'border-border text-muted-foreground/30 cursor-not-allowed'
                : 'border-border text-muted-foreground hover:text-neon-orange hover:border-neon-orange/50',
            )}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {allAddressed ? (
            <button
              onClick={onFinish}
              data-haptic="success"
              className="flex-1 min-h-[48px] rounded-lg bg-neon-orange text-primary-foreground font-mono text-sm font-bold tracking-widest uppercase hover:opacity-90 active:opacity-75 transition-opacity neon-border-orange"
            >
              FINISH WORKOUT
            </button>
          ) : isExerciseAddressed(currentLog) ? (
            <button
              onClick={() =>
                setCurrentStep(
                  exercises.findIndex((ex) => !isExerciseAddressed(dayLog.exercises[ex.name])),
                )
              }
              data-haptic="selection"
              className="flex-1 min-h-[48px] rounded-lg border border-neon-orange/30 font-mono text-sm text-neon-orange tracking-widest uppercase hover:bg-neon-orange/10 transition-colors"
            >
              NEXT PENDING →
            </button>
          ) : (
            <div className="flex-1 flex gap-2">
              <button
                onClick={handleSkip}
                data-haptic="warning"
                className="min-h-[48px] px-4 rounded-lg border border-border font-mono text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
              >
                SKIP
              </button>
              <button
                onClick={handleMarkDone}
                data-haptic="success"
                className="flex-1 min-h-[48px] rounded-lg bg-neon-orange text-primary-foreground font-mono text-sm font-bold tracking-widest uppercase hover:opacity-90 active:opacity-75 transition-opacity neon-border-orange"
              >
                MARK DONE →
              </button>
            </div>
          )}

          <button
            onClick={() => setCurrentStep((s) => Math.min(exercises.length - 1, s + 1))}
            data-haptic="selection"
            disabled={currentStep === exercises.length - 1}
            className={cn(
              'h-12 w-12 shrink-0 rounded-lg border flex items-center justify-center transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-orange/50',
              currentStep === exercises.length - 1
                ? 'border-border text-muted-foreground/30 cursor-not-allowed'
                : 'border-border text-muted-foreground hover:text-neon-orange hover:border-neon-orange/50',
            )}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
