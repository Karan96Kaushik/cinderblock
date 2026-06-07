export type HapticType = 'tap' | 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection'

const PATTERNS: Record<HapticType, number | number[]> = {
  tap: 10,
  light: 12,
  medium: 22,
  heavy: 40,
  success: [12, 40, 18],
  warning: [20, 30, 20],
  error: [40, 40, 40],
  selection: 8,
}

const MIN_INTERVAL_MS = 45
let lastVibrateAt = 0

export function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

function vibrate(type: HapticType) {
  if (!canVibrate()) return

  const now = Date.now()
  if (now - lastVibrateAt < MIN_INTERVAL_MS) return
  lastVibrateAt = now

  navigator.vibrate(PATTERNS[type])
}

export const Haptic = {
  tap: () => vibrate('tap'),
  light: () => vibrate('light'),
  medium: () => vibrate('medium'),
  heavy: () => vibrate('heavy'),
  success: () => vibrate('success'),
  warning: () => vibrate('warning'),
  error: () => vibrate('error'),
  selection: () => vibrate('selection'),
  trigger: (type: HapticType) => vibrate(type),
}

const INTERACTIVE_SELECTOR = [
  'button:not(:disabled)',
  'a[href]',
  '[role="button"]:not([aria-disabled="true"])',
  'input[type="submit"]:not(:disabled)',
  'input[type="button"]:not(:disabled)',
  'input[type="checkbox"]:not(:disabled)',
  'input[type="radio"]:not(:disabled)',
  'select:not(:disabled)',
  '[data-haptic]',
].join(',')

const TEXT_INPUT_SELECTOR = [
  'input[type="text"]',
  'input[type="number"]',
  'input[type="email"]',
  'input[type="password"]',
  'input[type="search"]',
  'input[type="tel"]',
  'input[type="url"]',
  'input[type="date"]',
  'textarea',
].join(',')

function findInteractive(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null
  return target.closest(INTERACTIVE_SELECTOR) as HTMLElement | null
}

function resolveHapticType(element: HTMLElement): HapticType {
  const explicit = element.getAttribute('data-haptic')
  if (explicit && explicit in PATTERNS) {
    return explicit as HapticType
  }
  return 'tap'
}

function shouldTriggerHaptic(event: Event, element: HTMLElement): boolean {
  if (element.dataset.hapticOff === 'true') return false

  const textField = element.closest(TEXT_INPUT_SELECTOR)
  if (textField instanceof HTMLInputElement || textField instanceof HTMLTextAreaElement) {
    if (element === textField || element.contains(textField)) return false
  }

  if (event.type === 'keydown') {
    return event instanceof KeyboardEvent && (event.key === 'Enter' || event.key === ' ')
  }

  return true
}

export function initGlobalHaptics() {
  if (typeof document === 'undefined') return () => undefined

  const handle = (event: Event) => {
    const interactive = findInteractive(event.target)
    if (!interactive || !shouldTriggerHaptic(event, interactive)) return

    Haptic.trigger(resolveHapticType(interactive))
  }

  document.addEventListener('click', handle, true)
  document.addEventListener('keydown', handle, true)

  return () => {
    document.removeEventListener('click', handle, true)
    document.removeEventListener('keydown', handle, true)
  }
}

export function withHaptic<T extends (...args: never[]) => void>(
  handler: T | undefined,
  type: HapticType = 'tap',
): T | undefined {
  if (!handler) return undefined

  const wrapped = ((...args: Parameters<T>) => {
    Haptic.trigger(type)
    handler(...args)
  }) as T

  return wrapped
}
