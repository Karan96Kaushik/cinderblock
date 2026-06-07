import { applyTheme, normalizeThemeKey, type ThemePresetKey } from './themes'

export type FontSizeKey = 'sm' | 'md' | 'lg' | 'xl'

export type FontPresetKey = 'cinderblock' | 'readable' | 'mono'

export type { ThemePresetKey }
export { THEME_PRESETS, DARK_THEMES, LIGHT_THEMES, normalizeThemeKey } from './themes'

export type AppSettings = {
  fontSize: FontSizeKey
  fontPreset: FontPresetKey
  theme: ThemePresetKey
  alwaysAwake: boolean
}

export const STORAGE_KEY = 'cinderblock_settings'

export const FONT_SIZES: Record<FontSizeKey, { label: string; scale: number }> = {
  sm: { label: 'Small', scale: 0.875 },
  md: { label: 'Medium', scale: 1 },
  lg: { label: 'Large', scale: 1.125 },
  xl: { label: 'Extra large', scale: 1.25 },
}

export const FONT_PRESETS: Record<
  FontPresetKey,
  { label: string; description: string; sans: string; mono: string }
> = {
  cinderblock: {
    label: 'Cinderblock',
    description: 'Orbitron headings · Share Tech Mono body',
    sans: "'Orbitron', sans-serif",
    mono: "'Share Tech Mono', monospace",
  },
  readable: {
    label: 'Readable',
    description: 'System UI fonts for easier reading',
    sans: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    mono: "ui-monospace, 'SF Mono', Menlo, monospace",
  },
  mono: {
    label: 'All mono',
    description: 'Share Tech Mono everywhere',
    sans: "'Share Tech Mono', monospace",
    mono: "'Share Tech Mono', monospace",
  },
}

const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 'md',
  fontPreset: 'cinderblock',
  theme: 'orange',
  alwaysAwake: true,
}

export function readSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return {
      fontSize: parsed.fontSize && parsed.fontSize in FONT_SIZES ? parsed.fontSize : 'md',
      fontPreset:
        parsed.fontPreset && parsed.fontPreset in FONT_PRESETS ? parsed.fontPreset : 'cinderblock',
      theme: normalizeThemeKey(parsed.theme),
      alwaysAwake: typeof parsed.alwaysAwake === 'boolean' ? parsed.alwaysAwake : true,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function writeSettings(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function applySettings(settings: AppSettings) {
  const root = document.documentElement
  const preset = FONT_PRESETS[settings.fontPreset]
  const scale = FONT_SIZES[settings.fontSize].scale

  applyTheme(settings.theme)

  root.style.setProperty('--font-orbitron', preset.sans)
  root.style.setProperty('--font-share-tech', preset.mono)
  root.style.setProperty('--app-font-scale', String(scale))
  root.dataset.fontPreset = settings.fontPreset
  root.dataset.fontSize = settings.fontSize
}
