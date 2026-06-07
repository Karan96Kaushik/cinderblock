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
    description: 'Soft charcoal base · muted cream text · warm accents',
    mode: 'dark',
    swatch: ['oklch(0.15 0.038 45)', 'oklch(0.80 0.022 75)', 'oklch(0.70 0.15 55)'],
    tokens: {
      background: 'oklch(0.15 0.038 45)',
      foreground: 'oklch(0.80 0.022 75)',
      card: 'oklch(0.18 0.04 42)',
      cardForeground: 'oklch(0.80 0.022 75)',
      popover: 'oklch(0.17 0.039 43)',
      popoverForeground: 'oklch(0.80 0.022 75)',
      primary: 'oklch(0.70 0.15 55)',
      primaryForeground: 'oklch(0.15 0.038 45)',
      secondary: 'oklch(0.21 0.038 42)',
      secondaryForeground: 'oklch(0.58 0.03 55)',
      muted: 'oklch(0.23 0.035 42)',
      mutedForeground: 'oklch(0.58 0.03 55)',
      accent: 'oklch(0.62 0.16 40)',
      accentForeground: 'oklch(0.15 0.038 45)',
      destructive: 'oklch(0.50 0.18 25)',
      destructiveForeground: 'oklch(0.82 0.02 75)',
      border: 'oklch(0.24 0.04 45)',
      input: 'oklch(0.19 0.038 42)',
      ring: 'oklch(0.70 0.15 55)',
      primaryText: 'oklch(0.80 0.022 75)',
      secondaryText: 'oklch(0.58 0.03 55)',
      accentText: 'oklch(0.70 0.15 55)',
      neonOrange: 'oklch(0.70 0.15 55)',
      neonRed: 'oklch(0.55 0.18 30)',
      neonYellow: 'oklch(0.76 0.12 80)',
      neonAmber: 'oklch(0.66 0.14 60)',
      gridColor: 'oklch(0.26 0.04 45)',
      themeColor: '#221a12',
      cyberVignette:
        'radial-gradient(ellipse at center, transparent 0%, oklch(0.08 0.03 45 / 0.9) 100%)',
      cyberGridOpacity: 0.5,
      cyberScanlineOpacity: 0.2,
    },
  },
  green: {
    label: 'Green',
    description: 'Soft forest base · muted mint text · jade accents',
    mode: 'dark',
    swatch: ['oklch(0.15 0.035 155)', 'oklch(0.80 0.022 155)', 'oklch(0.70 0.12 155)'],
    tokens: {
      background: 'oklch(0.15 0.035 155)',
      foreground: 'oklch(0.80 0.022 155)',
      card: 'oklch(0.18 0.038 155)',
      cardForeground: 'oklch(0.80 0.022 155)',
      popover: 'oklch(0.17 0.036 155)',
      popoverForeground: 'oklch(0.80 0.022 155)',
      primary: 'oklch(0.70 0.12 155)',
      primaryForeground: 'oklch(0.15 0.035 155)',
      secondary: 'oklch(0.21 0.035 155)',
      secondaryForeground: 'oklch(0.58 0.028 155)',
      muted: 'oklch(0.23 0.032 155)',
      mutedForeground: 'oklch(0.58 0.028 155)',
      accent: 'oklch(0.56 0.11 160)',
      accentForeground: 'oklch(0.15 0.035 155)',
      destructive: 'oklch(0.48 0.16 25)',
      destructiveForeground: 'oklch(0.82 0.02 155)',
      border: 'oklch(0.24 0.038 155)',
      input: 'oklch(0.19 0.035 155)',
      ring: 'oklch(0.70 0.12 155)',
      primaryText: 'oklch(0.80 0.022 155)',
      secondaryText: 'oklch(0.58 0.028 155)',
      accentText: 'oklch(0.70 0.12 155)',
      neonOrange: 'oklch(0.70 0.12 155)',
      neonRed: 'oklch(0.50 0.10 160)',
      neonYellow: 'oklch(0.74 0.11 130)',
      neonAmber: 'oklch(0.64 0.10 145)',
      gridColor: 'oklch(0.26 0.038 155)',
      themeColor: '#121c16',
      cyberVignette:
        'radial-gradient(ellipse at center, transparent 0%, oklch(0.08 0.03 155 / 0.9) 100%)',
      cyberGridOpacity: 0.5,
      cyberScanlineOpacity: 0.2,
    },
  },
  blue: {
    label: 'Blue',
    description: 'Soft navy base · muted cool text · sky accents',
    mode: 'dark',
    swatch: ['oklch(0.15 0.035 250)', 'oklch(0.80 0.018 250)', 'oklch(0.70 0.11 230)'],
    tokens: {
      background: 'oklch(0.15 0.035 250)',
      foreground: 'oklch(0.80 0.018 250)',
      card: 'oklch(0.18 0.032 250)',
      cardForeground: 'oklch(0.80 0.018 250)',
      popover: 'oklch(0.17 0.033 250)',
      popoverForeground: 'oklch(0.80 0.018 250)',
      primary: 'oklch(0.70 0.11 230)',
      primaryForeground: 'oklch(0.15 0.035 250)',
      secondary: 'oklch(0.21 0.028 250)',
      secondaryForeground: 'oklch(0.58 0.022 250)',
      muted: 'oklch(0.23 0.025 250)',
      mutedForeground: 'oklch(0.58 0.022 250)',
      accent: 'oklch(0.52 0.10 250)',
      accentForeground: 'oklch(0.15 0.035 250)',
      destructive: 'oklch(0.50 0.16 25)',
      destructiveForeground: 'oklch(0.82 0.018 250)',
      border: 'oklch(0.24 0.032 250)',
      input: 'oklch(0.19 0.028 250)',
      ring: 'oklch(0.70 0.11 230)',
      primaryText: 'oklch(0.80 0.018 250)',
      secondaryText: 'oklch(0.58 0.022 250)',
      accentText: 'oklch(0.70 0.11 230)',
      neonOrange: 'oklch(0.70 0.11 230)',
      neonRed: 'oklch(0.52 0.11 260)',
      neonYellow: 'oklch(0.74 0.08 220)',
      neonAmber: 'oklch(0.64 0.09 240)',
      gridColor: 'oklch(0.26 0.035 250)',
      themeColor: '#121820',
      cyberVignette:
        'radial-gradient(ellipse at center, transparent 0%, oklch(0.08 0.03 250 / 0.9) 100%)',
      cyberGridOpacity: 0.5,
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
      gridColor: 'oklch(0.78 0.022 260)',
      themeColor: '#fafafa',
      cyberVignette:
        'radial-gradient(ellipse at center, transparent 22%, oklch(0.16 0.025 260 / 0.58) 100%)',
      cyberGridOpacity: 0.32,
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
      gridColor: 'oklch(0.74 0.03 75)',
      themeColor: '#f5f0e8',
      cyberVignette:
        'radial-gradient(ellipse at center, transparent 22%, oklch(0.20 0.035 55 / 0.52) 100%)',
      cyberGridOpacity: 0.34,
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
