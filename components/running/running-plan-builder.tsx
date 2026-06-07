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
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="font-sans text-lg font-bold text-neon-orange">{formatMinutes(value)}</span>
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
  const update = (patch: Partial<RunningPlan>) => onChange({ ...plan, ...patch })

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Quick plans
        </p>
        <div className="flex flex-wrap gap-2.5">
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
                  'min-h-[52px] px-5 rounded-xl border font-mono text-sm font-bold tracking-widest uppercase transition-colors',
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

      <div className="rounded-xl border border-border bg-card/50 p-5 md:p-6 space-y-6">
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
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-2">
          Session total
        </p>
        <p className="font-sans text-3xl sm:text-4xl font-bold text-foreground tabular-nums">
          {formatPlanSummary(plan)}
          <span className="text-base font-normal text-muted-foreground ml-2">
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
