import { useLayoutEffect, type RefObject } from 'react'

export function usePreventPullToRefresh(
  containerRef: RefObject<HTMLElement | null>,
  /** Re-bind when the scroll container changes (e.g. carousel slide switch) */
  bindKey?: unknown,
) {
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    let startY = 0
    const previousBodyOverscroll = document.body.style.overscrollBehaviorY
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehaviorY

    document.body.style.overscrollBehaviorY = 'none'
    document.documentElement.style.overscrollBehaviorY = 'none'
    container.style.overscrollBehaviorY = 'none'

    const onTouchStart = (event: TouchEvent) => {
      startY = event.touches[0]?.clientY ?? 0
    }

    const onTouchMove = (event: TouchEvent) => {
      const currentY = event.touches[0]?.clientY ?? 0
      const pullingDown = currentY - startY > 0
      const atTop = container.scrollTop <= 0

      if (atTop && pullingDown) {
        event.preventDefault()
      }
    }

    container.addEventListener('touchstart', onTouchStart, { passive: true })
    container.addEventListener('touchmove', onTouchMove, { passive: false })

    return () => {
      document.body.style.overscrollBehaviorY = previousBodyOverscroll
      document.documentElement.style.overscrollBehaviorY = previousHtmlOverscroll
      container.style.overscrollBehaviorY = ''
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove', onTouchMove)
    }
  }, [containerRef, bindKey])
}
