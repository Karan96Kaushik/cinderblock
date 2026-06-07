import { useState } from 'react'
import { Check, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  COOLDOWN_PRESETS_MINUTES,
  formatPlanSummary,
  getRunTotalMinutes,
  RUN_PRESETS_MINUTES,
  writeDefaultRunningPlan,
  type RunningPlan,
  WARMUP_PRESETS_MINUTES,
} from '@/lib/running'

interface RunningPlanBuilderProps {
  plan: RunningPlan
  onChange: (plan: RunningPlan) => void
}

function PresetRow({
  label,
  value,
  presets,
  onSelect,
}: {
  label: string
  value: number
  presets: readonly number[]
  onSelect: (minutes: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="font-sans text-lg font-bold text-neon-orange">{value}m</span>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {presets.map((minutes) => (
          <button
            key={minutes}
            type="button"
            onClick={() => onSelect(minutes)}
            data-haptic="selection"
            className={cn(
              'min-h-[48px] min-w-[60px] px-4 rounded-xl border font-mono text-base font-bold tracking-wider transition-colors',
              value === minutes
                ? 'bg-neon-orange/20 border-neon-orange/50 text-neon-orange'
                : 'border-border text-muted-foreground hover:border-neon-orange/40 hover:text-neon-orange',
            )}
          >
            {minutes}m
          </button>
        ))}
      </div>
    </div>
  )
}

export function RunningPlanBuilder({ plan, onChange }: RunningPlanBuilderProps) {
  const [editing, setEditing] = useState(false)

  const applyPlan = (next: RunningPlan) => {
    onChange(next)
    writeDefaultRunningPlan(next)
  }

  const update = (patch: Partial<RunningPlan>) => applyPlan({ ...plan, ...patch })

  if (!editing) {
    return (
      <div className="rounded-xl border border-border bg-card/50 p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Run preset
            </p>
            <p className="font-sans text-3xl sm:text-4xl font-bold text-foreground tabular-nums">
              {formatPlanSummary(plan)}
            </p>
            <p className="font-mono text-sm text-muted-foreground mt-2">
              Warmup · run · cooldown · {getRunTotalMinutes(plan)} min total
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            data-haptic="selection"
            aria-label="Edit run preset"
            className="min-h-[48px] min-w-[48px] rounded-xl border border-border text-muted-foreground hover:text-neon-orange hover:border-neon-orange/40 transition-colors flex items-center justify-center shrink-0"
          >
            <Pencil className="w-5 h-5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-neon-orange/30 bg-card/50 p-5 md:p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs uppercase tracking-wider text-neon-orange">
          Edit run preset
        </p>
        <button
          type="button"
          onClick={() => setEditing(false)}
          data-haptic="success"
          className="min-h-[40px] px-4 rounded-lg bg-neon-orange text-primary-foreground font-mono text-xs font-bold tracking-widest uppercase hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <Check className="w-4 h-4" />
          Done
        </button>
      </div>

      <PresetRow
        label="Warmup"
        value={plan.warmupMinutes}
        presets={WARMUP_PRESETS_MINUTES}
        onSelect={(warmupMinutes) => update({ warmupMinutes })}
      />
      <PresetRow
        label="Run"
        value={plan.runMinutes}
        presets={RUN_PRESETS_MINUTES}
        onSelect={(runMinutes) => update({ runMinutes })}
      />
      <PresetRow
        label="Cooldown"
        value={plan.cooldownMinutes}
        presets={COOLDOWN_PRESETS_MINUTES}
        onSelect={(cooldownMinutes) => update({ cooldownMinutes })}
      />

      <div className="text-center pt-2 border-t border-border/50">
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-1">
          Session total
        </p>
        <p className="font-sans text-2xl font-bold text-foreground tabular-nums">
          {formatPlanSummary(plan)}
          <span className="text-sm font-normal text-muted-foreground ml-2">
            ({getRunTotalMinutes(plan)} min)
          </span>
        </p>
      </div>
    </div>
  )
}
