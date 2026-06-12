import { ExternalLink, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExerciseRefVideoLinkProps {
  url: string
  label?: string
  className?: string
}

export function ExerciseRefVideoLink({
  url,
  label = 'Watch demo',
  className,
}: ExerciseRefVideoLinkProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      data-haptic="light"
      className={cn(
        'inline-flex items-center gap-1.5 min-h-[36px] font-mono text-xs',
        'text-neon-orange hover:text-neon-orange/90',
        'border border-neon-orange/30 rounded-lg px-3 py-1.5',
        'bg-neon-orange/5 hover:bg-neon-orange/10 transition-colors',
        className,
      )}
    >
      <Play className="w-3.5 h-3.5 shrink-0 fill-current" />
      <span>{label}</span>
      <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
    </a>
  )
}
