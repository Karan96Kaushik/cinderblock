import { cn } from '@/lib/utils'
import {
  COOLDOWN_PRESETS_MINUTES,
  DEFAULT_RUNNING_PLAN,
  formatMinutes,
  formatPlanSummary,
  PLAN_PRESETS,
  plansMatch,
  RUN_PRESETS_MINUTES,
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
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="font-sans text-sm font-bold text-neon-orange">{formatMinutes(value)}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {presets.map((minutes) => (
          <button
            key={minutes}
            type="button"
            onClick={() => onSelect(minutes)}
            data-haptic="selection"
            className={cn(
              'min-h-[40px] min-w-[52px] px-3 rounded-lg border font-mono text-sm font-bold tracking-wider transition-colors',
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
  const update = (patch: Partial<RunningPlan>) => onChange({ ...plan, ...patch })

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          Quick plans
        </p>
        <div className="flex flex-wrap gap-2">
          {PLAN_PRESETS.map((preset) => {
            const active = plansMatch(plan, preset)
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() =>
                  onChange({
                    warmupMinutes: preset.warmupMinutes,
                    runMinutes: preset.runMinutes,
                    cooldownMinutes: preset.cooldownMinutes,
                  })
                }
                data-haptic="selection"
                className={cn(
                  'min-h-[44px] px-4 rounded-lg border font-mono text-xs font-bold tracking-widest uppercase transition-colors',
                  active
                    ? 'bg-neon-orange text-primary-foreground border-neon-orange neon-border-orange'
                    : 'border-border text-muted-foreground hover:text-neon-orange hover:border-neon-orange/40',
                )}
              >
                {preset.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-4 space-y-5">
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
      </div>

      <div className="text-center">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          Session total
        </p>
        <p className="font-sans text-2xl font-bold text-foreground tabular-nums">
          {formatPlanSummary(plan)}
          <span className="text-sm font-normal text-muted-foreground ml-2">
            ({plan.warmupMinutes + plan.runMinutes + plan.cooldownMinutes} min)
          </span>
        </p>
        {!plansMatch(plan, DEFAULT_RUNNING_PLAN) && (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_RUNNING_PLAN)}
            data-haptic="light"
            className="mt-3 font-mono text-xs text-muted-foreground hover:text-neon-orange transition-colors"
          >
            Reset to 5 · 30 · 5
          </button>
        )}
      </div>
    </div>
  )
}
