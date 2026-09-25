import { useEffect, useState } from 'react'
import {
  addWeeks,
  differenceInCalendarDays,
  endOfWeek,
  format,
  parseISO,
  startOfDay,
  startOfWeek,
  subDays,
} from 'date-fns'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpen,
  Calendar,
  ChevronRight,
  ClipboardList,
  Footprints,
  Minus,
  Ruler,
  TrendingUp,
} from 'lucide-react'
import {
  getProgramWorkoutKeys,
  getScheduleHint,
  getScheduleSectionLabel,
  getWorkoutLogLabel,
  getWorkoutTextColorClass,
  REST_DAY_KEY,
  type ProgramWorkoutKey,
} from '@/lib/program'
import { useActiveProgram } from '@/hooks/use-active-program'
import { useLoggedProgram } from '@/hooks/use-logged-program'
import { formatProgramVersionLabel } from '@/lib/program-version'
import { CyberGrid } from '@/components/cyber-grid'
import { CyberHeader } from '@/components/cyber-header'
import {
  getLatestMetrics,
  type MetricEntry,
  type MetricsStore,
} from '@/components/metrics/metrics-tracker'
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
  isExerciseAddressed,
} from '@/components/gym/gym-tracker'
import { formatDayLogSummary } from '@/components/gym/workout-session-details'
import { cn } from '@/lib/utils'

interface HomePageProps {
  onStartTraining: () => void
  onExploreWorkout: (workoutKey?: string) => void
  onContinueWorkout: (date: string) => void
  onStartRunning: () => void
  onContinueRun: () => void
  onOpenMetrics: () => void
  onOpenSettings: () => void
  onOpenAiChat?: () => void
}

function isGymSessionComplete(log: DayLog | undefined): boolean {
  if (!log) return false
  if (log.workoutKey === REST_DAY_KEY) return true
  const exercises = Object.values(log.exercises)
  return exercises.length > 0 && exercises.every((e) => isExerciseAddressed(e))
}

function dateInRange(date: string, start: Date, end: Date): boolean {
  const day = parseISO(`${date}T12:00:00`)
  return day >= start && day <= end
}

function getWeekRange(weekOffset: number) {
  const anchor = addWeeks(new Date(), weekOffset)
  return {
    start: startOfWeek(anchor, { weekStartsOn: 1 }),
    end: endOfWeek(anchor, { weekStartsOn: 1 }),
  }
}

type CountStat = { total: number; thisWeek: number; lastWeek: number }

function countStat(dates: string[]): CountStat {
  const thisWeek = getWeekRange(0)
  const lastWeek = getWeekRange(-1)
  return {
    total: dates.length,
    thisWeek: dates.filter((d) => dateInRange(d, thisWeek.start, thisWeek.end)).length,
    lastWeek: dates.filter((d) => dateInRange(d, lastWeek.start, lastWeek.end)).length,
  }
}

function getTrainingStats(store: GymStore, runs: RunSessionLog[]) {
  const dates = Object.keys(store)
  return {
    sessions: countStat(dates),
    completed: countStat(dates.filter((date) => isGymSessionComplete(store[date]))),
    runs: countStat(runs.map((run) => run.date)),
  }
}

type TrainingStats = ReturnType<typeof getTrainingStats>

type BodyMetricTrend = {
  value: number
  delta: number | null
  referenceLabel: string | null
}

/**
 * Compares the latest reading against the most recent one at least ~a month older,
 * falling back to the oldest earlier reading when history is shorter than that.
 */
