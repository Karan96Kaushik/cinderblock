import { useState } from 'react'
import { ExternalLink, Play, Video } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExerciseRefVideoLinkProps {
  url: string
  label?: string
  className?: string
}

function youtubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')
    let id: string | null = null

    if (host === 'youtu.be') {
      id = parsed.pathname.split('/').filter(Boolean)[0] ?? null
    } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (
        parsed.pathname.startsWith('/shorts/') ||
        parsed.pathname.startsWith('/embed/') ||
        parsed.pathname.startsWith('/live/')
      ) {
        id = parsed.pathname.split('/')[2] ?? null
      } else {
        id = parsed.searchParams.get('v')
      }
    }

    if (!id || !/^[a-zA-Z0-9_-]{6,}$/.test(id)) return null
    return id
  } catch {
    return null
  }
}

function youtubeThumbnailUrl(url: string): string | null {
  const id = youtubeVideoId(url)
  if (!id) return null
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}

export function ExerciseRefVideoLink({
  url,
  label = 'Watch demo',
  className,
}: ExerciseRefVideoLinkProps) {
  const thumbnailUrl = youtubeThumbnailUrl(url)
  const [thumbFailed, setThumbFailed] = useState(false)
  const showThumb = Boolean(thumbnailUrl) && !thumbFailed

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      data-haptic="light"
      className={cn(
        'inline-flex items-center gap-2.5 min-h-[44px] max-w-full',
        'font-mono text-xs text-neon-orange hover:text-neon-orange/90',
        'border border-neon-orange/30 rounded-lg pl-1 pr-2.5 py-1',
        'bg-neon-orange/5 hover:bg-neon-orange/10 transition-colors',
        className,
      )}
    >
      <span className="relative h-9 w-14 shrink-0 overflow-hidden rounded-md border border-neon-orange/30 bg-neon-orange/10">
        {showThumb ? (
          <img
            src={thumbnailUrl ?? undefined}
            alt=""
            loading="lazy"
            onError={() => setThumbFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            <Video className="w-4 h-4 text-neon-orange" />
          </span>
        )}
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            showThumb ? 'bg-black/35' : 'bg-transparent',
          )}
        >
          <Play
            className={cn(
              'w-3.5 h-3.5 fill-current',
              showThumb ? 'text-white drop-shadow' : 'text-neon-orange',
            )}
          />
        </span>
      </span>
      <span className="flex min-w-0 flex-col items-start leading-tight">
        <span className="truncate">{label}</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-neon-orange/70">
          Video demo
        </span>
      </span>
      <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
    </a>
  )
}
