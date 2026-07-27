import { useEffect, useState } from 'react'
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns'
import { BookOpen, Calendar, ChevronRight, Footprints, Ruler, Sparkles, TrendingUp } from 'lucide-react'
import {
  getProgramWorkoutKeys,
  getScheduleHint,
  getScheduleSectionLabel,
  getWorkoutLabel,
  getWorkoutTextColorClass,
  REST_DAY_KEY,
  type ProgramWorkoutKey,
} from '@/lib/program'
import { useActiveProgram } from '@/hooks/use-active-program'
import { CyberGrid } from '@/components/cyber-grid'
import { CyberHeader } from '@/components/cyber-header'
import { getLatestMetricValue, getLatestMetrics } from '@/components/metrics/metrics-tracker'
import { readGymLog } from '@/lib/sync/storage'
import { TRAINING_LOG_EVENT } from '@/lib/sync/events'
import {
  formatPlanSummary,
  formatRunSummary,
  formatTimer,
  getCurrentWeekRuns,
  getLastRun,
  hasResumableRunSession,
  PHASE_LABELS,
  PHASE_ORDER,
  readActiveRunSession,
  readRunLog,
  type RunSessionLog,
} from '@/lib/running'
import { RunSessionDetails } from '@/components/running/run-session-details'
import type { DayLog, GymStore } from '@/components/gym/gym-tracker'
import {
  getCurrentWeekEntries,
  getDayStatus,
  getIncompleteWorkoutEntry,
  getLastWorkoutEntry,
  isExerciseAddressed,
} from '@/components/gym/gym-tracker'
import {
  formatDayLogSummary,
  WorkoutSessionDetails,
} from '@/components/gym/workout-session-details'
import { cn } from '@/lib/utils'

interface HomePageProps {
  onStartTraining: () => void
  onExploreWorkout: (workoutKey?: string) => void
  onContinueWorkout: (date: string) => void
  onStartRunning: () => void
  onContinueRun: () => void
  onOpenMetrics: () => void
  onOpenSettings: () => void
  onCreateWithAi?: () => void
  onEditWithAi?: () => void
}

function getTrainingStats(store: GymStore) {
  const dates = Object.keys(store)
  const completed = dates.filter((date) => {
    const log = store[date]
    if (!log) return false
    if (log.workoutKey === REST_DAY_KEY) return true
    const exercises = Object.values(log.exercises)
    return exercises.length > 0 && exercises.every((e) => isExerciseAddressed(e))
  })
  return { sessions: dates.length, completed: completed.length }
}

const WEEK_STATUS_STYLES = {
  complete: 'bg-neon-orange/20 text-neon-orange',
  partial: 'bg-neon-yellow/10 text-neon-yellow',
  rest: 'bg-muted text-muted-foreground',
  empty: 'bg-muted/50 text-muted-foreground',
} as const

const WEEK_STATUS_LABELS = {
  complete: 'Complete',
  partial: 'In progress',
  rest: 'Rest',
  empty: 'Empty',
} as const

function WeekRunRow({ run }: { run: RunSessionLog }) {
  const displayDate = format(parseISO(`${run.date}T12:00:00`), 'EEE, MMM d')

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
      <span className="font-mono text-xs text-muted-foreground w-[88px] shrink-0">{displayDate}</span>
      <span className="font-sans text-sm text-foreground flex-1 min-w-0 truncate">
        {formatRunSummary(run)}
      </span>
      <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded shrink-0 bg-neon-yellow/10 text-neon-yellow">
        Run
      </span>
    </div>
  )
}

type WeekActivity =
  | { kind: 'gym'; date: string; log: DayLog; sortKey: number }
  | { kind: 'run'; run: RunSessionLog; sortKey: number }

