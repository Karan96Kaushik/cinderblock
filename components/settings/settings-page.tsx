import { useState, useEffect, useCallback, useMemo } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import {
  Bell,
  BellOff,
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Haptic } from '@/lib/haptics'
import { useSettings } from '@/hooks/use-settings'
import { useAuth } from '@/hooks/use-auth'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { readGymLog, saveGymLog } from '@/lib/sync/storage'
import {
  DARK_THEMES,
  FONT_PRESETS,
  FONT_SIZES,
  LIGHT_THEMES,
  THEME_PRESETS,
  type FontPresetKey,
  type FontSizeKey,
  type ThemePresetKey,
} from '@/lib/settings'
import type { GymStore, WorkoutKey } from '@/components/gym/gym-tracker'
import { isExerciseAddressed } from '@/components/gym/gym-tracker'
import program from '@/foundation-7-june.json'

const WORKOUT_LABELS: Record<WorkoutKey, string> = {
  upperA: 'Upper A',
  lowerA: 'Lower A',
  upperB: 'Upper B',
  lowerB: 'Lower B',
  rest: 'Rest day',
}

const WORKOUT_KEYS: WorkoutKey[] = ['upperA', 'lowerA', 'upperB', 'lowerB', 'rest']

type WorkoutMap = Record<string, { name: string; exercises: { name: string; sets: number }[] }>

function initExercises(key: WorkoutKey): GymStore[string]['exercises'] {
  if (key === 'rest') return {}
  const workouts = program.workouts as WorkoutMap
  const workout = workouts[key]
  if (!workout) return {}
  const result: GymStore[string]['exercises'] = {}
  workout.exercises.forEach((ex) => {
    result[ex.name] = {
      sets: Array.from({ length: ex.sets }, () => ({ weight: '', reps: '' })),
      completed: false,
      skipped: false,
    }
  })
  return result
}

function getDayStatus(log: GymStore[string]): 'complete' | 'partial' | 'rest' | 'empty' {
  if (log.workoutKey === 'rest') return 'rest'
  const exercises = Object.values(log.exercises)
  if (exercises.length === 0) return 'empty'
  if (exercises.every((e) => isExerciseAddressed(e))) return 'complete'
  return 'partial'
}

interface SettingsPageProps {
  onBack: () => void
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const { settings, setFontSize, setFontPreset, setTheme, resetSettings } = useSettings()
  const { token } = useAuth()
  const [gymStore, setGymStore] = useState<GymStore>({})
  const [expandedDate, setExpandedDate] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState<'30d' | 'all' | null>(null)

  useEffect(() => {
    setGymStore(readGymLog())
  }, [])

  const sortedEntries = useMemo(
    () =>
      Object.entries(gymStore)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, log]) => ({ date, log })),
    [gymStore],
  )

  const persistGym = useCallback(
    (store: GymStore) => {
      setGymStore(store)
      saveGymLog(store, token)
    },
    [token],
  )

  const deleteEntry = (date: string) => {
    const next = { ...gymStore }
    delete next[date]
    persistGym(next)
    if (expandedDate === date) setExpandedDate(null)
    Haptic.warning()
  }

  const changeWorkout = (date: string, key: WorkoutKey) => {
    const existing = gymStore[date]
    if (existing?.workoutKey === key) return

    if (key === 'rest') {
      persistGym({ ...gymStore, [date]: { workoutKey: 'rest', exercises: {} } })
    } else {
      persistGym({
        ...gymStore,
        [date]: { workoutKey: key, exercises: initExercises(key) },
      })
    }
    Haptic.selection()
  }

  const removeOlderThan = (days: number) => {
    const cutoff = format(subDays(new Date(), days), 'yyyy-MM-dd')
    const next = Object.fromEntries(
      Object.entries(gymStore).filter(([date]) => date >= cutoff),
    )
    persistGym(next)
    setConfirmClear(null)
    Haptic.success()
  }

  const clearAllWorkouts = () => {
    persistGym({})
    setConfirmClear(null)
    Haptic.success()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background/95 border-b border-border backdrop-blur-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
          <button
            onClick={onBack}
            data-haptic="light"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-neon-orange transition-colors min-h-[44px] px-1"
          >
            <span className="font-mono text-xs">← CINDERBLOCK</span>
          </button>
          <span className="font-sans text-xs font-bold tracking-widest text-neon-orange neon-text-orange">
            SETTINGS
          </span>
          <span className="font-mono text-xs text-muted-foreground w-[100px] text-right">
            {format(new Date(), 'MMM d')}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-12 space-y-8 pt-6">
        <AppearanceSection
          fontSize={settings.fontSize}
          fontPreset={settings.fontPreset}
          theme={settings.theme}
          onFontSize={setFontSize}
          onFontPreset={setFontPreset}
          onTheme={setTheme}
          onReset={resetSettings}
        />

        <NotificationsSection />

        <WorkoutHistorySection
          entries={sortedEntries}
          expandedDate={expandedDate}
          confirmClear={confirmClear}
          onToggleExpand={(date) =>
            setExpandedDate((prev) => (prev === date ? null : date))
          }
          onDelete={deleteEntry}
          onChangeWorkout={changeWorkout}
          onConfirmClear={setConfirmClear}
          onRemoveOlderThan={removeOlderThan}
          onClearAll={clearAllWorkouts}
        />
      </div>
    </div>
  )
}

