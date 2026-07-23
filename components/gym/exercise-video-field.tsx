import { useEffect, useState } from 'react'
import { Link2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { normalizeVideoUrl } from '@/lib/exercise-videos'
import { ExerciseRefVideoLink } from './exercise-ref-video-link'

interface ExerciseVideoFieldProps {
  exerciseName: string
  programRefVideo?: string
  userVideoUrl?: string
  onSave: (url: string) => void
  onClear: () => void
}

export function ExerciseVideoField({
  exerciseName,
  programRefVideo,
  userVideoUrl,
  onSave,
  onClear,
}: ExerciseVideoFieldProps) {
  const [draft, setDraft] = useState(userVideoUrl ?? '')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDraft(userVideoUrl ?? '')
    setError(null)
  }, [exerciseName, userVideoUrl])

  const handleSave = () => {
    const normalized = normalizeVideoUrl(draft)
    if (!normalized) {
      setError('Enter a valid http or https link')
      return
    }
    setError(null)
    onSave(normalized)
  }

  const handleClear = () => {
    setDraft('')
    setError(null)
    onClear()
  }

  return (
    <div className="mt-3 pt-3 border-t border-border/40">
      <div className="flex items-center gap-1.5 mb-2">
        <Link2 className="w-3 h-3 text-muted-foreground" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Video
        </span>
      </div>

      <div className="flex gap-2">
        <input
          type="url"
          inputMode="url"
          autoComplete="off"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            if (error) setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSave()
            }
          }}
          placeholder="https://youtube.com/shorts/..."
          className={cn(
            'flex-1 min-w-0 h-10 bg-input/60 border rounded-md px-3',
            'font-mono text-xs text-foreground placeholder:text-muted-foreground/40',
            'focus:outline-none focus:border-neon-orange/60 focus:ring-1 focus:ring-neon-orange/30',
            error ? 'border-destructive/60' : 'border-border',
          )}
        />
        <button
          type="button"
          onClick={handleSave}
          data-haptic="light"
          className="shrink-0 h-10 px-3 rounded-md border border-neon-orange/40 font-mono text-xs text-neon-orange hover:bg-neon-orange/10 transition-colors"
        >
          Save
        </button>
        {userVideoUrl && (
          <button
            type="button"
            onClick={handleClear}
            data-haptic="warning"
            title="Remove your link"
            className="shrink-0 h-10 w-10 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && <p className="mt-1.5 font-mono text-[10px] text-destructive">{error}</p>}

      {userVideoUrl && (
        <div className="mt-2.5">
          <ExerciseRefVideoLink url={userVideoUrl} label="Reference" />
        </div>
      )}

      {programRefVideo && (
        <div className={cn(userVideoUrl && 'mt-2')}>
          {userVideoUrl && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground block mb-1.5">
              Program reference
            </span>
          )}
          <ExerciseRefVideoLink url={programRefVideo} label="Program demo" />
        </div>
      )}
    </div>
  )
}
