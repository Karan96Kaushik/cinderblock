import { format, parseISO } from 'date-fns'
import { Footprints } from 'lucide-react'
import {
  formatPlanSummary,
  getRunTotalMinutes,
  type RunSessionLog,
} from '@/lib/running'

interface RunSessionDetailsProps {
  run: RunSessionLog
  showDate?: boolean
}

export function RunSessionDetails({ run, showDate = false }: RunSessionDetailsProps) {
  const displayDate = format(parseISO(`${run.date}T12:00:00`), 'EEEE, MMM d')
  const displayTime = format(new Date(run.completedAt), 'h:mm a')
  const total = getRunTotalMinutes(run.plan)

  return (
    <div className="bg-card/40 border border-border rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          {showDate && (
            <h3 className="font-mono text-xs text-neon-yellow uppercase tracking-wider mb-1">
              {displayDate}
            </h3>
          )}
          <div className="flex items-center gap-2">
            <Footprints className="w-4 h-4 text-neon-yellow shrink-0" />
            <p className="font-sans text-lg font-bold text-foreground">Run session</p>
          </div>
          <p className="font-mono text-xs text-muted-foreground mt-0.5">{displayTime}</p>
        </div>
        <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded shrink-0 bg-neon-yellow/10 text-neon-yellow">
          Complete
        </span>
      </div>

      <p className="font-sans text-base font-bold text-neon-yellow mb-2">
        {formatPlanSummary(run.plan)}
      </p>

      <div className="grid grid-cols-3 gap-2 mb-2">
        <div className="rounded-lg border border-border/60 bg-background/40 px-2 py-2 text-center">
          <div className="font-sans text-sm font-bold text-foreground">{run.plan.warmupMinutes}m</div>
          <div className="font-mono text-[10px] text-muted-foreground uppercase">Warmup</div>
        </div>
        <div className="rounded-lg border border-neon-yellow/30 bg-neon-yellow/5 px-2 py-2 text-center">
          <div className="font-sans text-sm font-bold text-neon-yellow">{run.plan.runMinutes}m</div>
          <div className="font-mono text-[10px] text-muted-foreground uppercase">Run</div>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/40 px-2 py-2 text-center">
          <div className="font-sans text-sm font-bold text-foreground">{run.plan.cooldownMinutes}m</div>
          <div className="font-mono text-[10px] text-muted-foreground uppercase">Cooldown</div>
        </div>
      </div>

      <p className="font-mono text-xs text-muted-foreground">{total} min total</p>
    </div>
  )
}
