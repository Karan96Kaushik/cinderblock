import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  applySettings,
  clampRestTimerMinutes,
  DEFAULT_SETTINGS,
  readSettings,
  writeSettings,
  type AppSettings,
  type FontPresetKey,
  type FontSizeKey,
  type ThemePresetKey,
} from '@/lib/settings'

type SettingsContextValue = {
  settings: AppSettings
  setFontSize: (size: FontSizeKey) => void
  setFontPreset: (preset: FontPresetKey) => void
  setTheme: (theme: ThemePresetKey) => void
  setAlwaysAwake: (enabled: boolean) => void
  setAutoStartRestTimer: (enabled: boolean) => void
  setRestTimerMinutes: (minutes: number) => void
  replaceSettings: (next: AppSettings) => void
  resetSettings: () => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => readSettings())
  const silentWrite = useRef(false)

  useEffect(() => {
    applySettings(settings)
    writeSettings(settings, { silent: silentWrite.current })
    silentWrite.current = false
  }, [settings])

  const setFontSize = useCallback((fontSize: FontSizeKey) => {
    setSettings((prev) => ({ ...prev, fontSize }))
  }, [])

  const setFontPreset = useCallback((fontPreset: FontPresetKey) => {
    setSettings((prev) => ({ ...prev, fontPreset }))
  }, [])

  const setTheme = useCallback((theme: ThemePresetKey) => {
    setSettings((prev) => ({ ...prev, theme }))
  }, [])

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
  }, [])

  const setAlwaysAwake = useCallback((alwaysAwake: boolean) => {
    setSettings((prev) => ({ ...prev, alwaysAwake }))
  }, [])

  const setAutoStartRestTimer = useCallback((autoStartRestTimer: boolean) => {
    setSettings((prev) => ({ ...prev, autoStartRestTimer }))
  }, [])

  const setRestTimerMinutes = useCallback((restTimerMinutes: number) => {
    setSettings((prev) => ({ ...prev, restTimerMinutes: clampRestTimerMinutes(restTimerMinutes) }))
  }, [])

  const replaceSettings = useCallback((next: AppSettings) => {
    // Hydrate from server — don't echo a cloud push for this write
    silentWrite.current = true
    setSettings(next)
  }, [])

  const value = useMemo(
    () => ({
      settings,
      setFontSize,
      setFontPreset,
      setTheme,
      setAlwaysAwake,
      setAutoStartRestTimer,
      setRestTimerMinutes,
      replaceSettings,
      resetSettings,
    }),
    [
      settings,
      setFontSize,
      setFontPreset,
      setTheme,
      setAlwaysAwake,
      setAutoStartRestTimer,
      setRestTimerMinutes,
      replaceSettings,
      resetSettings,
    ],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider')
  }
  return ctx
}