function getCurrentWeekActivities(store: GymStore, runs: RunSessionLog[]): WeekActivity[] {
  const gym = getCurrentWeekEntries(store).map(({ date, log }) => ({
    kind: 'gym' as const,
    date,
    log,
    sortKey: parseISO(`${date}T12:00:00`).getTime(),
  }))
  const runActivities = getCurrentWeekRuns(runs).map((run) => ({
    kind: 'run' as const,
    run,
    sortKey: run.completedAt,
  }))

  return [...gym, ...runActivities].sort((a, b) => {
    const dateA = a.kind === 'gym' ? a.date : a.run.date
    const dateB = b.kind === 'gym' ? b.date : b.run.date
    const dateCmp = dateA.localeCompare(dateB)
    if (dateCmp !== 0) return dateCmp
    return a.sortKey - b.sortKey
  })
}

function WeekWorkoutRow({ date, log }: { date: string; log: DayLog }) {
  const status = getDayStatus(log)
  const displayDate = format(parseISO(`${date}T12:00:00`), 'EEE, MMM d')

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
      <span className="font-mono text-xs text-muted-foreground w-[88px] shrink-0">{displayDate}</span>
      <span className="font-sans text-sm text-foreground flex-1 min-w-0 truncate">
        {formatDayLogSummary(log)}
      </span>
      <span
        className={cn(
          'font-mono text-[10px] uppercase px-2 py-0.5 rounded shrink-0',
          WEEK_STATUS_STYLES[status],
        )}
      >
        {WEEK_STATUS_LABELS[status]}
      </span>
    </div>
  )
}

