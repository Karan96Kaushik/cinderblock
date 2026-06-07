import { useEffect, useRef } from 'react'

export function useWakeLock(active: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!active) {
      lockRef.current?.release().catch(() => undefined)
      lockRef.current = null
      return
    }

    if (!('wakeLock' in navigator)) return

    let cancelled = false

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (cancelled) {
          await lock.release()
          return
        }
        lockRef.current?.release().catch(() => undefined)
        lockRef.current = lock
      } catch {
        // Wake lock may be denied or unavailable
      }
    }

    void acquire()

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && active) {
        void acquire()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      lockRef.current?.release().catch(() => undefined)
      lockRef.current = null
    }
  }, [active])
}
