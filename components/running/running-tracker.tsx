import { useRef, useState } from 'react'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { usePreventPullToRefresh } from '@/hooks/use-prevent-pull-to-refresh'
import {
  clearActiveRunSession,
  DEFAULT_RUNNING_PLAN,
  formatPlanSummary,
  formatTimer,
  hasResumableRunSession,
  PHASE_LABELS,
  PHASE_ORDER,
  readActiveRunSession,
  readRunLog,
  restoreActiveRunSession,
  type RunningPlan,
} from '@/lib/running'
import { parseRunningPath, paths } from '@/lib/routes'
import { RunningFlow } from './running-flow'
import { RunningPlanBuilder } from './running-plan-builder'

interface RunningTrackerProps {
  onBack: () => void
}

function getInitialPlan(): RunningPlan {
  const saved = readActiveRunSession()
  return saved?.plan ?? DEFAULT_RUNNING_PLAN
}

export function RunningTracker({ onBack }: RunningTrackerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const view = parseRunningPath(location.pathname)
  const [plan, setPlan] = useState<RunningPlan>(getInitialPlan)
  const [recentRuns, setRecentRuns] = useState(() => readRunLog().slice(0, 3))
  const today = format(new Date(), 'MMM d, yyyy')

  const savedSession = readActiveRunSession()
  const canResume =
    savedSession?.started &&
    !restoreActiveRunSession(savedSession).finished &&
    view === 'plan'

  const goToPlan = () => navigate(paths.running('plan'))
  const goToSession = () => navigate(paths.running('session'))

  const handleFinish = () => {
    setRecentRuns(readRunLog().slice(0, 3))
    goToPlan()
  }

  const handleResume = () => {
    if (savedSession?.plan) setPlan(savedSession.plan)
    goToSession()
  }

  const handleDiscard = () => {
    clearActiveRunSession()
  }

  usePreventPullToRefresh(scrollRef)

  return (
    <div className="min-h-screen bg-background flex flex-col overscroll-none">
      <div className="sticky top-0 z-50 bg-background/95 border-b border-border backdrop-blur-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
          <button
            onClick={onBack}
            data-haptic="light"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-neon-orange transition-colors min-h-[44px] px-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="font-mono text-xs">← CINDERBLOCK</span>
          </button>
          <span className="font-sans text-xs font-bold tracking-widest text-neon-orange neon-text-orange">
            RUNNING
          </span>
          <span className="font-mono text-xs text-muted-foreground w-[100px] text-right">{today}</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-none">
      <div className="max-w-2xl mx-auto">
        {view === 'plan' && (
          <div className="px-4 pt-6 pb-28">
            <h1 className="font-sans text-2xl font-bold text-foreground tracking-wider mb-1">
              Run session
            </h1>
            <p className="font-mono text-xs text-muted-foreground mb-6">
              Warmup · run · cooldown — default 5 · 30 · 5
            </p>

            {canResume && savedSession && (
              <div className="mb-6 rounded-xl border border-neon-yellow/30 bg-neon-yellow/5 p-4">
                <p className="font-mono text-xs text-neon-yellow uppercase tracking-wider mb-1">
                  Session in progress
                </p>
                <p className="font-sans text-sm text-foreground mb-1">
                  {formatPlanSummary(savedSession.plan)} ·{' '}
                  {PHASE_LABELS[PHASE_ORDER[savedSession.phaseIndex] ?? 'warmup']}
                </p>
                <p className="font-mono text-xs text-muted-foreground mb-4">
                  {savedSession.running
                    ? 'Timer was running — will catch up from last timestamp'
                    : `${formatTimer(savedSession.remainingSeconds)} remaining · paused`}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleResume}
                    data-haptic="success"
                    className="flex-1 min-h-[44px] rounded-lg bg-neon-orange text-primary-foreground font-mono text-xs font-bold tracking-widest uppercase hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    Continue run
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleDiscard}
                    data-haptic="warning"
                    className="min-h-[44px] px-4 rounded-lg border border-border font-mono text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}

            <RunningPlanBuilder plan={plan} onChange={setPlan} />

            <button
              type="button"
              onClick={() => {
                if (canResume) clearActiveRunSession()
                goToSession()
              }}
              data-haptic="success"
              className="w-full mt-8 min-h-[52px] rounded-lg bg-neon-orange text-primary-foreground font-mono text-sm font-bold tracking-widest uppercase hover:opacity-90 active:opacity-75 transition-opacity neon-border-orange"
            >
              {canResume ? 'Start new session' : 'Start session'}
            </button>

            {recentRuns.length > 0 && (
              <div className="mt-10">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
                  Recent runs
                </p>
                <div className="space-y-2">
                  {recentRuns.map((run) => (
                    <div
                      key={run.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-card/40 px-3 py-2.5"
                    >
                      <span className="font-mono text-xs text-muted-foreground">
                        {format(new Date(run.completedAt), 'EEE, MMM d')}
                      </span>
                      <span className="font-sans text-sm font-bold text-foreground">
                        {run.plan.warmupMinutes} · {run.plan.runMinutes} · {run.plan.cooldownMinutes}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'session' && (
          <RunningFlow
            plan={plan}
            onBack={goToPlan}
            onFinish={handleFinish}
          />
        )}
      </div>
      </div>
    </div>
  )
}
