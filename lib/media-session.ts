const DEFAULT_ARTWORK: MediaImage[] = [
  { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
  { src: '/apple-icon.png', sizes: '512x512', type: 'image/png' },
]

export type MediaSessionConfig = {
  title: string
  artist?: string
  album?: string
  artwork?: MediaImage[]
  playbackState?: MediaSessionPlaybackState
  duration?: number
  position?: number
  onPlay?: () => void
  onPause?: () => void
  onNextTrack?: () => void
  onPreviousTrack?: () => void
  enableTrackControls?: boolean
}

export function isMediaSessionSupported(): boolean {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator
}

export function canControlMediaTracks(): boolean {
  return isMediaSessionSupported() && typeof navigator.mediaSession.setActionHandler === 'function'
}

function findControllableMedia(): HTMLMediaElement | null {
  const elements = [...document.querySelectorAll('audio, video')] as HTMLMediaElement[]
  const playing = elements.find((el) => !el.paused && !el.ended && el.currentTime > 0)
  return playing ?? elements[0] ?? null
}

function tryPlaylistSkip(media: HTMLMediaElement, direction: 'next' | 'previous'): boolean {
  const raw = media.dataset.playlist
  if (!raw) return false

  try {
    const playlist = JSON.parse(raw) as string[]
    const index = Number(media.dataset.playlistIndex ?? 0)
    const nextIndex = direction === 'next' ? index + 1 : index - 1
    if (nextIndex < 0 || nextIndex >= playlist.length) return false

    media.dataset.playlistIndex = String(nextIndex)
    media.src = playlist[nextIndex]
    void media.play()
    return true
  } catch {
    return false
  }
}

/** Best-effort skip for system / in-page media (headphones, lock screen, etc.) */
export function requestMediaTrackChange(direction: 'next' | 'previous'): void {
  window.dispatchEvent(
    new CustomEvent('cinderblock:media-track', { detail: { direction } }),
  )

  const media = findControllableMedia()
  if (media && tryPlaylistSkip(media, direction)) return

  const code = direction === 'next' ? 'MediaTrackNext' : 'MediaTrackPrevious'
  for (const target of [window, document]) {
    target.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: code,
        code,
        bubbles: true,
        cancelable: true,
      }),
    )
  }
}

export function updateMediaSession(config: MediaSessionConfig): void {
  if (!isMediaSessionSupported()) return

  const { mediaSession } = navigator

  mediaSession.metadata = new MediaMetadata({
    title: config.title,
    artist: config.artist ?? 'CINDERBLOCK',
    album: config.album ?? '',
    artwork: config.artwork ?? DEFAULT_ARTWORK,
  })

  if (config.playbackState) {
    mediaSession.playbackState = config.playbackState
  }

  if (
    config.duration != null &&
    config.position != null &&
    'setPositionState' in mediaSession
  ) {
    try {
      mediaSession.setPositionState({
        duration: Math.max(0, config.duration),
        position: Math.max(0, Math.min(config.position, config.duration)),
        playbackRate: 1,
      })
    } catch {
      // Invalid duration/position in some browsers
    }
  }
}

export function bindMediaSessionHandlers(
  config: Pick<
    MediaSessionConfig,
    'onPlay' | 'onPause' | 'onNextTrack' | 'onPreviousTrack' | 'enableTrackControls'
  >,
): () => void {
  if (!isMediaSessionSupported()) return () => {}

  const { mediaSession } = navigator
  const setHandler = mediaSession.setActionHandler?.bind(mediaSession)
  if (!setHandler) return () => {}

  const nextHandler =
    config.onNextTrack ??
    (config.enableTrackControls ? () => requestMediaTrackChange('next') : undefined)
  const prevHandler =
    config.onPreviousTrack ??
    (config.enableTrackControls ? () => requestMediaTrackChange('previous') : undefined)

  setHandler('play', config.onPlay ? () => config.onPlay!() : null)
  setHandler('pause', config.onPause ? () => config.onPause!() : null)
  setHandler('nexttrack', nextHandler ?? null)
  setHandler('previoustrack', prevHandler ?? null)

  return () => {
    setHandler('play', null)
    setHandler('pause', null)
    setHandler('nexttrack', null)
    setHandler('previoustrack', null)
    mediaSession.metadata = null
    mediaSession.playbackState = 'none'
    if ('setPositionState' in mediaSession) {
      try {
        mediaSession.setPositionState({
          duration: 0,
          position: 0,
          playbackRate: 1,
        })
      } catch {
        // ignore
      }
    }
  }
}

export function clearMediaSession(): void {
  bindMediaSessionHandlers({})()
}
