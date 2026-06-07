export type GymView = 'calendar' | 'select' | 'workout'
export type RunningView = 'plan' | 'session'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isValidDateParam(date: string): boolean {
  return DATE_PATTERN.test(date)
}

export const paths = {
  home: () => '/',
  gym: (opts?: { date?: string; view?: GymView }) => {
    if (!opts?.date) return '/gym'
    if (!opts.view || opts.view === 'calendar') return `/gym/${opts.date}`
    if (opts.view === 'select') return `/gym/${opts.date}/select`
    return `/gym/${opts.date}/workout`
  },
  running: (view: RunningView = 'plan') =>
    view === 'session' ? '/running/session' : '/running',
  metrics: () => '/metrics',
  settings: () => '/settings',
}

export function parseGymPath(pathname: string): {
  date?: string
  view: GymView
} {
  const match = pathname.match(/^\/gym(?:\/(\d{4}-\d{2}-\d{2}))?(?:\/(select|workout))?\/?$/)
  if (!match) return { view: 'calendar' }

  const date = match[1]
  const segment = match[2]

  if (segment === 'select') return { date, view: 'select' }
  if (segment === 'workout') return { date, view: 'workout' }
  return { date, view: 'calendar' }
}

export function parseRunningPath(pathname: string): RunningView {
  return pathname.startsWith('/running/session') ? 'session' : 'plan'
}