function getBodyMetricTrend(store: MetricsStore, key: 'weight' | 'waist'): BodyMetricTrend | null {
  const readings = store
    .map((entry: MetricEntry) => ({ date: entry.date, value: parseFloat(entry[key] ?? '') }))
    .filter((r) => Number.isFinite(r.value))
    .sort((a, b) => b.date.localeCompare(a.date))

  const latest = readings[0]
  if (!latest) return null

  const latestDay = parseISO(`${latest.date}T12:00:00`)
  const earlier = readings.slice(1)
  const reference =
    earlier.find((r) => differenceInCalendarDays(latestDay, parseISO(`${r.date}T12:00:00`)) >= 28) ??
    earlier[earlier.length - 1]

  if (!reference) return { value: latest.value, delta: null, referenceLabel: null }

  return {
    value: latest.value,
    delta: latest.value - reference.value,
    referenceLabel: `vs ${format(parseISO(`${reference.date}T12:00:00`), 'MMM d')}`,
  }
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

type TrendDirection = 'up' | 'down' | 'flat'

function TrendIndicator({
  direction,
  text,
  tone = 'semantic',
  title,
}: {
  direction: TrendDirection
  text: string
  /** Body metrics use neutral tone because "up" isn't inherently good or bad. */
  tone?: 'semantic' | 'neutral'
  title?: string
}) {
  const Icon = direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : Minus
  const colorClass =
    tone === 'neutral' || direction === 'flat'
      ? 'text-muted-foreground'
      : direction === 'up'
        ? 'trend-up'
        : 'trend-down'

  return (
    <div
      className={cn('flex items-center justify-center gap-1 font-mono text-[10px] mt-2', colorClass)}
      title={title}
    >
      <Icon className="w-3 h-3 shrink-0" aria-hidden />
      <span>{text}</span>
    </div>
  )
}

function compareDirection(current: number, previous: number): TrendDirection {
  if (current > previous) return 'up'
  if (current < previous) return 'down'
  return 'flat'
}

function CountStatCard({
  label,
  stat,
  valueClassName,
}: {
  label: string
  stat: CountStat
  valueClassName: string
}) {
  return (
    <div className="home-surface border border-border rounded-lg p-4 text-center">
      <div className={cn('font-sans text-2xl font-bold', valueClassName)}>{stat.total}</div>
      <div className="font-mono text-xs text-muted-foreground mt-1">{label}</div>
      <TrendIndicator
        direction={compareDirection(stat.thisWeek, stat.lastWeek)}
        text={`${stat.thisWeek} this wk · ${stat.lastWeek} last`}
        title={`${stat.thisWeek} this week vs ${stat.lastWeek} last week`}
      />
    </div>
  )
}

function BodyStatCard({ label, unit, trend }: { label: string; unit: string; trend: BodyMetricTrend }) {
  return (
    <div className="home-surface border border-border rounded-lg p-4 text-center">
      <div className="font-sans text-2xl font-bold text-foreground">
        {formatNumber(trend.value)}
        <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
      </div>
      <div className="font-mono text-xs text-muted-foreground mt-1">{label}</div>
      {trend.delta !== null && trend.referenceLabel ? (
        <TrendIndicator
          tone="neutral"
          direction={trend.delta > 0 ? 'up' : trend.delta < 0 ? 'down' : 'flat'}
          text={`${Math.abs(trend.delta).toFixed(1)} ${unit} ${trend.referenceLabel}`}
        />
      ) : (
        <div className="font-mono text-[10px] text-muted-foreground/70 mt-2">First entry</div>
      )}
    </div>
  )
}

type GoalProgress = {
  metricLabel: string
  valueLabel: string
  ratio?: number
  trend?: { direction: TrendDirection; text: string }
}

function getPlannedPerWeek(schedule: Record<string, string>, matcher: (label: string) => boolean) {
  return Object.values(schedule).filter((label) => matcher(String(label))).length
}

function getGoalProgress(
  goal: string,
  context: {
    schedule: Record<string, string>
    stats: TrainingStats
    workoutsThisWeek: number
    completedLast4Weeks: number
    weight: BodyMetricTrend | null
    waist: BodyMetricTrend | null
  },
): GoalProgress {
  const text = goal.toLowerCase()
  const plannedGym = Math.max(
    1,
    getPlannedPerWeek(context.schedule, (label) => !/^\s*rest\b/i.test(label)),
  )

  if (/\b(run|running|cardio|endurance|aerobic)\b/.test(text)) {
    const explicit = text.match(/(\d+)\s*x/)
    const plannedRuns =
      (explicit ? parseInt(explicit[1]!, 10) : 0) ||
      getPlannedPerWeek(context.schedule, (label) => /\brun\b/i.test(label)) ||
      3
    const done = context.stats.runs.thisWeek
    return {
      metricLabel: 'Runs this week',
      valueLabel: `${done}/${plannedRuns}`,
      ratio: done / plannedRuns,
    }
  }

  if (/\b(fat|weight|lean|cut|waist)\b/.test(text)) {
    const body = context.waist?.delta != null ? { trend: context.waist, unit: 'cm', name: 'Waist' } :
      context.weight?.delta != null ? { trend: context.weight, unit: 'kg', name: 'Weight' } : null
    if (!body) {
      return { metricLabel: 'Waist / weight trend', valueLabel: 'Log metrics to track' }
    }
    const delta = body.trend.delta!
    return {
      metricLabel: `${body.name} trend`,
      valueLabel: `${Math.abs(delta).toFixed(1)} ${body.unit}`,
      trend: {
        direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
        text: body.trend.referenceLabel ?? '',
      },
    }
  }

  if (/\b(strength|strong|stronger|power)\b/.test(text)) {
    const target = plannedGym * 4
    return {
      metricLabel: 'Completed sessions · last 4 wks',
      valueLabel: `${context.completedLast4Weeks}/${target}`,
      ratio: context.completedLast4Weeks / target,
    }
  }

  const done = context.workoutsThisWeek
  return {
    metricLabel: 'Workouts completed this week',
    valueLabel: `${done}/${plannedGym}`,
    ratio: done / plannedGym,
  }
}

function GoalCard({ index, goal, progress }: { index: number; goal: string; progress: GoalProgress }) {
  const percent = progress.ratio !== undefined ? Math.round(Math.min(progress.ratio, 1) * 100) : null

  return (
    <div className="home-surface border border-border rounded-lg p-4">
      <div className="flex items-start gap-3">
        <span className="font-mono text-xs text-neon-orange shrink-0 pt-0.5">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="font-sans text-sm text-foreground flex-1 min-w-0">{goal}</span>
      </div>
      <div className="mt-3 pl-7">
        <div className="flex items-baseline justify-between gap-2 font-mono text-[11px]">
          <span className="text-muted-foreground">{progress.metricLabel}</span>
          <span className="text-foreground shrink-0 flex items-center gap-1">
            {progress.trend && (
              progress.trend.direction === 'up' ? (
                <ArrowUp className="w-3 h-3" aria-hidden />
              ) : progress.trend.direction === 'down' ? (
                <ArrowDown className="w-3 h-3" aria-hidden />
              ) : (
                <Minus className="w-3 h-3" aria-hidden />
              )
            )}
            {progress.valueLabel}
            {progress.trend?.text && (
              <span className="text-muted-foreground">{progress.trend.text}</span>
            )}
          </span>
        </div>
        {percent !== null && (
          <div
            className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-label={`${goal}: ${progress.metricLabel}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-500',
                percent >= 100 ? 'bg-[oklch(0.72_0.18_150)]' : 'bg-neon-orange',
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

const WEEK_STATUS_STYLES = {
  complete: 'status-pill-complete',
  partial: 'status-pill-progress',
  rest: 'status-pill-neutral',
  empty: 'status-pill-neutral',
} as const

const WEEK_STATUS_LABELS = {
  complete: 'Complete',
  partial: 'In progress',
  rest: 'Rest',
  empty: 'Empty',
} as const

const PILL_BASE = 'font-mono text-[10px] uppercase px-2 py-0.5 rounded border shrink-0'

function WeekRunRow({ run }: { run: RunSessionLog }) {
  const displayDate = format(parseISO(`${run.date}T12:00:00`), 'EEE, MMM d')

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs text-muted-foreground">{displayDate}</span>
          <span className={cn(PILL_BASE, 'status-pill-run')}>Run</span>
        </div>
        <p className="font-sans text-sm text-foreground break-words">{formatRunSummary(run)}</p>
      </div>
      <span className="w-4 shrink-0" aria-hidden />
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

function WeekWorkoutRow({
  date,
  log,
  onOpen,
}: {
  date: string
  log: DayLog
  onOpen: (date: string) => void
}) {
  const status = getDayStatus(log)
  const displayDate = format(parseISO(`${date}T12:00:00`), 'EEE, MMM d')
  const { program: resolvedProgram } = useLoggedProgram(log)

  return (
    <button
      type="button"
      onClick={() => onOpen(date)}
      data-haptic="selection"
      aria-label={`Open ${displayDate} session details`}
      className="group text-left flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0 hover:bg-neon-orange/5 -mx-2 px-2 w-[calc(100%+1rem)] rounded-md transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs text-muted-foreground">{displayDate}</span>
          <span className={cn(PILL_BASE, WEEK_STATUS_STYLES[status])}>{WEEK_STATUS_LABELS[status]}</span>
        </div>
        <p className="font-sans text-sm text-foreground break-words">
          {formatDayLogSummary(log, resolvedProgram)}
        </p>
      </div>
      <ChevronRight
        className="w-4 h-4 shrink-0 text-muted-foreground/60 group-hover:text-neon-orange group-hover:translate-x-0.5 transition-all"
        aria-hidden
      />
    </button>
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
  onOpenAiChat,
}: HomePageProps) {
  const { program } = useActiveProgram()
  const [store, setStore] = useState<GymStore>({})
  const [runs, setRuns] = useState<RunSessionLog[]>([])
  const [activeRun, setActiveRun] = useState<ReturnType<typeof readActiveRunSession>>(null)
  const [stats, setStats] = useState<TrainingStats>(() => getTrainingStats({}, []))
  const [weightTrend, setWeightTrend] = useState<BodyMetricTrend | null>(null)
  const [waistTrend, setWaistTrend] = useState<BodyMetricTrend | null>(null)

  useEffect(() => {
    const refresh = () => {
      const gymLog = readGymLog()
      const runLog = readRunLog()
      setStore(gymLog)
      setRuns(runLog)
      setActiveRun(hasResumableRunSession() ? readActiveRunSession() : null)
      setStats(getTrainingStats(gymLog, runLog))

      const metrics = getLatestMetrics()
      setWeightTrend(getBodyMetricTrend(metrics, 'weight'))
      setWaistTrend(getBodyMetricTrend(metrics, 'waist'))
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
  const { program: incompleteWorkoutProgram } = useLoggedProgram(incompleteWorkout?.log)
  const lastRun = getLastRun(runs)
  const weekActivities = getCurrentWeekActivities(store, runs)
  const { start: weekStart, end: weekEnd } = getWeekRange(0)
  const weekLabel = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`
  const weekGymCompleted = weekActivities.filter(
    (a) => a.kind === 'gym' && getDayStatus(a.log) === 'complete',
  ).length
  const weekRest = weekActivities.filter(
    (a) => a.kind === 'gym' && getDayStatus(a.log) === 'rest',
  ).length
  const weekRuns = weekActivities.filter((a) => a.kind === 'run').length
  const hasStats =
    stats.sessions.total > 0 ||
    stats.completed.total > 0 ||
    stats.runs.total > 0 ||
    weightTrend ||
    waistTrend

  const fourWeekStart = startOfDay(subDays(new Date(), 27))
  const completedLast4Weeks = Object.keys(store).filter(
    (date) =>
      getDayStatus(store[date]) === 'complete' &&
      parseISO(`${date}T12:00:00`) >= fourWeekStart,
  ).length
  const goalContext = {
    schedule: program.schedule as Record<string, string>,
    stats,
    workoutsThisWeek: weekGymCompleted,
    completedLast4Weeks,
    weight: weightTrend,
    waist: waistTrend,
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <CyberGrid />
      <CyberHeader
        onTrainingClick={onStartTraining}
        onRunningClick={onStartRunning}
        onMetricsClick={onOpenMetrics}
        onSettingsClick={onOpenSettings}
        onAiChatClick={onOpenAiChat}
      />

      <main className="relative z-10 pt-24 pb-20 home-page-content">
        <section className="max-w-3xl mx-auto px-4 py-6 md:py-8">
          {/* 1. Today + primary actions */}
          <div className="mb-10">
            <p className="font-mono text-xs text-muted-foreground mb-1">{todayLabel}</p>
            <h1 className="font-sans text-xl font-bold text-foreground tracking-wide mb-1">
              {program.name}
            </h1>
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground mb-4">
              {formatProgramVersionLabel(program.version)}
            </p>

            {(incompleteWorkout || activeRun) && (
              <div className="flex flex-col gap-1.5 mb-3">
                {incompleteWorkout && (
                  <p className="flex items-center gap-2 font-mono text-xs text-foreground/90">
                    <span className="w-1.5 h-1.5 rounded-full bg-neon-orange animate-pulse shrink-0" />
                    <span>
                      {getWorkoutLogLabel(incompleteWorkout.log, incompleteWorkoutProgram)} from{' '}
                      {format(parseISO(`${incompleteWorkout.date}T12:00:00`), 'EEE, MMM d')}
                      <span className="text-muted-foreground"> — unfinished</span>
                    </span>
                  </p>
                )}
                {activeRun && (
                  <p className="flex items-center gap-2 font-mono text-xs text-foreground/90">
                    <span className="w-1.5 h-1.5 rounded-full bg-neon-yellow animate-pulse shrink-0" />
                    <span>
                      {formatPlanSummary(activeRun.plan)} ·{' '}
                      {PHASE_LABELS[PHASE_ORDER[activeRun.phaseIndex] ?? 'warmup']}
                      <span className="text-muted-foreground">
                        {activeRun.running
                          ? ' — in progress'
                          : ` · ${formatTimer(activeRun.remainingSeconds)} remaining · paused`}
                      </span>
                    </span>
                  </p>
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
                  Continue {getWorkoutLogLabel(incompleteWorkout.log, incompleteWorkoutProgram)}
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
          </div>

          {/* 2. This week */}
          <section className="mb-10">
            <SectionHeader label="This week" />
            <div className="home-surface border border-border rounded-lg p-4 md:p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 text-neon-orange">
                  <Calendar className="w-4 h-4" />
                  <span className="font-sans text-sm font-bold text-foreground">{weekLabel}</span>
                </div>
              </div>

              {weekActivities.length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground">
                  No training logged yet this week.
                </p>
              ) : (
                <>
                  <p className="font-mono text-sm text-foreground mb-3">
                    <span className="font-sans font-bold text-neon-orange">{weekGymCompleted}</span>{' '}
                    {weekGymCompleted === 1 ? 'workout' : 'workouts'} done
                    {weekRest > 0 && (
                      <span className="text-muted-foreground">
                        {' · '}
                        {pluralize(weekRest, 'rest day')}
                      </span>
                    )}
                    <span className="text-muted-foreground"> · </span>
                    <span className="font-sans font-bold text-neon-yellow">{weekRuns}</span>{' '}
                    {weekRuns === 1 ? 'run' : 'runs'} logged
                  </p>
                  <div>
                    {weekActivities.map((activity) =>
                      activity.kind === 'gym' ? (
                        <WeekWorkoutRow
                          key={`gym-${activity.date}`}
                          date={activity.date}
                          log={activity.log}
                          onOpen={onContinueWorkout}
                        />
                      ) : (
                        <WeekRunRow key={activity.run.id} run={activity.run} />
                      ),
                    )}
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={onStartTraining}
              data-haptic="selection"
              className="mt-3 w-full min-h-[44px] px-4 rounded-lg border border-neon-orange/40 font-mono text-xs font-bold tracking-widest uppercase text-neon-orange hover:bg-neon-orange/10 transition-colors flex items-center justify-center gap-2"
            >
              <ClipboardList className="w-4 h-4" />
              Open training log
              <ArrowRight className="w-4 h-4" />
            </button>
          </section>

          {/* 3. Last run */}
          {lastRun && (
            <section className="mb-10">
              <SectionHeader label="Last run" />
              <div className="-mx-4 home-page-panel px-4">
                <RunSessionDetails run={lastRun} showDate />
              </div>
            </section>
          )}

          {/* 4. Stats */}
          {hasStats && (
            <section className="mb-10">
              <SectionHeader label="Stats" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {stats.sessions.total > 0 && (
                  <CountStatCard label="Sessions" stat={stats.sessions} valueClassName="text-neon-orange" />
                )}
                {stats.completed.total > 0 && (
                  <CountStatCard label="Completed" stat={stats.completed} valueClassName="text-neon-yellow" />
                )}
                {stats.runs.total > 0 && (
                  <CountStatCard label="Runs" stat={stats.runs} valueClassName="text-neon-yellow" />
                )}
                {weightTrend && <BodyStatCard label="Weight" unit="kg" trend={weightTrend} />}
                {waistTrend && <BodyStatCard label="Waist" unit="cm" trend={waistTrend} />}
              </div>
            </section>
          )}

          {/* 5. Program reference */}
          <section id="program" className="mb-10">
            <SectionHeader label="Program goals" />
            <div className="grid sm:grid-cols-2 gap-3">
              {program.goal.map((goal, index) => (
                <GoalCard
                  key={goal}
                  index={index}
                  goal={goal}
                  progress={getGoalProgress(goal, goalContext)}
                />
              ))}
            </div>
          </section>

          <section id="schedule" className="mb-10">
            <SectionHeader label="Weekly schedule" />
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
            <SectionHeader label="Explore workout" />
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
            <SectionHeader label="Progression" />
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

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="w-1 h-5 rounded-full bg-neon-orange shrink-0" aria-hidden />
      <h2 className="font-sans text-sm md:text-base font-bold uppercase tracking-[0.18em] text-foreground shrink-0">
        {label}
      </h2>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}
