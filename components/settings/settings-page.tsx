import { useState, useEffect, useCallback, useMemo } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import {
  Bell,
  BellOff,
  ChevronDown,
  ChevronUp,
  Cloud,
  Download,
  Footprints,
  Loader2,
  RotateCcw,
  Server,
  Smartphone,
  Timer,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { Haptic } from '@/lib/haptics'
import { Sound } from '@/lib/sounds'
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
  type AppSettings,
  type FontPresetKey,
  type FontSizeKey,
  type ThemePresetKey,
} from '@/lib/settings'
import {
  getSelectableWorkoutKeys,
  getWorkoutLabel,
  getWorkoutLogLabel,
  REST_DAY_KEY,
  type WorkoutKey,
} from '@/lib/program'
import { getActiveProgram } from '@/lib/active-plan'
import { useActiveProgram } from '@/hooks/use-active-program'
import { useLoggedProgram } from '@/hooks/use-logged-program'
import type { GymStore } from '@/components/gym/gym-tracker'
import { getDayStatus, initExercises } from '@/components/gym/gym-tracker'
import {
  clearRunLog,
  deleteRunSession,
  formatPlanSummary,
  getRunTotalMinutes,
  readRunLog,
  removeRunsOlderThan,
  type RunSessionLog,
} from '@/lib/running'
import { downloadTrainingLogsBackup } from '@/lib/training-backup'
import {
  deleteCloudBackup,
  fetchCloudBackup,
  listCloudBackups,
  uploadCloudBackup,
  type CloudBackupSummary,
} from '@/lib/supabase/backups'
import { restoreTrainingBackupLocally } from '@/lib/supabase/restore'
import {
  importTrainingLogFromDevice,
  listAccountTrainingLogDevices,
  type RemoteDeviceTrainingLog,
} from '@/lib/supabase/training-log-sync'
import { getDeviceId } from '@/lib/device-id'
import {
  invokeAmplifyTest,
  isAmplifyTestConfigured,
} from '@/lib/amplify/test-function'

interface SettingsPageProps {
  onBack: () => void
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const { program, programId } = useActiveProgram()
  const {
    settings,
    setFontSize,
    setFontPreset,
    setTheme,
    setAutoStartRestTimer,
    setRestTimerMinutes,
    setSoundEnabled,
    setSoundVolume,
    resetSettings,
    replaceSettings,
  } = useSettings()
  const { token, user, authBackend, isAuthenticated, isSupabaseEnabled } = useAuth()
  const [gymStore, setGymStore] = useState<GymStore>({})
  const [runLog, setRunLog] = useState<RunSessionLog[]>([])
  const [expandedDate, setExpandedDate] = useState<string | null>(null)
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState<'30d' | 'all' | null>(null)
  const [confirmRunClear, setConfirmRunClear] = useState<'30d' | 'all' | null>(null)

