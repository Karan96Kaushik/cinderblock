export type ThemePresetKey = 'orange' | 'green' | 'blue' | 'white' | 'cream'

/** @deprecated Legacy keys — mapped on load */
export type LegacyThemePresetKey = 'inferno' | 'ember' | 'forge' | 'ash' | 'daylight'

export type ThemeMode = 'dark' | 'light'

export type ThemeTokens = {
  background: string
  foreground: string
  card: string
  cardForeground: string
  popover: string
  popoverForeground: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  destructive: string
  destructiveForeground: string
  border: string
  input: string
  ring: string
  primaryText: string
  secondaryText: string
  accentText: string
  neonOrange: string
  neonRed: string
  neonYellow: string
  neonAmber: string
  gridColor: string
  themeColor: string
  cyberVignette: string
  cyberGridOpacity: number
  cyberScanlineOpacity: number
}

export type ThemePreset = {
  label: string
  description: string
  mode: ThemeMode
  swatch: [string, string, string]
  tokens: ThemeTokens
}

const LEGACY_THEME_MAP: Record<string, ThemePresetKey> = {
  inferno: 'orange',
  ember: 'green',
  forge: 'blue',
  ash: 'cream',
  daylight: 'white',
}

export function normalizeThemeKey(value: unknown): ThemePresetKey {
  if (typeof value !== 'string') return 'orange'
  if (value in THEME_PRESETS) return value as ThemePresetKey
  if (value in LEGACY_THEME_MAP) return LEGACY_THEME_MAP[value]
  return 'orange'
}

const SURFACE_VAR_MAP: Record<
  Exclude<
    keyof ThemeTokens,
    | 'primaryText'
    | 'secondaryText'
    | 'accentText'
    | 'themeColor'
    | 'cyberVignette'
    | 'cyberGridOpacity'
    | 'cyberScanlineOpacity'
  >,
  string
> = {
  background: '--background',
  foreground: '--foreground',
  card: '--card',
  cardForeground: '--card-foreground',
  popover: '--popover',
  popoverForeground: '--popover-foreground',
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  secondary: '--secondary',
  secondaryForeground: '--secondary-foreground',
  muted: '--muted',
  mutedForeground: '--muted-foreground',
  accent: '--accent',
  accentForeground: '--accent-foreground',
  destructive: '--destructive',
  destructiveForeground: '--destructive-foreground',
  border: '--border',
  input: '--input',
  ring: '--ring',
  neonOrange: '--neon-orange',
  neonRed: '--neon-red',
  neonYellow: '--neon-yellow',
  neonAmber: '--neon-amber',
  gridColor: '--grid-color',
}

const TEXT_VAR_MAP = {
  primaryText: '--text-primary',
  secondaryText: '--text-secondary',
  accentText: '--text-accent',
} as const