function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="bg-card/40 border border-border rounded-xl p-4">
      <h2 className="font-mono text-xs text-neon-orange uppercase tracking-wider mb-4">
        {title}
      </h2>
      {children}
    </section>
  )
}

function ThemePicker({
  theme,
  onTheme,
}: {
  theme: ThemePresetKey
  onTheme: (theme: ThemePresetKey) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-xs text-muted-foreground mb-1">Theme</p>
        <p className="font-mono text-[10px] text-muted-foreground/70">
          Color presets for the whole app
        </p>
      </div>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          Dark
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {DARK_THEMES.map((key) => (
            <ThemeSwatch
              key={key}
              themeKey={key}
              selected={theme === key}
              onSelect={() => onTheme(key)}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          Light
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {LIGHT_THEMES.map((key) => (
            <ThemeSwatch
              key={key}
              themeKey={key}
              selected={theme === key}
              onSelect={() => onTheme(key)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ThemeSwatch({
  themeKey,
  selected,
  onSelect,
}: {
  themeKey: ThemePresetKey
  selected: boolean
  onSelect: () => void
}) {
  const preset = THEME_PRESETS[themeKey]
  const [bg, accent, glow] = preset.swatch

  return (
    <button
      type="button"
      onClick={onSelect}
      data-haptic="selection"
      className={cn(
        'w-full text-left rounded-xl border overflow-hidden transition-all duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-orange/50',
        selected
          ? 'border-neon-orange/60 ring-1 ring-neon-orange/30'
          : 'border-border hover:border-muted-foreground',
      )}
    >
      <div
        className="h-14 flex items-end gap-1 p-2.5"
        style={{ background: `linear-gradient(135deg, ${bg} 0%, ${glow} 100%)` }}
      >
        <span
          className="w-6 h-6 rounded-md shrink-0 border border-white/10"
          style={{ backgroundColor: accent }}
        />
        <span
          className="flex-1 h-2 rounded-full opacity-80"
          style={{ backgroundColor: glow }}
        />
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: accent }}
        />
      </div>
      <div
        className="px-3 py-2.5 border-t border-border/30"
        style={{ backgroundColor: preset.tokens.background }}
      >
        <div
          className="font-sans text-xs font-bold tracking-wider uppercase"
          style={{ color: preset.tokens.primaryText }}
        >
          {preset.label}
        </div>
        <div
          className="font-mono text-[10px] mt-0.5 leading-relaxed"
          style={{ color: preset.tokens.secondaryText }}
        >
          {preset.description}
        </div>
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/10">
          <span className="font-mono text-[9px] font-bold" style={{ color: preset.tokens.primaryText }}>
            Primary
          </span>
          <span className="font-mono text-[9px]" style={{ color: preset.tokens.secondaryText }}>
            Secondary
          </span>
          <span className="font-mono text-[9px] font-bold" style={{ color: preset.tokens.accentText }}>
            Accent
          </span>
        </div>
      </div>
    </button>
  )
}

function AppearanceSection({
  fontSize,
  fontPreset,
  theme,
  onFontSize,
  onFontPreset,
  onTheme,
  onReset,
}: {
  fontSize: FontSizeKey
  fontPreset: FontPresetKey
  theme: ThemePresetKey
  onFontSize: (size: FontSizeKey) => void
  onFontPreset: (preset: FontPresetKey) => void
  onTheme: (theme: ThemePresetKey) => void
  onReset: () => void
}) {
  return (
    <SectionCard title="Appearance">
      <div className="space-y-5">
        <ThemePicker theme={theme} onTheme={onTheme} />

        <div>
          <p className="font-mono text-xs text-muted-foreground mb-3">Font size</p>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(FONT_SIZES) as FontSizeKey[]).map((key) => (
              <button
                key={key}
                onClick={() => onFontSize(key)}
                data-haptic="selection"
                className={cn(
                  'min-h-[44px] rounded-lg border font-mono text-xs tracking-wider uppercase transition-colors',
                  fontSize === key
                    ? 'bg-neon-orange/20 border-neon-orange/50 text-neon-orange'
                    : 'border-border text-muted-foreground hover:border-muted-foreground',
                )}
              >
                {FONT_SIZES[key].label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="font-mono text-xs text-muted-foreground mb-3">Font style</p>
          <div className="space-y-2">
            {(Object.keys(FONT_PRESETS) as FontPresetKey[]).map((key) => {
              const preset = FONT_PRESETS[key]
              return (
                <button
                  key={key}
                  onClick={() => onFontPreset(key)}
                  data-haptic="selection"
                  className={cn(
                    'w-full text-left rounded-lg border p-3 transition-colors min-h-[56px]',
                    fontPreset === key
                      ? 'bg-neon-orange/10 border-neon-orange/40'
                      : 'border-border hover:border-muted-foreground',
                  )}
                >
                  <div
                    className={cn(
                      'font-sans text-sm font-bold',
                      fontPreset === key ? 'text-neon-orange' : 'text-foreground',
                    )}
                    style={{ fontFamily: preset.sans }}
                  >
                    {preset.label}
                  </div>
                  <div
                    className="font-mono text-xs text-muted-foreground mt-0.5"
                    style={{ fontFamily: preset.mono }}
                  >
                    {preset.description}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <button
          onClick={onReset}
          data-haptic="light"
          className="flex items-center gap-2 font-mono text-xs text-muted-foreground hover:text-neon-orange transition-colors min-h-[44px]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset appearance to defaults
        </button>

        <div
          className="rounded-lg border border-border/60 bg-background/50 p-3"
          style={{
            fontFamily: FONT_PRESETS[fontPreset].mono,
            fontSize: `${FONT_SIZES[fontSize].scale}rem`,
          }}
        >
          <p className="font-sans font-bold text-text-primary" style={{ fontFamily: FONT_PRESETS[fontPreset].sans }}>
            Preview heading
          </p>
          <p className="font-mono text-text-secondary text-sm mt-1">
            Secondary body text — captions and labels
          </p>
          <p className="font-mono text-text-accent text-sm mt-1">
            Accent text — MARK DONE · 3 sets × 8 reps
          </p>
        </div>
      </div>
    </SectionCard>
  )
}

function NotificationsSection() {
  const {
    permission,
    swState,
    isEnabled,
    isSupported,
    isReady,
    error,
    enableNotifications,
    sendTestNotification,
    checkSWStatus,
  } = usePushNotifications()

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleEnable = async () => {
    setLoading(true)
    setMessage(null)
    const state = await checkSWStatus()
    if (state !== 'active') {
      setMessage('Service worker not ready — try refreshing the page.')
      setLoading(false)
      Haptic.warning()
      return
    }
    const ok = await enableNotifications()
    setLoading(false)
    if (ok) {
      setMessage('Notifications enabled.')
      Haptic.success()
    } else {
      Haptic.error()
    }
  }

  const handleTest = () => {
    const sent = sendTestNotification(
      'CINDERBLOCK',
      'Test notification — your alerts are working.',
    )
    if (sent) {
      setMessage('Test notification sent.')
      Haptic.success()
    } else {
      setMessage('Could not send test — enable notifications first.')
      Haptic.error()
    }
  }

  const statusLabel =
    !isSupported
      ? 'Not supported'
      : permission === 'denied'
        ? 'Blocked'
        : isEnabled
          ? 'Enabled'
          : isReady
            ? 'Ready to enable'
            : 'Initializing'

  return (
    <SectionCard title="Notifications">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {isEnabled ? (
            <Bell className="w-5 h-5 text-neon-orange shrink-0" />
          ) : (
            <BellOff className="w-5 h-5 text-muted-foreground shrink-0" />
          )}
          <div>
            <p className="font-sans text-sm font-bold text-foreground">{statusLabel}</p>
            <p className="font-mono text-xs text-muted-foreground mt-0.5">
              Permission: {permission} · Service worker: {swState}
            </p>
          </div>
        </div>

        <p className="font-mono text-xs text-muted-foreground leading-relaxed">
          Enable browser notifications for workout reminders and alerts. On iOS, add this app to
          your home screen first for best results.
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          {!isEnabled && isSupported && permission !== 'denied' && (
            <button
              onClick={handleEnable}
              disabled={loading || !isReady}
              data-haptic="success"
              className="flex-1 min-h-[44px] rounded-lg bg-neon-orange text-primary-foreground font-mono text-xs font-bold tracking-widest uppercase hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Enable notifications
            </button>
          )}
          {permission === 'granted' && (
            <button
              onClick={handleTest}
              data-haptic="light"
              className="flex-1 min-h-[44px] rounded-lg border border-neon-orange/40 font-mono text-xs tracking-widest uppercase text-neon-orange hover:bg-neon-orange/10 transition-colors"
            >
              Send test notification
            </button>
          )}
        </div>

        {permission === 'denied' && (
          <p className="font-mono text-xs text-neon-red">
            Notifications are blocked. Allow them in your browser or device settings, then refresh.
          </p>
        )}

        {error && (
          <p className="font-mono text-xs text-neon-red">{error}</p>
        )}

        {message && (
          <p className="font-mono text-xs text-neon-yellow">{message}</p>
        )}
      </div>
    </SectionCard>
  )
}

function WorkoutHistorySection({
  entries,
  expandedDate,
  confirmClear,
  onToggleExpand,
  onDelete,
  onChangeWorkout,
  onConfirmClear,
  onRemoveOlderThan,
  onClearAll,
}: {
  entries: { date: string; log: GymStore[string] }[]
  expandedDate: string | null
  confirmClear: '30d' | 'all' | null
  onToggleExpand: (date: string) => void
  onDelete: (date: string) => void
  onChangeWorkout: (date: string, key: WorkoutKey) => void
  onConfirmClear: (mode: '30d' | 'all' | null) => void
  onRemoveOlderThan: (days: number) => void
  onClearAll: () => void
}) {
  return (
    <SectionCard title="Workout history">
      <p className="font-mono text-xs text-muted-foreground mb-4 leading-relaxed">
        View, edit, or remove logged workouts. Changing a workout type resets exercise progress
        for that day.
      </p>

      {entries.length === 0 ? (
        <p className="font-mono text-xs text-muted-foreground text-center py-6">
          No workouts logged yet.
        </p>
      ) : (
        <div className="space-y-2 mb-4">
          {entries.map(({ date, log }) => {
            const status = getDayStatus(log)
            const isExpanded = expandedDate === date
            const completed = Object.values(log.exercises).filter((e) => e.completed).length
            const total = Object.keys(log.exercises).length

            return (
              <div
                key={date}
                className={cn(
                  'border rounded-lg transition-colors',
                  isExpanded ? 'border-neon-orange/40 bg-neon-orange/5' : 'border-border bg-card/30',
                )}
              >
                <button
                  onClick={() => onToggleExpand(date)}
                  data-haptic="selection"
                  className="w-full flex items-center justify-between gap-3 p-3 min-h-[52px] text-left"
                >
                  <div>
                    <div className="font-sans text-sm font-bold text-foreground">
                      {format(parseISO(date + 'T12:00:00'), 'EEE, MMM d yyyy')}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground mt-0.5">
                      {WORKOUT_LABELS[log.workoutKey]}
                      {status === 'complete' && total > 0 && ` · ${completed}/${total} done`}
                      {status === 'partial' && total > 0 && ` · ${completed}/${total} in progress`}
                      {status === 'rest' && ' · logged'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={status} />
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
                    <div>
                      <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                        Change workout
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {WORKOUT_KEYS.map((key) => (
                          <button
                            key={key}
                            onClick={() => onChangeWorkout(date, key)}
                            data-haptic="selection"
                            className={cn(
                              'min-h-[36px] rounded-md border font-mono text-xs transition-colors',
                              log.workoutKey === key
                                ? 'bg-neon-orange/20 border-neon-orange/50 text-neon-orange'
                                : 'border-border text-muted-foreground hover:border-muted-foreground',
                            )}
                          >
                            {WORKOUT_LABELS[key]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => onDelete(date)}
                      data-haptic="warning"
                      className="w-full min-h-[40px] rounded-lg border border-neon-red/30 font-mono text-xs tracking-wider uppercase text-neon-red hover:bg-neon-red/10 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove this entry
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {entries.length > 0 && (
        <div className="pt-3 border-t border-border/50 space-y-2">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
            Bulk actions
          </p>

          {confirmClear === '30d' ? (
            <ConfirmRow
              label="Remove workouts older than 30 days?"
              onConfirm={() => onRemoveOlderThan(30)}
              onCancel={() => onConfirmClear(null)}
            />
          ) : confirmClear === 'all' ? (
            <ConfirmRow
              label="Delete all workout history?"
              onConfirm={onClearAll}
              onCancel={() => onConfirmClear(null)}
            />
          ) : (
            <>
              <button
                onClick={() => onConfirmClear('30d')}
                data-haptic="warning"
                className="w-full min-h-[40px] rounded-lg border border-border font-mono text-xs text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
              >
                Remove workouts older than 30 days
              </button>
              <button
                onClick={() => onConfirmClear('all')}
                data-haptic="warning"
                className="w-full min-h-[40px] rounded-lg border border-neon-red/30 font-mono text-xs text-neon-red hover:bg-neon-red/10 transition-colors"
              >
                Clear all workout history
              </button>
            </>
          )}
        </div>
      )}
    </SectionCard>
  )
}

function StatusBadge({ status }: { status: ReturnType<typeof getDayStatus> }) {
  const styles = {
    complete: 'bg-neon-orange/20 text-neon-orange',
    partial: 'bg-neon-yellow/10 text-neon-yellow',
    rest: 'bg-muted text-muted-foreground',
    empty: 'bg-muted/50 text-muted-foreground',
  }
  const labels = {
    complete: 'Done',
    partial: 'Partial',
    rest: 'Rest',
    empty: 'Empty',
  }
  return (
    <span className={cn('font-mono text-[10px] uppercase px-2 py-0.5 rounded', styles[status])}>
      {labels[status]}
    </span>
  )
}

function ConfirmRow({
  label,
  onConfirm,
  onCancel,
}: {
  label: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 font-mono text-xs text-muted-foreground">{label}</span>
      <button
        onClick={onConfirm}
        data-haptic="warning"
        className="min-h-[36px] px-3 rounded-md bg-neon-red/20 border border-neon-red/40 font-mono text-xs text-neon-red"
      >
        Confirm
      </button>
      <button
        onClick={onCancel}
        data-haptic="light"
        className="min-h-[36px] px-3 rounded-md border border-border font-mono text-xs text-muted-foreground"
      >
        Cancel
      </button>
    </div>
  )
}
