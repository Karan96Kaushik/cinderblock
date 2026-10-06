const INSTALLED = '__cinderblockIOSInputZoom'

const TEXT_FIELD =
  'input:not([type="button"]):not([type="checkbox"]):not([type="color"]):not([type="file"]):not([type="hidden"]):not([type="image"]):not([type="radio"]):not([type="range"]):not([type="reset"]):not([type="submit"]), textarea, select'

function isIOS(): boolean {
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return true
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

function isTextField(target: EventTarget | null): boolean {
  return target instanceof Element && target.matches(TEXT_FIELD)
}

/**
 * Standalone iOS PWAs keep the input-focus zoom after blur. If focusing a
 * field increased the visual scale, snap back once focus has left every field.
 */
export function installIOSInputZoomReset() {
  const flagHost = window as Window & { [INSTALLED]?: boolean }
  if (flagHost[INSTALLED] || !isIOS()) return
  flagHost[INSTALLED] = true

  const meta = document.querySelector('meta[name="viewport"]')
  if (!meta) return

  const base = meta.getAttribute('content') ?? 'width=device-width, initial-scale=1'
  let scaleBeforeFocus = window.visualViewport?.scale ?? 1
  let resetTimer = 0

  // Capture scale before focus. iOS applies the zoom as the field receives focus,
  // so focusin can already observe the enlarged scale.
  document.addEventListener(
    'pointerdown',
    (event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (!isTextField(target) && !target.closest(TEXT_FIELD)) return
      scaleBeforeFocus = window.visualViewport?.scale ?? 1
    },
    true,
  )

  document.addEventListener('focusout', () => {
    window.clearTimeout(resetTimer)
    resetTimer = window.setTimeout(() => {
      if (document.activeElement && isTextField(document.activeElement)) return
      const scale = window.visualViewport?.scale ?? 1
      if (scale <= scaleBeforeFocus + 0.01) return

      meta.setAttribute('content', `${base}, maximum-scale=1`)
      window.setTimeout(() => {
        meta.setAttribute('content', base)
      }, 100)
    }, 50)
  })
}