export const THEME_PRESETS: Record<ThemePresetKey, ThemePreset> = {
  orange: {
    label: 'Orange',
    description: 'Burnt charcoal base · warm cream text · fire accents',
    mode: 'dark',
    swatch: ['oklch(0.11 0.045 45)', 'oklch(0.96 0.02 85)', 'oklch(0.78 0.20 55)'],
    tokens: {
      background: 'oklch(0.11 0.045 45)',
      foreground: 'oklch(0.96 0.02 85)',
      card: 'oklch(0.15 0.05 42)',
      cardForeground: 'oklch(0.96 0.02 85)',
      popover: 'oklch(0.13 0.048 43)',
      popoverForeground: 'oklch(0.96 0.02 85)',
      primary: 'oklch(0.78 0.20 55)',
      primaryForeground: 'oklch(0.12 0.04 45)',
      secondary: 'oklch(0.18 0.05 42)',
      secondaryForeground: 'oklch(0.72 0.04 55)',
      muted: 'oklch(0.20 0.045 42)',
      mutedForeground: 'oklch(0.72 0.04 55)',
      accent: 'oklch(0.68 0.22 40)',
      accentForeground: 'oklch(0.12 0.04 45)',
      destructive: 'oklch(0.55 0.24 25)',
      destructiveForeground: 'oklch(0.98 0.01 85)',
      border: 'oklch(0.28 0.06 45)',
      input: 'oklch(0.16 0.05 42)',
      ring: 'oklch(0.78 0.20 55)',
      primaryText: 'oklch(0.96 0.02 85)',
      secondaryText: 'oklch(0.72 0.04 55)',
      accentText: 'oklch(0.78 0.20 55)',
      neonOrange: 'oklch(0.78 0.20 55)',
      neonRed: 'oklch(0.62 0.24 30)',
      neonYellow: 'oklch(0.88 0.16 85)',
      neonAmber: 'oklch(0.74 0.18 60)',
      gridColor: 'oklch(0.24 0.055 45)',
      themeColor: '#1a1208',
      cyberVignette:
        'radial-gradient(ellipse at center, transparent 0%, oklch(0.08 0.03 45 / 0.9) 100%)',
      cyberGridOpacity: 0.3,
      cyberScanlineOpacity: 0.2,
    },
  },
  green: {
    label: 'Green',
    description: 'Deep forest base · soft mint text · jade accents',
    mode: 'dark',
    swatch: ['oklch(0.11 0.04 155)', 'oklch(0.94 0.03 155)', 'oklch(0.76 0.15 155)'],
    tokens: {
      background: 'oklch(0.11 0.04 155)',
      foreground: 'oklch(0.94 0.03 155)',
      card: 'oklch(0.15 0.045 155)',
      cardForeground: 'oklch(0.94 0.03 155)',
      popover: 'oklch(0.13 0.042 155)',
      popoverForeground: 'oklch(0.94 0.03 155)',
      primary: 'oklch(0.76 0.15 155)',
      primaryForeground: 'oklch(0.12 0.04 155)',
      secondary: 'oklch(0.18 0.04 155)',
      secondaryForeground: 'oklch(0.70 0.04 155)',
      muted: 'oklch(0.20 0.038 155)',
      mutedForeground: 'oklch(0.70 0.04 155)',
      accent: 'oklch(0.62 0.14 160)',
      accentForeground: 'oklch(0.95 0.02 155)',
      destructive: 'oklch(0.52 0.20 25)',
      destructiveForeground: 'oklch(0.98 0.01 155)',
      border: 'oklch(0.26 0.05 155)',
      input: 'oklch(0.16 0.04 155)',
      ring: 'oklch(0.76 0.15 155)',
      primaryText: 'oklch(0.94 0.03 155)',
      secondaryText: 'oklch(0.70 0.04 155)',
      accentText: 'oklch(0.76 0.15 155)',
      neonOrange: 'oklch(0.76 0.15 155)',
      neonRed: 'oklch(0.55 0.12 160)',
      neonYellow: 'oklch(0.82 0.14 130)',
      neonAmber: 'oklch(0.72 0.13 145)',
      gridColor: 'oklch(0.22 0.045 155)',
      themeColor: '#0a1410',
      cyberVignette:
        'radial-gradient(ellipse at center, transparent 0%, oklch(0.08 0.03 155 / 0.9) 100%)',
      cyberGridOpacity: 0.3,
      cyberScanlineOpacity: 0.2,
    },
  },
  blue: {
    label: 'Blue',
    description: 'Midnight navy base · cool white text · sky accents',
    mode: 'dark',
    swatch: ['oklch(0.11 0.04 250)', 'oklch(0.95 0.02 250)', 'oklch(0.78 0.14 230)'],
    tokens: {
      background: 'oklch(0.11 0.04 250)',
      foreground: 'oklch(0.95 0.02 250)',
      card: 'oklch(0.15 0.035 250)',
      cardForeground: 'oklch(0.95 0.02 250)',
      popover: 'oklch(0.13 0.038 250)',
      popoverForeground: 'oklch(0.95 0.02 250)',
      primary: 'oklch(0.78 0.14 230)',
      primaryForeground: 'oklch(0.12 0.04 250)',
      secondary: 'oklch(0.18 0.03 250)',
      secondaryForeground: 'oklch(0.70 0.03 250)',
      muted: 'oklch(0.20 0.028 250)',
      mutedForeground: 'oklch(0.70 0.03 250)',
      accent: 'oklch(0.58 0.12 250)',
      accentForeground: 'oklch(0.96 0.02 250)',
      destructive: 'oklch(0.55 0.22 25)',
      destructiveForeground: 'oklch(0.98 0.01 250)',
      border: 'oklch(0.26 0.04 250)',
      input: 'oklch(0.16 0.032 250)',
      ring: 'oklch(0.78 0.14 230)',
      primaryText: 'oklch(0.95 0.02 250)',
      secondaryText: 'oklch(0.70 0.03 250)',
      accentText: 'oklch(0.78 0.14 230)',
      neonOrange: 'oklch(0.78 0.14 230)',
      neonRed: 'oklch(0.58 0.14 260)',
      neonYellow: 'oklch(0.85 0.10 220)',
      neonAmber: 'oklch(0.72 0.12 240)',
      gridColor: 'oklch(0.22 0.038 250)',
      themeColor: '#0a1018',
      cyberVignette:
        'radial-gradient(ellipse at center, transparent 0%, oklch(0.08 0.03 250 / 0.9) 100%)',
      cyberGridOpacity: 0.3,
      cyberScanlineOpacity: 0.2,
    },
  },
  white: {
    label: 'White',
    description: 'Clean white base · slate text · blue accents',
    mode: 'light',
    swatch: ['oklch(0.995 0.002 260)', 'oklch(0.22 0.02 260)', 'oklch(0.48 0.18 250)'],
    tokens: {
      background: 'oklch(0.995 0.002 260)',
      foreground: 'oklch(0.22 0.02 260)',
      card: 'oklch(0.98 0.004 260)',
      cardForeground: 'oklch(0.22 0.02 260)',
      popover: 'oklch(0.995 0.002 260)',
      popoverForeground: 'oklch(0.22 0.02 260)',
      primary: 'oklch(0.48 0.18 250)',
      primaryForeground: 'oklch(0.99 0.002 260)',
      secondary: 'oklch(0.94 0.008 260)',
      secondaryForeground: 'oklch(0.42 0.02 260)',
      muted: 'oklch(0.93 0.01 260)',
      mutedForeground: 'oklch(0.42 0.02 260)',
      accent: 'oklch(0.52 0.16 250)',
      accentForeground: 'oklch(0.99 0.002 260)',
      destructive: 'oklch(0.50 0.22 25)',
      destructiveForeground: 'oklch(0.99 0 0)',
      border: 'oklch(0.88 0.012 260)',
      input: 'oklch(0.96 0.008 260)',
      ring: 'oklch(0.48 0.18 250)',
      primaryText: 'oklch(0.22 0.02 260)',
      secondaryText: 'oklch(0.42 0.02 260)',
      accentText: 'oklch(0.48 0.18 250)',
      neonOrange: 'oklch(0.48 0.18 250)',
      neonRed: 'oklch(0.50 0.22 25)',
      neonYellow: 'oklch(0.65 0.14 250)',
      neonAmber: 'oklch(0.55 0.15 250)',
      gridColor: 'oklch(0.91 0.012 260)',
      themeColor: '#fafafa',
      cyberVignette:
        'radial-gradient(ellipse at center, transparent 22%, oklch(0.16 0.025 260 / 0.58) 100%)',
      cyberGridOpacity: 0.14,
      cyberScanlineOpacity: 0.1,
    },
  },
  cream: {
    label: 'Cream',
    description: 'Warm parchment base · brown text · amber accents',
    mode: 'light',
    swatch: ['oklch(0.97 0.018 80)', 'oklch(0.28 0.04 55)', 'oklch(0.52 0.18 55)'],
    tokens: {
      background: 'oklch(0.97 0.018 80)',
      foreground: 'oklch(0.28 0.04 55)',
      card: 'oklch(0.94 0.015 75)',
      cardForeground: 'oklch(0.28 0.04 55)',
      popover: 'oklch(0.975 0.016 80)',
      popoverForeground: 'oklch(0.28 0.04 55)',
      primary: 'oklch(0.52 0.18 55)',
      primaryForeground: 'oklch(0.98 0.01 80)',
      secondary: 'oklch(0.91 0.015 75)',
      secondaryForeground: 'oklch(0.46 0.03 55)',
      muted: 'oklch(0.90 0.018 75)',
      mutedForeground: 'oklch(0.46 0.03 55)',
      accent: 'oklch(0.48 0.16 45)',
      accentForeground: 'oklch(0.98 0.01 80)',
      destructive: 'oklch(0.48 0.22 25)',
      destructiveForeground: 'oklch(0.98 0 0)',
      border: 'oklch(0.84 0.025 70)',
      input: 'oklch(0.95 0.015 78)',
      ring: 'oklch(0.52 0.18 55)',
      primaryText: 'oklch(0.28 0.04 55)',
      secondaryText: 'oklch(0.46 0.03 55)',
      accentText: 'oklch(0.52 0.18 55)',
      neonOrange: 'oklch(0.52 0.18 55)',
      neonRed: 'oklch(0.48 0.22 30)',
      neonYellow: 'oklch(0.68 0.16 80)',
      neonAmber: 'oklch(0.58 0.17 65)',
      gridColor: 'oklch(0.88 0.022 75)',
      themeColor: '#f5f0e8',
      cyberVignette:
        'radial-gradient(ellipse at center, transparent 22%, oklch(0.20 0.035 55 / 0.52) 100%)',
      cyberGridOpacity: 0.16,
      cyberScanlineOpacity: 0.1,
    },
  },
}

