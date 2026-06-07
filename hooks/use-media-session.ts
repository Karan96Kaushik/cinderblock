import { useEffect, useRef } from 'react'
import {
  bindMediaSessionHandlers,
  updateMediaSession,
  type MediaSessionConfig,
} from '@/lib/media-session'

export function useMediaSession(config: MediaSessionConfig & { enabled?: boolean }) {
  const configRef = useRef(config)
  configRef.current = config

  useEffect(() => {
    if (config.enabled === false) {
      return bindMediaSessionHandlers({})
    }

    return bindMediaSessionHandlers({
      onPlay: () => configRef.current.onPlay?.(),
      onPause: () => configRef.current.onPause?.(),
      onNextTrack: configRef.current.onNextTrack,
      onPreviousTrack: configRef.current.onPreviousTrack,
      enableTrackControls: configRef.current.enableTrackControls,
    })
  }, [config.enabled])

  useEffect(() => {
    if (config.enabled === false) return

    updateMediaSession({
      title: config.title,
      artist: config.artist,
      album: config.album,
      artwork: config.artwork,
      playbackState: config.playbackState,
      duration: config.duration,
      position: config.position,
    })
  }, [
    config.enabled,
    config.title,
    config.artist,
    config.album,
    config.playbackState,
    config.duration,
    config.position,
    config.artwork,
  ])
}
