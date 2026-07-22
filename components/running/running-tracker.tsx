import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Haptic } from '@/lib/haptics'
import { usePreventPullToRefresh } from '@/hooks/use-prevent-pull-to-refresh'
import {
  clearActiveRunSession,
  formatPlanSummary,
  formatTimer,
  PHASE_LABELS,
  PHASE_ORDER,
  readActiveRunSession,
  readDefaultRunningPlan,
  readRunLog,
  restoreActiveRunSession,
  type ActiveRunSession,
  type RunningPlan,
} from '@/lib/running'
import { parseRunningPath, paths } from '@/lib/routes'
import { ACTIVE_PLAN_EVENT } from '@/lib/supabase/cloud-sync'
import { RunningFlow } from './running-flow'
import { RunningPlanBuilder } from './running-plan-builder'

interface RunningTrackerProps {
  onBack: () => void
}

function getInitialPlan(): RunningPlan {
  const saved = readActiveRunSession()
  return saved?.plan ?? readDefaultRunningPlan()
}

export function RunningTracker({ onBack }: RunningTrackerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const view = parseRunningPath(location.pathname)
  const [plan, setPlan] = useState<RunningPlan>(getInitialPlan)
  const [recentRuns, setRecentRuns] = useState(() => readRunLog().slice(0, 3))
  const [activeSession, setActiveSession] = useState<ActiveRunSession | null>(() =>
    readActiveRunSession(),
  )
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const today = format(new Date(), 'MMM d, yyyy')

  useEffect(() => {
    setActiveSession(readActiveRunSession())
    setConfirmDiscard(false)
  }, [view])

  useEffect(() => {
    const onPlan = (event: Event) => {
      const next = (event as CustomEvent<RunningPlan>).detail
      if (next) setPlan(next)
    }
    window.addEventListener(ACTIVE_PLAN_EVENT, onPlan)
    return () => window.removeEventListener(ACTIVE_PLAN_EVENT, onPlan)
  }, [])

  const canResume =
    activeSession?.started &&
    !restoreActiveRunSession(activeSession).finished &&
    view === 'plan'

  const goToPlan = () => navigate(paths.running('plan'))
  const goToSession = () => navigate(paths.running('session'))

  const handleFinish = () => {
    setRecentRuns(readRunLog().slice(0, 3))
    setActiveSession(null)
    goToPlan()
  }

  const handleResume = () => {
    if (activeSession?.plan) setPlan(activeSession.plan)
    goToSession()
  }

  const handleDiscard = () => {
    clearActiveRunSession()
    setActiveSession(null)
    setPlan(readDefaultRunningPlan())
    setConfirmDiscard(false)
    Haptic.warning()
  }

  usePreventPullToRefresh(scrollRef)

  return (
    <div className="h-dvh bg-background flex flex-col overflow-hidden overscroll-none">
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

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-none">
      <div className="max-w-2xl mx-auto">
        {view === 'plan' && (
          <div className="px-4 pt-6 pb-28">
            <h1 className="font-sans text-3xl sm:text-4xl font-bold text-foreground tracking-wider mb-2">
              Run session
            </h1>
            <p className="font-mono text-sm text-muted-foreground mb-8">
              Warmup · run · cooldown — {formatPlanSummary(plan)}
            </p>

            {canResume && activeSession && (
              <div className="mb-8 rounded-xl border border-neon-yellow/30 bg-neon-yellow/5 p-5">
                <p className="font-mono text-sm text-neon-yellow uppercase tracking-wider mb-2">
                  Session in progress
                </p>
                <p className="font-sans text-lg text-foreground mb-2">
                  {formatPlanSummary(activeSession.plan)} ·{' '}
                  {PHASE_LABELS[PHASE_ORDER[activeSession.phaseIndex] ?? 'warmup']}
                </p>
                <p className="font-mono text-sm text-muted-foreground mb-5">
                  {activeSession.running
                    ? 'Timer was running — will catch up from last timestamp'
                    : `${formatTimer(activeSession.remainingSeconds)} remaining · paused`}
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleResume}
                    data-haptic="success"
                    className="w-full min-h-[52px] rounded-xl bg-neon-orange text-primary-foreground font-mono text-sm font-bold tracking-widest uppercase hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    Continue run
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  {confirmDiscard ? (
                    <div className="rounded-xl border border-neon-red/30 bg-neon-red/5 p-4 space-y-3">
                      <p className="font-mono text-sm text-foreground text-center">
                        Discard this run? Progress will not be saved.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmDiscard(false)}
                          data-haptic="light"
                          className="flex-1 min-h-[44px] rounded-lg border border-border font-mono text-xs tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleDiscard}
                          data-haptic="warning"
                          className="flex-1 min-h-[44px] rounded-lg bg-neon-red/20 border border-neon-red/40 font-mono text-xs font-bold tracking-widest uppercase text-neon-red"
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDiscard(true)}
                      data-haptic="warning"
                      className="w-full min-h-[52px] rounded-xl border border-border font-mono text-sm tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Discard
                    </button>
                  )}
                </div>
              </div>
            )}

            <RunningPlanBuilder plan={plan} onChange={setPlan} />

            <button
              type="button"
              onClick={() => {
                if (canResume) {
                  clearActiveRunSession()
                  setActiveSession(null)
                }
                goToSession()
              }}
              data-haptic="success"
              className="w-full mt-8 min-h-[56px] rounded-xl bg-neon-orange text-primary-foreground font-mono text-base font-bold tracking-widest uppercase hover:opacity-90 active:opacity-75 transition-opacity neon-border-orange"
            >
              {canResume ? 'Start new session' : 'Start session'}
            </button>

            {recentRuns.length > 0 && (
              <div className="mt-10">
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-4">
                  Recent runs
                </p>
                <div className="space-y-3">
                  {recentRuns.map((run) => (
                    <div
                      key={run.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-card/40 px-4 py-3.5"
                    >
                      <span className="font-mono text-sm text-muted-foreground">
                        {format(new Date(run.completedAt), 'EEE, MMM d')}
                      </span>
                      <span className="font-sans text-base font-bold text-foreground">
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