export const DARK_THEMES: ThemePresetKey[] = ['orange', 'green', 'blue']
export const LIGHT_THEMES: ThemePresetKey[] = ['white', 'cream']

function syncTextSemanticVars(root: HTMLElement, tokens: ThemeTokens) {
  for (const [key, cssVar] of Object.entries(TEXT_VAR_MAP)) {
    root.style.setProperty(cssVar, tokens[key as keyof typeof TEXT_VAR_MAP])
  }

  root.style.setProperty('--foreground', tokens.primaryText)
  root.style.setProperty('--muted-foreground', tokens.secondaryText)
  root.style.setProperty('--card-foreground', tokens.primaryText)
  root.style.setProperty('--popover-foreground', tokens.primaryText)
  root.style.setProperty('--secondary-foreground', tokens.secondaryText)
  root.style.setProperty('--primary', tokens.accentText)
  root.style.setProperty('--neon-orange', tokens.accentText)
}

export function applyTheme(themeKey: ThemePresetKey) {
  const preset = THEME_PRESETS[themeKey]
  const root = document.documentElement
  const { tokens } = preset

  for (const [key, cssVar] of Object.entries(SURFACE_VAR_MAP)) {
    const value = tokens[key as keyof typeof SURFACE_VAR_MAP]
    root.style.setProperty(cssVar, value)
  }

  syncTextSemanticVars(root, tokens)

  root.style.setProperty('--cyber-vignette', tokens.cyberVignette)
  root.style.setProperty('--cyber-grid-opacity', String(tokens.cyberGridOpacity))
  root.style.setProperty('--cyber-scanline-opacity', String(tokens.cyberScanlineOpacity))

  root.style.colorScheme = preset.mode
  root.dataset.theme = themeKey
  root.dataset.themeMode = preset.mode

  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', tokens.themeColor)
  }
}

export function isValidThemeKey(value: unknown): value is ThemePresetKey {
  return typeof value === 'string' && value in THEME_PRESETS
}
