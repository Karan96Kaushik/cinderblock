import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  isExternalMediaSessionPlaying,
  isInPageMediaPlaying,
} from '@/lib/media-session'

/** Tracks background music (in-page or system) for showing skip controls. */
export function useDeviceMusicPlaying(): boolean {
  const externalMusicRef = useRef(false)
  const [playing, setPlaying] = useState(false)

  const sync = useCallback(() => {
    if (isInPageMediaPlaying()) {
      setPlaying(true)
      return
    }
    if (isExternalMediaSessionPlaying()) {
      externalMusicRef.current = true
      setPlaying(true)
      return
    }
    setPlaying(externalMusicRef.current)
  }, [])

  useLayoutEffect(() => {
    if (isExternalMediaSessionPlaying()) {
      externalMusicRef.current = true
    }
    sync()
  }, [sync])

  useEffect(() => {
    const onMediaEvent = () => sync()
    document.addEventListener('play', onMediaEvent, true)
    document.addEventListener('pause', onMediaEvent, true)
    document.addEventListener('ended', onMediaEvent, true)
    document.addEventListener('visibilitychange', onMediaEvent)
    return () => {
      document.removeEventListener('play', onMediaEvent, true)
      document.removeEventListener('pause', onMediaEvent, true)
      document.removeEventListener('ended', onMediaEvent, true)
      document.removeEventListener('visibilitychange', onMediaEvent)
    }
  }, [sync])

  return playing
}
