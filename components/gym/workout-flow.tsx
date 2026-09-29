import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sound } from '@/lib/sounds'
import { usePreventPullToRefresh } from '@/hooks/use-prevent-pull-to-refresh'
import { useRestTimer } from '@/hooks/use-rest-timer'
import { useSettings } from '@/hooks/use-settings'
import { ExerciseStopwatch, RestTimerBar } from './exercise-stopwatch'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel'
import { getProgramWorkout, isProgramWorkoutKey, program, type ProgramWorkoutKey } from '@/lib/program'
import type { ExerciseVideoStore } from '@/lib/exercise-videos'
import type { DayLog, GymStore, SetLog } from './gym-tracker'
import { getLastExerciseRecord, isExerciseAddressed } from './gym-tracker'
import { ExerciseStep } from './exercise-step'

interface WorkoutFlowProps {
  date: string
  workoutKey: ProgramWorkoutKey
  dayLog: DayLog
  store: GymStore
  exerciseVideos: ExerciseVideoStore
  onUpdateStore: (store: GymStore) => void
  onBack: () => void
  onFinish: () => void
}

/** Fraction of slide width required to change exercise on swipe (Embla default ≈ 0.2). */
const EXERCISE_SWIPE_COMMIT_RATIO = 0.2

/** Embla scroll physics — higher duration / friction = slower snap (recommended duration 20–60). */
const CAROUSEL_SCROLL_DURATION = 58
const CAROUSEL_DRAG_FRICTION = 0.78

function applyCarouselSnapPhysics(api: CarouselApi | undefined) {
  if (!api) return
  api.internalEngine().scrollBody
    .useFriction(CAROUSEL_DRAG_FRICTION)
    .useDuration(CAROUSEL_SCROLL_DURATION)
}

