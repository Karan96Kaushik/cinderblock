import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  applySettings,
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
  replaceSettings: (next: AppSettings) => void
  resetSettings: () => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => readSettings())

  useEffect(() => {
    applySettings(settings)
    writeSettings(settings)
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
    setSettings({ fontSize: 'md', fontPreset: 'cinderblock', theme: 'orange', alwaysAwake: true })
  }, [])

  const setAlwaysAwake = useCallback((alwaysAwake: boolean) => {
    setSettings((prev) => ({ ...prev, alwaysAwake }))
  }, [])

  const replaceSettings = useCallback((next: AppSettings) => {
    setSettings(next)
  }, [])

  const value = useMemo(
    () => ({
      settings,
      setFontSize,
      setFontPreset,
      setTheme,
      setAlwaysAwake,
      replaceSettings,
      resetSettings,
    }),
    [
      settings,
      setFontSize,
      setFontPreset,
      setTheme,
      setAlwaysAwake,
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
