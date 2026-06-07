import { AuthPanel } from '@/components/auth/auth-panel'

interface CyberHeaderProps {
  onTrainingClick?: () => void
  onMetricsClick?: () => void
}

export function CyberHeader({ onTrainingClick, onMetricsClick }: CyberHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 group" data-haptic="selection">
            <img
              src="/apple-icon.png"
              alt="CINDERBLOCK"
              className="w-10 h-10 rounded-md object-cover group-hover:opacity-90 transition-opacity"
            />
            <span className="font-sans text-xl font-bold tracking-widest fire-gradient-text neon-text-orange">
              CINDERBLOCK
            </span>
          </a>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <NavLink href="#program">PROGRAM</NavLink>
            <NavLink href="#schedule">SCHEDULE</NavLink>
            <NavLink href="#progression">PROGRESSION</NavLink>
            {onMetricsClick && (
              <button
                onClick={onMetricsClick}
                data-haptic="selection"
                className="relative font-mono text-sm tracking-wider text-muted-foreground hover:text-neon-orange transition-colors group text-left"
              >
                <span className="opacity-50 group-hover:opacity-100 text-neon-red transition-opacity">{'>'}</span>
                {' '}METRICS
                <span className="absolute -bottom-1 left-0 w-0 h-px fire-gradient group-hover:w-full transition-all duration-300" />
              </button>
            )}
            {onTrainingClick && (
              <button
                onClick={onTrainingClick}
                data-haptic="selection"
                className="relative font-mono text-sm tracking-wider text-muted-foreground hover:text-neon-orange transition-colors group text-left"
              >
                <span className="opacity-50 group-hover:opacity-100 text-neon-red transition-opacity">{'>'}</span>
                {' '}TRAINING
                <span className="absolute -bottom-1 left-0 w-0 h-px fire-gradient group-hover:w-full transition-all duration-300" />
              </button>
            )}
          </nav>

          {/* Status + mobile training */}
          <div className="flex items-center gap-3 font-mono text-xs">
            {onMetricsClick && (
              <button
                onClick={onMetricsClick}
                data-haptic="selection"
                className="md:hidden font-mono text-xs text-muted-foreground border border-border px-2 py-1 rounded hover:text-neon-orange hover:border-neon-orange/40 transition-colors"
              >
                METRICS
              </button>
            )}
            {onTrainingClick && (
              <button
                onClick={onTrainingClick}
                data-haptic="selection"
                className="md:hidden font-mono text-xs text-neon-orange border border-neon-orange/40 px-2 py-1 rounded hover:bg-neon-orange/10 transition-colors"
              >
                TRAIN
              </button>
            )}
            <AuthPanel />
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-neon-yellow animate-pulse" />
              <span className="text-muted-foreground">ONLINE</span>
            </div>
            <span className="px-3 py-1 border border-border text-muted-foreground">
              v2.0.26
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      data-haptic="selection"
      className="relative font-mono text-sm tracking-wider text-muted-foreground hover:text-neon-orange transition-colors group"
    >
      <span className="opacity-50 group-hover:opacity-100 text-neon-red transition-opacity">{'>'}</span>
      {' '}{children}
      <span className="absolute -bottom-1 left-0 w-0 h-px fire-gradient group-hover:w-full transition-all duration-300" />
    </a>
  )
}