export function HomePage({
  onStartTraining,
  onExploreWorkout,
  onContinueWorkout,
  onStartRunning,
  onContinueRun,
  onOpenMetrics,
  onOpenSettings,
  onCreateWithAi,
  onEditWithAi,
}: HomePageProps) {
  const { program } = useActiveProgram()
  const [store, setStore] = useState<GymStore>({})
  const [runs, setRuns] = useState<RunSessionLog[]>([])
  const [activeRun, setActiveRun] = useState<ReturnType<typeof readActiveRunSession>>(null)
  const [stats, setStats] = useState({ sessions: 0, completed: 0, runs: 0 })
  const [latestWeight, setLatestWeight] = useState<string>()
  const [latestWaist, setLatestWaist] = useState<string>()

  useEffect(() => {
    const refresh = () => {
      const gymLog = readGymLog()
      const runLog = readRunLog()
      setStore(gymLog)
      setRuns(runLog)
      setActiveRun(hasResumableRunSession() ? readActiveRunSession() : null)
      setStats({ ...getTrainingStats(gymLog), runs: runLog.length })

      const metrics = getLatestMetrics()
      setLatestWeight(getLatestMetricValue(metrics, 'weight'))
      setLatestWaist(getLatestMetricValue(metrics, 'waist'))
    }

    refresh()
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener(TRAINING_LOG_EVENT, refresh)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener(TRAINING_LOG_EVENT, refresh)
    }
  }, [])

  const todayLabel = format(new Date(), 'EEEE, MMMM d')
  const scheduleEntries = Object.entries(program.schedule)

  const incompleteWorkout = getIncompleteWorkoutEntry(store)
  const lastWorkout = getLastWorkoutEntry(store)
  const lastRun = getLastRun(runs)
  const weekActivities = getCurrentWeekActivities(store, runs)
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })
  const weekLabel = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`
  const weekGymCompleted = weekActivities.filter(
    (a) => a.kind === 'gym' && getDayStatus(a.log) === 'complete',
  ).length
  const weekRest = weekActivities.filter(
    (a) => a.kind === 'gym' && getDayStatus(a.log) === 'rest',
  ).length
  const weekRuns = weekActivities.filter((a) => a.kind === 'run').length
  const hasStats =
    stats.sessions > 0 || stats.completed > 0 || stats.runs > 0 || latestWeight || latestWaist

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <CyberGrid />
      <CyberHeader
        onTrainingClick={onStartTraining}
        onRunningClick={onStartRunning}
        onMetricsClick={onOpenMetrics}
        onSettingsClick={onOpenSettings}
      />

      <main className="relative z-10 pt-24 pb-20 home-page-content">
        <section className="max-w-3xl mx-auto px-4 py-6 md:py-8">
          {/* 1. Today + primary actions */}
          <div className="mb-8">
            <p className="font-mono text-xs text-muted-foreground mb-1">{todayLabel}</p>
            <h1 className="font-sans text-xl font-bold text-foreground tracking-wide mb-4">
              {program.name}
            </h1>

            {(onCreateWithAi || onEditWithAi) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {onEditWithAi && (
                  <button
                    type="button"
                    onClick={onEditWithAi}
                    data-haptic="selection"
                    className="min-h-[36px] px-3 rounded-lg border border-border font-mono text-[11px] tracking-wider uppercase text-muted-foreground hover:text-neon-orange hover:border-neon-orange/40 transition-colors inline-flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Edit with AI
                  </button>
                )}
                {onCreateWithAi && (
                  <button
                    type="button"
                    onClick={onCreateWithAi}
                    data-haptic="selection"
                    className="min-h-[36px] px-3 rounded-lg border border-border font-mono text-[11px] tracking-wider uppercase text-muted-foreground hover:text-neon-orange hover:border-neon-orange/40 transition-colors inline-flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Create with AI
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              {incompleteWorkout ? (
                <button
                  onClick={() => onContinueWorkout(incompleteWorkout.date)}
                  data-haptic="success"
                  className="flex-1 min-h-[48px] px-6 rounded-lg font-mono text-sm font-bold tracking-widest uppercase bg-neon-orange text-primary-foreground hover:opacity-90 active:opacity-75 transition-opacity neon-border-orange flex items-center justify-center gap-2"
                >
                  Continue {getWorkoutLabel(incompleteWorkout.log.workoutKey)}
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={onStartTraining}
                  data-haptic="success"
                  className="flex-1 min-h-[48px] px-6 rounded-lg font-mono text-sm font-bold tracking-widest uppercase bg-neon-orange text-primary-foreground hover:opacity-90 active:opacity-75 transition-opacity neon-border-orange flex items-center justify-center gap-2"
                >
                  Start training
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              {activeRun ? (
                <button
                  onClick={onContinueRun}
                  data-haptic="success"
                  className="flex-1 min-h-[48px] px-6 rounded-lg font-mono text-sm font-bold tracking-widest uppercase bg-neon-yellow text-primary-foreground hover:opacity-90 active:opacity-75 transition-opacity flex items-center justify-center gap-2"
                >
                  <Footprints className="w-4 h-4" />
                  Continue run
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={onStartRunning}
                  data-haptic="selection"
                  className="flex-1 min-h-[48px] px-6 rounded-lg font-mono text-sm font-bold tracking-widest uppercase border border-neon-orange/50 text-neon-orange hover:bg-neon-orange/10 transition-colors flex items-center justify-center gap-2"
                >
                  <Footprints className="w-4 h-4" />
                  Start run
                </button>
              )}
              <button
                onClick={onOpenMetrics}
                data-haptic="selection"
                className="min-h-[48px] px-6 rounded-lg font-mono text-sm tracking-widest uppercase border border-border text-muted-foreground hover:text-neon-orange hover:border-neon-orange/50 transition-colors flex items-center justify-center gap-2"
              >
                <Ruler className="w-4 h-4" />
                Metrics
              </button>
            </div>

            {incompleteWorkout && (
              <p className="font-mono text-xs text-muted-foreground mt-3">
                {getWorkoutLabel(incompleteWorkout.log.workoutKey)} from{' '}
                {format(parseISO(`${incompleteWorkout.date}T12:00:00`), 'EEE, MMM d')} — unfinished
              </p>
            )}
            {activeRun && (
              <p className="font-mono text-xs text-muted-foreground mt-3">
                {formatPlanSummary(activeRun.plan)} ·{' '}
                {PHASE_LABELS[PHASE_ORDER[activeRun.phaseIndex] ?? 'warmup']}
                {activeRun.running
                  ? ' — in progress'
                  : ` · ${formatTimer(activeRun.remainingSeconds)} remaining · paused`}
              </p>
            )}
          </div>

          {/* 2. This week */}
          <section className="mb-10">
            <SectionDivider label="THIS WEEK" />
            <div className="home-surface border border-border rounded-lg p-4 md:p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 text-neon-orange mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="font-sans text-sm font-bold text-foreground">{weekLabel}</span>
                  </div>
                  {weekActivities.length === 0 && (
                    <p className="font-mono text-xs text-muted-foreground">
                      No training logged yet this week.
                    </p>
                  )}
                </div>
                {weekActivities.length > 0 && (
                  <div className="text-right shrink-0">
                    <div className="font-sans text-lg font-bold text-neon-orange">
                      {weekGymCompleted}
                      {weekRest > 0 && (
                        <span className="text-sm font-normal text-muted-foreground">
                          {' '}
                          + {weekRest} rest
                        </span>
                      )}
                      {weekRuns > 0 && (
                        <span className="text-sm font-normal text-neon-yellow">
                          {' '}
                          · {weekRuns} run{weekRuns !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground uppercase">
                      logged
                    </div>
                  </div>
                )}
              </div>

              {weekActivities.length > 0 && (
                <div className="mb-4">
                  {weekActivities.map((activity) =>
                    activity.kind === 'gym' ? (
                      <WeekWorkoutRow key={`gym-${activity.date}`} date={activity.date} log={activity.log} />
                    ) : (
                      <WeekRunRow key={activity.run.id} run={activity.run} />
                    ),
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={onStartTraining}
                data-haptic="selection"
                className="w-full min-h-[40px] rounded-lg border border-border font-mono text-xs tracking-widest uppercase text-muted-foreground hover:text-neon-orange hover:border-neon-orange/40 transition-colors"
              >
                Open training log
              </button>
            </div>
          </section>

          {/* 3. Last workout / run */}
          {lastWorkout && (
            <section className="mb-10">
              <SectionDivider label="LAST WORKOUT" />
              <div className="-mx-4 home-page-panel">
                <WorkoutSessionDetails
                  date={lastWorkout.date}
                  log={lastWorkout.log}
                  onOpenWorkout={() => onContinueWorkout(lastWorkout.date)}
                />
              </div>
            </section>
          )}

          {lastRun && (
            <section className="mb-10">
              <SectionDivider label="LAST RUN" />
              <div className="-mx-4 home-page-panel px-4">
                <RunSessionDetails run={lastRun} showDate />
              </div>
            </section>
          )}

          {/* 4. Stats */}
          {hasStats && (
            <section className="mb-10">
              <SectionDivider label="STATS" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {stats.sessions > 0 && (
                  <div className="home-surface border border-border rounded-lg p-4 text-center">
                    <div className="font-sans text-2xl font-bold text-neon-orange">{stats.sessions}</div>
                    <div className="font-mono text-xs text-muted-foreground mt-1">Sessions</div>
                  </div>
                )}
                {stats.completed > 0 && (
                  <div className="home-surface border border-border rounded-lg p-4 text-center">
                    <div className="font-sans text-2xl font-bold text-neon-yellow">{stats.completed}</div>
                    <div className="font-mono text-xs text-muted-foreground mt-1">Completed</div>
                  </div>
                )}
                {stats.runs > 0 && (
                  <div className="home-surface border border-border rounded-lg p-4 text-center">
                    <div className="font-sans text-2xl font-bold text-neon-yellow">{stats.runs}</div>
                    <div className="font-mono text-xs text-muted-foreground mt-1">Runs</div>
                  </div>
                )}
                {latestWeight && (
                  <div className="home-surface border border-border rounded-lg p-4 text-center">
                    <div className="font-sans text-2xl font-bold text-foreground">
                      {latestWeight}
                      <span className="text-sm font-normal text-muted-foreground ml-1">kg</span>
                    </div>
                    <div className="font-mono text-xs text-muted-foreground mt-1">Weight</div>
                  </div>
                )}
                {latestWaist && (
                  <div className="home-surface border border-border rounded-lg p-4 text-center">
                    <div className="font-sans text-2xl font-bold text-foreground">
                      {latestWaist}
                      <span className="text-sm font-normal text-muted-foreground ml-1">cm</span>
                    </div>
                    <div className="font-mono text-xs text-muted-foreground mt-1">Waist</div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 5. Program reference */}
          <section id="program" className="mb-10">
            <SectionDivider label="PROGRAM GOALS" />
            <div className="grid sm:grid-cols-2 gap-3">
              {program.goal.map((goal, index) => (
                <div
                  key={goal}
                  className="flex items-start gap-3 home-surface border border-border rounded-lg p-4"
                >
                  <span className="font-mono text-xs text-neon-orange shrink-0 pt-0.5">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="font-sans text-sm text-foreground">{goal}</span>
                </div>
              ))}
            </div>
          </section>

          <section id="schedule" className="mb-10">
            <SectionDivider label="WEEKLY SCHEDULE" />
            <div className="home-surface border border-border rounded-lg p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4 text-neon-orange">
                <Calendar className="w-4 h-4" />
                <span className="font-mono text-xs uppercase tracking-wider">{getScheduleSectionLabel()}</span>
              </div>
              <div className="space-y-3">
                {scheduleEntries.map(([day, label], index) => (
                  <div
                    key={day}
                    className="flex items-center gap-4 py-2 border-b border-border/50 last:border-0"
                  >
                    <span className="font-mono text-xs text-neon-orange w-8 shrink-0">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground uppercase w-12 shrink-0">
                      {day.replace('day', 'Day ')}
                    </span>
                    <span className="font-sans text-sm text-foreground">{label as string}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mb-10">
            <SectionDivider label="EXPLORE WORKOUT" />
            <div className="home-surface border border-border rounded-lg p-4 md:p-5 mb-4">
              <div className="flex items-center gap-2 text-neon-orange mb-2">
                <BookOpen className="w-4 h-4" />
                <span className="font-sans text-sm font-bold text-foreground">Preview your program</span>
              </div>
              <p className="font-mono text-xs text-muted-foreground leading-relaxed mb-4">
                View exercises, sets, reps, and coaching notes from {program.name} without
                starting a session.
              </p>
              <button
                type="button"
                onClick={() => onExploreWorkout()}
                data-haptic="selection"
                className="w-full min-h-[44px] rounded-lg border border-neon-orange/40 font-mono text-xs font-bold tracking-widest uppercase text-neon-orange hover:bg-neon-orange/10 transition-colors flex items-center justify-center gap-2"
              >
                Browse all workouts
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {getProgramWorkoutKeys().map((key: ProgramWorkoutKey) => {
                const workout = program.workouts[key]
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onExploreWorkout(key)}
                    data-haptic="selection"
                    className="home-surface-muted border border-border rounded-lg p-4 hover:border-neon-orange/40 transition-colors text-left"
                  >
                    <div
                      className={cn(
                        'font-sans text-sm font-bold tracking-wider uppercase mb-1',
                        getWorkoutTextColorClass(key),
                      )}
                    >
                      {workout.name}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground line-clamp-2">
                      {getScheduleHint(key)}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground/70 mt-1">
                      {workout.exercises.length} exercises
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <section id="progression" className="mb-6">
            <SectionDivider label="PROGRESSION" />
            <div className="home-surface border border-border rounded-lg p-5 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-neon-yellow" />
                <span className="font-sans text-sm font-bold text-foreground">
                  {program.progression.method}
                </span>
              </div>
              <p className="font-mono text-xs text-muted-foreground leading-relaxed mb-4">
                Hit the top of the rep range on all sets, then increase weight by the
                smallest increment. Track every session to see progress clearly.
              </p>
              <div className="bg-background/50 border border-border/60 rounded-md p-3 font-mono text-xs text-muted-foreground space-y-1">
                <div>
                  <span className="text-neon-orange">{program.progression.example.exercise}</span>
                  {' — '}
                  {program.progression.example.nextStep}
                </div>
                <div className="text-muted-foreground/70">
                  W1 → W2 → W3: add reps, then add weight
                </div>
              </div>
            </div>
          </section>
        </section>
      </main>
    </div>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 mb-4">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neon-orange/50 to-transparent" />
      <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground shrink-0">
        [{label}]
      </h2>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neon-orange/50 to-transparent" />
    </div>
  )
}