  useEffect(() => {
    setGymStore(readGymLog())
    setRunLog(readRunLog())
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

    if (key === REST_DAY_KEY) {
      persistGym({ ...gymStore, [date]: { workoutKey: REST_DAY_KEY, exercises: {} } })
    } else {
      const currentProgram = getActiveProgram()
      persistGym({
        ...gymStore,
        [date]: {
          workoutKey: key,
          workoutName: getWorkoutLabel(key),
          exercises: initExercises(key),
          programVersion: currentProgram.version,
        },
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

  const deleteRun = (id: string) => {
    deleteRunSession(id)
    setRunLog(readRunLog())
    if (expandedRunId === id) setExpandedRunId(null)
    Haptic.warning()
  }

  const removeRunsOlderThanDays = (days: number) => {
    removeRunsOlderThan(days)
    setRunLog(readRunLog())
    setConfirmRunClear(null)
    Haptic.success()
  }

  const clearAllRuns = () => {
    clearRunLog()
    setRunLog([])
    setConfirmRunClear(null)
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
        <ProgramSection
          programName={program.name}
          programVersion={program.version}
          workoutCount={Object.keys(program.workouts).length}
        />

        <TrainingSection
          autoStartRestTimer={settings.autoStartRestTimer}
          restTimerMinutes={settings.restTimerMinutes}
          onAutoStartRestTimer={setAutoStartRestTimer}
          onRestTimerMinutes={setRestTimerMinutes}
        />

        <AppearanceSection
          fontSize={settings.fontSize}
          fontPreset={settings.fontPreset}
          theme={settings.theme}
          onFontSize={setFontSize}
          onFontPreset={setFontPreset}
          onTheme={setTheme}
          onReset={resetSettings}
        />

        <SoundsSection
          soundEnabled={settings.soundEnabled}
          soundVolume={settings.soundVolume}
          onSoundEnabled={setSoundEnabled}
          onSoundVolume={setSoundVolume}
        />

        <NotificationsSection />

        <AmplifyTestSection
          cloudEnabled={isSupabaseEnabled && isAuthenticated && authBackend === 'supabase'}
        />

        <BackupSection
          gymDays={sortedEntries.length}
          runs={runLog.length}
          cloudEnabled={isSupabaseEnabled && isAuthenticated && authBackend === 'supabase'}
          userId={user?.id ?? null}
          onRestoredSettings={(next) => {
            replaceSettings(next)
            setGymStore(readGymLog())
            setRunLog(readRunLog())
          }}
          onLocalLogsChanged={() => {
            setGymStore(readGymLog())
            setRunLog(readRunLog())
          }}
        />

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

        <RunHistorySection
          runs={runLog}
          expandedRunId={expandedRunId}
          confirmClear={confirmRunClear}
          onToggleExpand={(id) =>
            setExpandedRunId((prev) => (prev === id ? null : id))
          }
          onDelete={deleteRun}
          onConfirmClear={setConfirmRunClear}
          onRemoveOlderThan={removeRunsOlderThanDays}
          onClearAll={clearAllRuns}
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

function SoundsSection({
  soundEnabled,
  soundVolume,
  onSoundEnabled,
  onSoundVolume,
}: {
  soundEnabled: boolean
  soundVolume: number
  onSoundEnabled: (enabled: boolean) => void
  onSoundVolume: (volume: number) => void
}) {
  const volumePercent = Math.round(soundVolume * 100)

  const handlePreview = () => {
    Sound.preview('timerComplete')
    Haptic.selection()
  }

  return (
    <SectionCard title="Sounds">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {soundEnabled ? (
              <Volume2 className="w-5 h-5 text-neon-orange shrink-0" />
            ) : (
              <VolumeX className="w-5 h-5 text-muted-foreground shrink-0" />
            )}
            <div>
              <p className="font-sans text-sm font-bold text-foreground">Workout sounds</p>
              <p className="font-mono text-xs text-muted-foreground mt-0.5">
                Exercise changes, rest timer, and run phase alerts
              </p>
            </div>
          </div>
          <Switch
            checked={soundEnabled}
            onCheckedChange={(checked) => {
              onSoundEnabled(checked)
              Haptic.selection()
              if (checked) Sound.preview('exerciseChange')
            }}
            aria-label="Enable workout sounds"
          />
        </div>

        <div className={cn('space-y-3', !soundEnabled && 'opacity-50 pointer-events-none')}>
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs text-muted-foreground">Volume</p>
            <span className="font-mono text-xs text-neon-orange tabular-nums">{volumePercent}%</span>
          </div>
          <Slider
            value={[volumePercent]}
            min={0}
            max={100}
            step={5}
            onValueChange={([value]) => onSoundVolume(value / 100)}
            aria-label="Sound volume"
          />
        </div>

        <button
          type="button"
          onClick={handlePreview}
          disabled={!soundEnabled}
          data-haptic="light"
          className="w-full min-h-[44px] rounded-lg border border-neon-orange/40 font-mono text-xs tracking-widest uppercase text-neon-orange hover:bg-neon-orange/10 transition-colors disabled:opacity-40"
        >
          Preview timer sound
        </button>
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

  const handleTest = async () => {
    const sent = await sendTestNotification(
      'CINDERBLOCK',
      'Test notification — your alerts are working.',
    )
    if (sent) {
      setMessage('Test notification sent.')
      Haptic.success()
    } else if (Notification.permission !== 'granted') {
      setMessage('Could not send test — enable notifications first.')
      Haptic.error()
    } else {
      setMessage('Could not send test — check browser notification settings.')
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

function shortDeviceId(id: string): string {
  if (id.length <= 14) return id
  return `${id.slice(0, 10)}…${id.slice(-4)}`
}

function AmplifyTestSection({ cloudEnabled }: { cloudEnabled: boolean }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const configured = isAmplifyTestConfigured()

  const handleTest = async () => {
    setLoading(true)
    setMessage(null)
    setError(null)
    try {
      const result = await invokeAmplifyTest()
      if (!result.ok) {
        setError(result.error ?? 'Amplify test failed')
        Haptic.error()
        return
      }
      const parts = [
        result.email ?? result.userId ?? 'user',
        result.hasSettingsRow ? 'settings row found' : 'no settings row yet',
      ]
      setMessage(`${result.message ?? 'OK'} · ${parts.join(' · ')}`)
      Haptic.success()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Amplify test failed')
      Haptic.error()
    } finally {
      setLoading(false)
    }
  }

  return (
    <SectionCard title="Amplify">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <Server className="w-5 h-5 text-neon-orange shrink-0 mt-0.5" />
          <div>
            <p className="font-sans text-sm font-bold text-foreground">Server test</p>
            <p className="font-mono text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Calls an AWS Amplify Lambda with your Supabase session. The function identifies you
              and reads the database with the secret key.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTest}
          disabled={loading || !cloudEnabled || !configured}
          data-haptic="selection"
          className="w-full min-h-[44px] rounded-lg border border-neon-orange/40 bg-neon-orange/10 font-mono text-xs font-bold tracking-widest uppercase text-neon-orange hover:bg-neon-orange/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Test
        </button>

        {!cloudEnabled && (
          <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
            Sign in with Supabase to run the Amplify test.
          </p>
        )}

        {cloudEnabled && !configured && (
          <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
            Deploy or run <span className="text-foreground">npx ampx sandbox</span> so{' '}
            <span className="text-foreground">amplify_outputs.json</span> includes the function URL.
          </p>
        )}

        {error && <p className="font-mono text-xs text-neon-red">{error}</p>}
        {message && <p className="font-mono text-xs text-neon-yellow">{message}</p>}
      </div>
    </SectionCard>
  )
}

function BackupSection({
  gymDays,
  runs,
  cloudEnabled,
  userId,
  onRestoredSettings,
  onLocalLogsChanged,
}: {
  gymDays: number
  runs: number
  cloudEnabled: boolean
  userId: string | null
  onRestoredSettings: (settings: AppSettings) => void
  onLocalLogsChanged: () => void
}) {
  const [message, setMessage] = useState<string | null>(null)
  const [cloudBackups, setCloudBackups] = useState<CloudBackupSummary[]>([])
  const [cloudLoading, setCloudLoading] = useState(false)
  const [cloudBusy, setCloudBusy] = useState(false)
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null)
  const [devices, setDevices] = useState<RemoteDeviceTrainingLog[]>([])
  const [devicesLoading, setDevicesLoading] = useState(false)
  const [confirmImportDeviceId, setConfirmImportDeviceId] = useState<string | null>(null)
  const currentDeviceId = useMemo(() => getDeviceId(), [])

  const otherDevices = useMemo(
    () => devices.filter((d) => !d.isCurrent),
    [devices],
  )

  const refreshCloud = useCallback(async () => {
    if (!cloudEnabled || !userId) {
      setCloudBackups([])
      setDevices([])
      return
    }
    setCloudLoading(true)
    setDevicesLoading(true)
    try {
      const [backups, deviceLogs] = await Promise.all([
        listCloudBackups(userId),
        listAccountTrainingLogDevices(userId),
      ])
      setCloudBackups(backups)
      setDevices(deviceLogs)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load cloud data')
    } finally {
      setCloudLoading(false)
      setDevicesLoading(false)
    }
  }, [cloudEnabled, userId])

  useEffect(() => {
    refreshCloud()
  }, [refreshCloud])

  const handleDownload = () => {
    const { gymDays: days, runs: runCount, metrics } = downloadTrainingLogsBackup()
    const parts = [
      days === 1 ? '1 workout day' : `${days} workout days`,
      runCount === 1 ? '1 run' : `${runCount} runs`,
      metrics === 1 ? '1 metric entry' : `${metrics} metric entries`,
      'settings',
    ]
    setMessage(`Downloaded backup (${parts.join(', ')}).`)
    Haptic.success()
  }

  const handleUpload = async () => {
    if (!userId) return
    setCloudBusy(true)
    setMessage(null)
    try {
      const saved = await uploadCloudBackup(userId)
      setCloudBackups((prev) => [saved, ...prev])
      setMessage(`Uploaded cloud backup (${saved.gymDays} days · ${saved.runs} runs).`)
      Haptic.success()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Cloud upload failed')
      Haptic.error()
    } finally {
      setCloudBusy(false)
    }
  }

  const handleRestore = async (backupId: string) => {
    if (!userId) return
    setCloudBusy(true)
    setMessage(null)
    try {
      const payload = await fetchCloudBackup(userId, backupId)
      const result = restoreTrainingBackupLocally(payload, userId)
      onRestoredSettings(result.settings)
      setConfirmRestoreId(null)
      setMessage(
        `Restored backup (${result.gymDays} days · ${result.runs} runs · ${result.metrics} metrics).`,
      )
      Haptic.success()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Restore failed')
      Haptic.error()
    } finally {
      setCloudBusy(false)
    }
  }

  const handleDeleteCloud = async (backupId: string) => {
    if (!userId) return
    setCloudBusy(true)
    try {
      await deleteCloudBackup(userId, backupId)
      setCloudBackups((prev) => prev.filter((b) => b.id !== backupId))
      if (confirmRestoreId === backupId) setConfirmRestoreId(null)
      Haptic.warning()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Delete failed')
      Haptic.error()
    } finally {
      setCloudBusy(false)
    }
  }

  const handleImportDevice = async (sourceDeviceId: string) => {
    if (!userId) return
    setCloudBusy(true)
    setMessage(null)
    try {
      const result = await importTrainingLogFromDevice(userId, sourceDeviceId)
      onLocalLogsChanged()
      setConfirmImportDeviceId(null)
      await refreshCloud()
      setMessage(
        `Imported & merged from ${shortDeviceId(sourceDeviceId)} (${result.gymDays} days · ${result.runs} runs · ${result.metrics} metrics).`,
      )
      Haptic.success()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Import failed')
      Haptic.error()
    } finally {
      setCloudBusy(false)
    }
  }

  return (
    <SectionCard title="Backup">
      <div className="space-y-4">
        <p className="font-mono text-xs text-muted-foreground leading-relaxed">
          Save workout history, runs, body metrics, and app settings as a JSON file. Use this to keep
          a local copy of your training data.
        </p>

        <button
          type="button"
          onClick={handleDownload}
          data-haptic="selection"
          className="w-full min-h-[44px] rounded-lg border border-neon-orange/40 bg-neon-orange/10 font-mono text-xs font-bold tracking-widest uppercase text-neon-orange hover:bg-neon-orange/20 transition-colors flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download training logs
        </button>

        <p className="font-mono text-[10px] text-muted-foreground">
          {gymDays === 0 && runs === 0
            ? 'No logs yet — download will still produce an empty backup file.'
            : `${gymDays} workout ${gymDays === 1 ? 'day' : 'days'} · ${runs} ${runs === 1 ? 'run' : 'runs'} included`}
        </p>

        {cloudEnabled && (
          <div className="pt-3 border-t border-border/50 space-y-3">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-neon-orange" />
              <p className="font-mono text-[10px] uppercase tracking-wider text-neon-orange">
                Cloud backups · this device + account
              </p>
            </div>

            <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
              Snapshot backups stay private to your signed-in account on this device. Live training
              logs sync per device — import from another device below if needed.
            </p>

            <p className="font-mono text-[10px] text-muted-foreground">
              This device · <span className="text-foreground">{shortDeviceId(currentDeviceId)}</span>
            </p>

            <button
              type="button"
              onClick={handleUpload}
              disabled={cloudBusy}
              data-haptic="selection"
              className="w-full min-h-[44px] rounded-lg border border-border font-mono text-xs font-bold tracking-widest uppercase text-foreground hover:border-neon-orange/40 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {cloudBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload current data
            </button>

            {cloudLoading ? (
              <p className="font-mono text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading cloud backups…
              </p>
            ) : cloudBackups.length === 0 ? (
              <p className="font-mono text-xs text-muted-foreground">No cloud backups yet.</p>
            ) : (
              <div className="space-y-2">
                {cloudBackups.map((backup) => (
                  <div
                    key={backup.id}
                    className="rounded-lg border border-border bg-card/30 p-3 space-y-2"
                  >
                    <div>
                      <p className="font-mono text-xs text-foreground">
                        {backup.label ?? 'Backup'}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                        {format(new Date(backup.createdAt), 'MMM d yyyy · h:mm a')} ·{' '}
                        {backup.gymDays} days · {backup.runs} runs
                      </p>
                    </div>

                    {confirmRestoreId === backup.id ? (
                      <ConfirmRow
                        label="Restore this backup over local data?"
                        onConfirm={() => handleRestore(backup.id)}
                        onCancel={() => setConfirmRestoreId(null)}
                      />
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={cloudBusy}
                          onClick={() => setConfirmRestoreId(backup.id)}
                          data-haptic="warning"
                          className="flex-1 min-h-[36px] rounded-md border border-neon-orange/40 font-mono text-[10px] uppercase tracking-wider text-neon-orange"
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          disabled={cloudBusy}
                          onClick={() => handleDeleteCloud(backup.id)}
                          data-haptic="warning"
                          className="min-h-[36px] px-3 rounded-md border border-neon-red/30 font-mono text-[10px] uppercase tracking-wider text-neon-red"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-border/50 space-y-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-neon-yellow" />
                <p className="font-mono text-[10px] uppercase tracking-wider text-neon-yellow">
                  Import from another device
                </p>
              </div>

              <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
                Pull gym, run, and metrics logs from another device on this account and merge them
                into this device. Newer entries win on conflict.
              </p>

              {devicesLoading ? (
                <p className="font-mono text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading devices…
                </p>
              ) : otherDevices.length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground">
                  No other devices with training logs on this account yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {otherDevices.map((device) => (
                    <div
                      key={device.deviceId}
                      className="rounded-lg border border-border bg-card/30 p-3 space-y-2"
                    >
                      <div>
                        <p className="font-mono text-xs text-foreground" title={device.deviceId}>
                          {shortDeviceId(device.deviceId)}
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                          Updated {format(new Date(device.updatedAt), 'MMM d yyyy · h:mm a')} ·{' '}
                          {device.gymDays} days · {device.runs} runs · {device.metrics} metrics
                        </p>
                      </div>

                      {confirmImportDeviceId === device.deviceId ? (
                        <ConfirmRow
                          label="Merge this device’s logs into this device?"
                          onConfirm={() => handleImportDevice(device.deviceId)}
                          onCancel={() => setConfirmImportDeviceId(null)}
                        />
                      ) : (
                        <button
                          type="button"
                          disabled={cloudBusy}
                          onClick={() => setConfirmImportDeviceId(device.deviceId)}
                          data-haptic="selection"
                          className="w-full min-h-[36px] rounded-md border border-neon-yellow/40 font-mono text-[10px] uppercase tracking-wider text-neon-yellow hover:bg-neon-yellow/10 transition-colors disabled:opacity-50"
                        >
                          Import & merge
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!cloudEnabled && (
          <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
            Sign in with Supabase to upload and restore cloud backups, and import training logs from
            your other devices.
          </p>
        )}

        {message && <p className="font-mono text-xs text-neon-yellow">{message}</p>}
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
          {entries.map(({ date, log }) => (
            <WorkoutHistoryEntry
              key={date}
              date={date}
              log={log}
              isExpanded={expandedDate === date}
              onToggleExpand={onToggleExpand}
              onDelete={onDelete}
              onChangeWorkout={onChangeWorkout}
            />
          ))}
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

function WorkoutHistoryEntry({
  date,
  log,
  isExpanded,
  onToggleExpand,
  onDelete,
  onChangeWorkout,
}: {
  date: string
  log: GymStore[string]
  isExpanded: boolean
  onToggleExpand: (date: string) => void
  onDelete: (date: string) => void
  onChangeWorkout: (date: string, key: WorkoutKey) => void
}) {
  // Resolve the program the log was actually recorded against, so renamed or
  // removed workouts still display the name they had at the time.
  const { program: resolvedProgram } = useLoggedProgram(log)
  const status = getDayStatus(log)
  const completed = Object.values(log.exercises).filter((e) => e.completed).length
  const total = Object.keys(log.exercises).length

  return (
    <div
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
            {getWorkoutLogLabel(log, resolvedProgram)}
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
              {getSelectableWorkoutKeys().map((key) => (
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
                  {getWorkoutLabel(key)}
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
}

function RunHistorySection({
  runs,
  expandedRunId,
  confirmClear,
  onToggleExpand,
  onDelete,
  onConfirmClear,
  onRemoveOlderThan,
  onClearAll,
}: {
  runs: RunSessionLog[]
  expandedRunId: string | null
  confirmClear: '30d' | 'all' | null
  onToggleExpand: (id: string) => void
  onDelete: (id: string) => void
  onConfirmClear: (mode: '30d' | 'all' | null) => void
  onRemoveOlderThan: (days: number) => void
  onClearAll: () => void
}) {
  return (
    <SectionCard title="Run history">
      <p className="font-mono text-xs text-muted-foreground mb-4 leading-relaxed">
        View or remove completed run sessions. Deleting a run removes it from Home and the training
        log.
      </p>

      {runs.length === 0 ? (
        <p className="font-mono text-xs text-muted-foreground text-center py-6">
          No runs logged yet.
        </p>
      ) : (
        <div className="space-y-2 mb-4">
          {runs.map((run) => {
            const isExpanded = expandedRunId === run.id
            const total = getRunTotalMinutes(run.plan)

            return (
              <div
                key={run.id}
                className={cn(
                  'border rounded-lg transition-colors',
                  isExpanded ? 'border-neon-yellow/40 bg-neon-yellow/5' : 'border-border bg-card/30',
                )}
              >
                <button
                  onClick={() => onToggleExpand(run.id)}
                  data-haptic="selection"
                  className="w-full flex items-center justify-between gap-3 p-3 min-h-[52px] text-left"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <Footprints className="w-4 h-4 text-neon-yellow shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="font-sans text-sm font-bold text-foreground">
                        {format(parseISO(run.date + 'T12:00:00'), 'EEE, MMM d yyyy')}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground mt-0.5 truncate">
                        {formatPlanSummary(run.plan)} · {total} min ·{' '}
                        {format(new Date(run.completedAt), 'h:mm a')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[10px] uppercase px-2 py-0.5 rounded bg-neon-yellow/10 text-neon-yellow">
                      Run
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg border border-border/60 bg-background/40 px-2 py-2 text-center">
                        <div className="font-sans text-sm font-bold text-foreground">
                          {run.plan.warmupMinutes}m
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground uppercase">
                          Warmup
                        </div>
                      </div>
                      <div className="rounded-lg border border-neon-yellow/30 bg-neon-yellow/5 px-2 py-2 text-center">
                        <div className="font-sans text-sm font-bold text-neon-yellow">
                          {run.plan.runMinutes}m
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground uppercase">
                          Run
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-background/40 px-2 py-2 text-center">
                        <div className="font-sans text-sm font-bold text-foreground">
                          {run.plan.cooldownMinutes}m
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground uppercase">
                          Cooldown
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onDelete(run.id)}
                      data-haptic="warning"
                      className="w-full min-h-[40px] rounded-lg border border-neon-red/30 font-mono text-xs tracking-wider uppercase text-neon-red hover:bg-neon-red/10 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove this run
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {runs.length > 0 && (
        <div className="pt-3 border-t border-border/50 space-y-2">
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
            Bulk actions
          </p>

          {confirmClear === '30d' ? (
            <ConfirmRow
              label="Remove runs older than 30 days?"
              onConfirm={() => onRemoveOlderThan(30)}
              onCancel={() => onConfirmClear(null)}
            />
          ) : confirmClear === 'all' ? (
            <ConfirmRow
              label="Delete all run history?"
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
                Remove runs older than 30 days
              </button>
              <button
                onClick={() => onConfirmClear('all')}
                data-haptic="warning"
                className="w-full min-h-[40px] rounded-lg border border-neon-red/30 font-mono text-xs text-neon-red hover:bg-neon-red/10 transition-colors"
              >
                Clear all run history
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

interface ProgramSectionProps {
  programName: string
  programVersion: string
  workoutCount: number
}

function ProgramSection({ programName, programVersion, workoutCount }: ProgramSectionProps) {
  return (
    <SectionCard title="Program">
      <div>
        <p className="font-sans text-lg font-bold text-foreground mb-1">{programName}</p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground">
            Version {programVersion}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="font-mono text-xs text-muted-foreground">
            {workoutCount} workout{workoutCount !== 1 ? 's' : ''}
          </span>
        </div>
        <p className="font-mono text-xs text-muted-foreground mt-3 leading-relaxed">
          To edit workouts, go to Training log → Explore → Edit.
        </p>
      </div>
    </SectionCard>
  )
}

function TrainingSection({
  autoStartRestTimer,
  restTimerMinutes,
  onAutoStartRestTimer,
  onRestTimerMinutes,
}: {
  autoStartRestTimer: boolean
  restTimerMinutes: number
  onAutoStartRestTimer: (enabled: boolean) => void
  onRestTimerMinutes: (minutes: number) => void
}) {
  const handleMinutesChange = (raw: string) => {
    const parsed = Number.parseFloat(raw)
    if (!Number.isFinite(parsed)) return
    onRestTimerMinutes(parsed)
  }

  return (
    <SectionCard title="Training">
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Timer className="w-5 h-5 text-neon-orange shrink-0 mt-0.5" />
            <div>
              <p className="font-sans text-sm font-bold text-foreground">
                Auto-start rest timer between sets
              </p>
              <p className="font-mono text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Starts the rest timer automatically after you finish logging a set.
              </p>
            </div>
          </div>
          <Switch
            checked={autoStartRestTimer}
            onCheckedChange={(checked) => {
              onAutoStartRestTimer(checked)
              Haptic.selection()
            }}
            aria-label="Auto-start rest timer between sets"
          />
        </div>

        <div
          className={cn(
            'space-y-2 transition-opacity',
            !autoStartRestTimer && 'opacity-50 pointer-events-none',
          )}
        >
          <label htmlFor="rest-timer-minutes" className="font-mono text-xs text-muted-foreground">
            Rest duration (minutes)
          </label>
          <input
            id="rest-timer-minutes"
            type="number"
            inputMode="decimal"
            min={0.5}
            max={10}
            step={0.5}
            value={restTimerMinutes}
            onChange={(e) => handleMinutesChange(e.target.value)}
            disabled={!autoStartRestTimer}
            className={cn(
              'w-full h-11 bg-input/60 border border-border rounded-md px-3',
              'font-mono text-base text-foreground',
              'focus:outline-none focus:border-neon-orange/60 focus:ring-1 focus:ring-neon-orange/30',
              'transition-colors disabled:cursor-not-allowed',
            )}
          />
          <p className="font-mono text-[10px] text-muted-foreground">
            Between 0.5 and 10 minutes. The timer does not start after the final set.
          </p>
        </div>
      </div>
    </SectionCard>
  )
}
