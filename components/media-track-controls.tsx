import { SkipBack, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'
import { canControlMediaTracks, requestMediaTrackChange } from '@/lib/media-session'

interface MediaTrackControlsProps {
  className?: string
  compact?: boolean
}

export function MediaTrackControls({ className, compact }: MediaTrackControlsProps) {
  if (!canControlMediaTracks()) return null

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border border-border/60 bg-card/30 px-3',
        compact ? 'py-2' : 'py-2.5',
        className,
      )}
    >
      {!compact && (
        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider flex-1">
          Music · lock screen ⏭
        </span>
      )}
      <button
        type="button"
        onClick={() => requestMediaTrackChange('previous')}
        data-haptic="selection"
        aria-label="Previous track"
        className="min-h-[36px] min-w-[36px] rounded-md border border-border text-muted-foreground hover:text-neon-orange hover:border-neon-orange/40 transition-colors flex items-center justify-center"
      >
        <SkipBack className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => requestMediaTrackChange('next')}
        data-haptic="selection"
        aria-label="Next track"
        className="min-h-[36px] min-w-[36px] rounded-md border border-border text-muted-foreground hover:text-neon-orange hover:border-neon-orange/40 transition-colors flex items-center justify-center"
      >
        <SkipForward className="w-4 h-4" />
      </button>
    </div>
  )
}