export function WorkoutFlow({
  date,
  workoutKey,
  dayLog,
  store,
  exerciseVideos,
  onUpdateStore,
  onBack,
  onFinish,
}: WorkoutFlowProps) {
  const { settings } = useSettings()
  const restTimer = useRestTimer(date)
  const workout = isProgramWorkoutKey(workoutKey) ? getProgramWorkout(workoutKey) : undefined
  const exercises = workout?.exercises ?? []

  const [currentStep, setCurrentStep] = useState<number>(() => {
    const firstPending = exercises.findIndex(
      (ex) => !isExerciseAddressed(dayLog.exercises[ex.name]),
    )
    return firstPending === -1 ? 0 : firstPending
  })

  // Options must stay referentially stable. A new object each render makes Embla
  // reInit and can leave the header on a different exercise than the slide.
  const initialStepRef = useRef(currentStep)
  const pendingStepRef = useRef<number | null>(null)

  const progressStripRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()

  const carouselOpts = useMemo(
    () => ({
      duration: CAROUSEL_SCROLL_DURATION,
      dragFree: false,
      startIndex: initialStepRef.current,
    }),
    [],
  )

  usePreventPullToRefresh(scrollRef, currentStep)

  const exerciseChangeMounted = useRef(false)
  useEffect(() => {
    if (!exerciseChangeMounted.current) {
      exerciseChangeMounted.current = true
      return
    }
    Sound.play('exerciseChange')
  }, [currentStep])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [currentStep])

  useEffect(() => {
    if (!carouselApi) return

    const syncFromCarousel = () => {
      const index = carouselApi.selectedScrollSnap()
      setCurrentStep((prev) => (prev === index ? prev : index))
    }

    const onInit = () => applyCarouselSnapPhysics(carouselApi)
    const onPointerDown = () => applyCarouselSnapPhysics(carouselApi)

    carouselApi.on('init', onInit)
    carouselApi.on('reInit', onInit)
    carouselApi.on('pointerDown', onPointerDown)
    carouselApi.on('select', syncFromCarousel)
    carouselApi.on('settle', syncFromCarousel)
    onInit()

    const pending = pendingStepRef.current
    if (pending != null) {
      pendingStepRef.current = null
      if (carouselApi.selectedScrollSnap() !== pending) {
        carouselApi.scrollTo(pending)
      } else {
        syncFromCarousel()
      }
    } else {
      syncFromCarousel()
    }

    return () => {
      carouselApi.off('init', onInit)
      carouselApi.off('reInit', onInit)
      carouselApi.off('pointerDown', onPointerDown)
      carouselApi.off('select', syncFromCarousel)
      carouselApi.off('settle', syncFromCarousel)
    }
  }, [carouselApi])

  useEffect(() => {
    if (!carouselApi) return

    let startIndex = 0
    let maxProgressDelta = 0
    let isDragging = false

    const snapCount = () => carouselApi.scrollSnapList().length

    const progressForIndex = (index: number) => {
      const n = snapCount()
      return n <= 1 ? 0 : index / (n - 1)
    }

    const onPointerDown = () => {
      isDragging = true
      startIndex = carouselApi.selectedScrollSnap()
      maxProgressDelta = 0
    }

    const onScroll = () => {
      if (!isDragging) return
      const startProgress = progressForIndex(startIndex)
      maxProgressDelta = Math.max(
        maxProgressDelta,
        Math.abs(carouselApi.scrollProgress() - startProgress),
      )
    }

    const onPointerUp = () => {
      isDragging = false
      requestAnimationFrame(() => {
        const newIndex = carouselApi.selectedScrollSnap()
        if (newIndex === startIndex) return

        const slidesMoved = maxProgressDelta * Math.max(snapCount() - 1, 1)
        if (slidesMoved < EXERCISE_SWIPE_COMMIT_RATIO) {
          carouselApi.scrollTo(startIndex)
        }
      })
    }

    carouselApi.on('pointerDown', onPointerDown)
    carouselApi.on('scroll', onScroll)
    carouselApi.on('pointerUp', onPointerUp)

    return () => {
      carouselApi.off('pointerDown', onPointerDown)
      carouselApi.off('scroll', onScroll)
      carouselApi.off('pointerUp', onPointerUp)
    }
  }, [carouselApi])

  const goToStep = useCallback(
    (index: number) => {
      const last = Math.max(exercises.length - 1, 0)
      const clamped = Math.max(0, Math.min(index, last))
      if (!carouselApi) {
        pendingStepRef.current = clamped
        setCurrentStep(clamped)
        return
      }
      if (carouselApi.selectedScrollSnap() === clamped) {
        setCurrentStep((prev) => (prev === clamped ? prev : clamped))
        return
      }
      carouselApi.scrollTo(clamped)
    },
    [carouselApi, exercises.length],
  )

  const goPrev = useCallback(() => {
    carouselApi?.scrollPrev()
  }, [carouselApi])

  const goNext = useCallback(() => {
    carouselApi?.scrollNext()
  }, [carouselApi])

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
    goToStep(nextPending !== -1 ? nextPending : anyPending !== -1 ? anyPending : fromStep)
  }

  const handleMarkDoneAt = (stepIndex: number) => {
    const exercise = exercises[stepIndex]
    if (!exercise) return
    updateExerciseLog(exercise.name, { completed: true, skipped: false })
    advanceToNextPending(stepIndex)
  }

  const handleSkipAt = (stepIndex: number) => {
    const exercise = exercises[stepIndex]
    if (!exercise) return
    updateExerciseLog(exercise.name, { completed: false, skipped: true })
    advanceToNextPending(stepIndex)
  }

  const handleMarkUndoneAt = (stepIndex: number) => {
    const exercise = exercises[stepIndex]
    if (!exercise) return
    updateExerciseLog(exercise.name, { completed: false, skipped: false })
  }

  const handleMarkDone = () => handleMarkDoneAt(currentStep)
  const handleSkip = () => handleSkipAt(currentStep)
  const handleMarkUndone = () => handleMarkUndoneAt(currentStep)

  const currentExercise = exercises[currentStep]
  const currentLog = currentExercise ? dayLog.exercises[currentExercise.name] : undefined
  const timerOnOtherExercise =
    restTimer.isPending &&
    restTimer.exerciseName != null &&
    restTimer.exerciseName !== currentExercise?.name

  // Every exercise keeps its own timer controls; picking a preset takes over the
  // single shared countdown, so a stale timer never blocks starting a fresh one.
  const renderRestTimer = (exerciseName: string, isActive: boolean) => {
    if (!isActive) return null
    const ownsTimer = restTimer.exerciseName === exerciseName
    return (
      <ExerciseStopwatch
        open={restTimer.openExerciseName === exerciseName}
        onOpenChange={(next) => restTimer.setOpenFor(exerciseName, next)}
        duration={ownsTimer ? restTimer.duration : 0}
        remaining={ownsTimer ? restTimer.remaining : 0}
        running={ownsTimer ? restTimer.running : false}
        finished={ownsTimer ? restTimer.finished : false}
        timerActive={ownsTimer ? restTimer.timerActive : false}
        onSelectPreset={(seconds) => restTimer.selectPreset(exerciseName, seconds)}
        onToggleRun={restTimer.toggleRun}
        onReset={restTimer.reset}
      />
    )
  }

  const goToTimerExercise = useCallback(() => {
    const owner = restTimer.exerciseName
    if (!owner) return
    const index = exercises.findIndex((ex) => ex.name === owner)
    if (index === -1) return
    restTimer.setOpenFor(owner, true)
    goToStep(index)
  }, [exercises, restTimer, goToStep])

  const handleAutoStartRestTimer = useCallback(
    (exerciseName: string) => {
      const seconds = settings.restTimerMinutes * 60
      if (seconds > 0) {
        restTimer.beginCountdown(exerciseName, seconds)
      }
    },
    [restTimer, settings.restTimerMinutes],
  )

  return (
    <div className="h-[calc(100dvh-57px)] flex flex-col min-h-0 overscroll-none">
      {/* Workout header row */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-2">
        <button
          onClick={onBack}
          data-haptic="light"
          title="Leave this session and pick a different workout"
          aria-label="Change workout"
          className="shrink-0 flex items-center gap-1 text-muted-foreground hover:text-neon-orange transition-colors min-h-[44px]"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="font-mono text-[10px] leading-tight text-left">
            Change
            <br />
            workout
          </span>
        </button>
        <div className="flex-1 text-center min-w-0">
          <div className="font-sans text-xs font-bold tracking-widest uppercase text-foreground truncate">
            {workout?.name}
          </div>
          <div className="font-mono text-xs text-muted-foreground">{displayDate}</div>
        </div>
        <div
          className="shrink-0 text-right leading-tight"
          data-current-step={currentStep}
          data-exercise-name={currentExercise?.name ?? ''}
          aria-live="polite"
        >
          <div className="font-mono text-[11px] text-foreground">
            Exercise {currentStep + 1} of {exercises.length}
          </div>
          <div className="font-mono text-[10px] text-muted-foreground">
            {completedCount} completed
            {skippedCount > 0 ? ` · ${skippedCount} skipped` : ''}
          </div>
        </div>
      </div>

      {/* Jump dots share currentStep with the header. Arrows below move one exercise. */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
            Jump
          </span>
          <div
            ref={progressStripRef}
            role="group"
            aria-label="Jump to any exercise"
            className="flex flex-1 items-center gap-0 overflow-x-auto scrollbar-none py-0"
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
                  type="button"
                  onClick={() => goToStep(i)}
                  data-haptic="selection"
                  data-step={i}
                  data-current={isCurrent ? 'true' : 'false'}
                  title={`${i + 1}. ${ex.name}`}
                  aria-label={`Jump to exercise ${i + 1} of ${exercises.length}: ${ex.name}`}
                  aria-current={isCurrent ? 'true' : undefined}
                  className={cn(
                    'group shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-orange/50',
                  )}
                >
                  <span
                    className={cn(
                      'rounded-full transition-all pointer-events-none',
                      isCurrent
                        ? 'h-3 w-6 bg-neon-orange animate-pulse'
                        : done
                          ? 'h-3 w-3 bg-neon-orange/80'
                          : skipped
                            ? 'h-3 w-3 bg-muted-foreground/40 ring-1 ring-muted-foreground/60'
                            : 'h-3 w-3 bg-border group-hover:bg-muted-foreground/50',
                    )}
                  />
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Exercise step — swipe between slides; scroll vertically inside each slide */}
      <div className="flex-1 min-h-0">
        <Carousel
          key={`${date}-${workoutKey}`}
          setApi={setCarouselApi}
          opts={carouselOpts}
          className="h-full w-full [&_[data-slot=carousel-content]]:h-full [&_[data-slot=carousel-content]>div]:h-full"
        >
          <CarouselContent className="-ml-0 h-full">
            {exercises.map((exercise, i) => {
              const log = dayLog.exercises[exercise.name]
              const isActive = i === currentStep

              return (
                <CarouselItem
                  key={exercise.name}
                  data-step={i}
                  className="pl-0 basis-full h-full min-h-0"
                >
                  <div
                    ref={isActive ? scrollRef : undefined}
                    className="h-full min-h-0 overflow-y-auto overscroll-contain touch-pan-y pb-40"
                  >
                    <div className="px-4 py-2">
                      <ExerciseStep
                        exercise={exercise}
                        log={log}
                        userVideoUrl={exerciseVideos[exercise.name]}
                        lastRecord={getLastExerciseRecord(store, exercise.name, date)}
                        isActive={isActive}
                        restTimer={renderRestTimer(exercise.name, isActive)}
                        programReminders={program.globalNotes}
                        onAutoStartRestTimer={() => handleAutoStartRestTimer(exercise.name)}
                        onUpdateSets={(sets) => updateExerciseLog(exercise.name, { sets })}
                        onMarkDone={() => handleMarkDoneAt(i)}
                        onSkip={() => handleSkipAt(i)}
                        onMarkUndone={() => handleMarkUndoneAt(i)}
                      />
                    </div>

                    <div className="px-4">
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

                    </div>
                  </div>
                </CarouselItem>
              )
            })}
          </CarouselContent>
        </Carousel>
      </div>

      {/* Timer keeps running at workout level; tap to jump back to its exercise */}
      {timerOnOtherExercise && restTimer.exerciseName && (
        <div className="fixed bottom-[80px] left-0 right-0 z-20 px-4 pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <RestTimerBar
              exerciseName={restTimer.exerciseName}
              remaining={restTimer.remaining}
              running={restTimer.running}
              finished={restTimer.finished}
              onOpen={goToTimerExercise}
            />
          </div>
        </div>
      )}

      {/* Sticky bottom bar: prev | (finish if all done, else mark done) | next */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 border-t border-border backdrop-blur-sm">
        <div className="max-w-2xl mx-auto p-4 flex items-center gap-3">
          <button
            type="button"
            onClick={goPrev}
            data-haptic="selection"
            disabled={currentStep === 0}
            aria-label="Previous exercise"
            title="Previous exercise"
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

          {isExerciseAddressed(currentLog) ? (
            <div className="flex-1 flex gap-2">
              <button
                onClick={handleMarkUndone}
                data-haptic="selection"
                className="min-h-[48px] px-4 rounded-lg border border-neon-orange/30 font-mono text-xs tracking-widest uppercase text-neon-orange/70 hover:text-neon-orange hover:border-neon-orange/60 transition-colors"
              >
                UNDO
              </button>
              {allAddressed ? (
                <button
                  onClick={onFinish}
                  data-haptic="success"
                  className="flex-1 min-h-[48px] rounded-lg bg-neon-orange text-primary-foreground font-mono text-sm font-bold tracking-widest uppercase hover:opacity-90 active:opacity-75 transition-opacity neon-border-orange"
                >
                  FINISH WORKOUT
                </button>
              ) : (
                <button
                  onClick={() => {
                    const nextPending = exercises.findIndex(
                      (ex) => !isExerciseAddressed(dayLog.exercises[ex.name]),
                    )
                    if (nextPending !== -1) goToStep(nextPending)
                  }}
                  data-haptic="selection"
                  className="flex-1 min-h-[48px] rounded-lg border border-neon-orange/30 font-mono text-sm text-neon-orange tracking-widest uppercase hover:bg-neon-orange/10 transition-colors"
                >
                  NEXT PENDING →
                </button>
              )}
            </div>
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
            type="button"
            onClick={goNext}
            data-haptic="selection"
            disabled={currentStep === exercises.length - 1}
            aria-label="Next exercise"
            title="Next exercise"
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
