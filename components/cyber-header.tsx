import { useCallback, useEffect, useId, useState } from 'react'
import {
  ChevronRight,
  Dumbbell,
  Footprints,
  LayoutGrid,
  Menu,
  Ruler,
  Settings,
  Sparkles,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AuthPanel } from '@/components/auth/auth-panel'

interface CyberHeaderProps {
  onTrainingClick?: () => void
  onRunningClick?: () => void
  onMetricsClick?: () => void
  onSettingsClick?: () => void
}

export function CyberHeader({ onTrainingClick, onRunningClick, onMetricsClick, onSettingsClick }: CyberHeaderProps) {
  const [open, setOpen] = useState(false)
  const drawerId = useId()

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  const handleAnchor = (href: string) => {
    close()
    requestAnimationFrame(() => {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const handleAction = (onClick?: () => void) => {
    close()
    onClick?.()
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="bg-background/85 backdrop-blur-md border-b border-border/80">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <a
                href="/"
                className="flex items-center gap-2.5 group min-w-0"
                data-haptic="selection"
                onClick={close}
              >
                <div className="relative shrink-0">
                  <img
                    src="/apple-icon.png"
                    alt="CINDERBLOCK"
                    className="w-9 h-9 rounded-md object-cover group-hover:opacity-90 transition-opacity ring-1 ring-neon-orange/30"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-neon-orange animate-pulse" />
                </div>
                <span className="font-sans text-lg font-bold tracking-widest fire-gradient-text neon-text-orange truncate">
                  CINDERBLOCK
                </span>
              </a>

              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden sm:flex items-center gap-2 font-mono text-[10px] text-muted-foreground border border-border/60 rounded-full px-2.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-yellow animate-pulse" />
                  ONLINE
                </div>

                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={drawerId}
                  aria-label={open ? 'Close menu' : 'Open menu'}
                  onClick={() => setOpen((v) => !v)}
                  data-haptic="selection"
                  className={cn(
                    'relative h-10 w-10 rounded-lg border transition-all duration-300',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-orange/50',
                    open
                      ? 'border-neon-orange/60 bg-neon-orange/15 text-neon-orange neon-border-orange'
                      : 'border-border text-muted-foreground hover:text-neon-orange hover:border-neon-orange/40',
                  )}
                >
                  <span className="sr-only">{open ? 'Close navigation' : 'Open navigation'}</span>
                  <Menu
                    className={cn(
                      'absolute inset-0 m-auto w-5 h-5 transition-all duration-300',
                      open ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100',
                    )}
                  />
                  <X
                    className={cn(
                      'absolute inset-0 m-auto w-5 h-5 transition-all duration-300',
                      open ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50',
                    )}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Dropdown drawer panel */}
          <div
            id={drawerId}
            aria-hidden={!open}
            className={cn(
              'overflow-hidden border-t border-neon-orange/20 transition-[max-height,opacity] duration-500 ease-out',
              open ? 'max-h-[min(85vh,720px)] opacity-100' : 'max-h-0 opacity-0 pointer-events-none',
            )}
          >
            <div className="relative cyber-grid">
              {/* Ambient glow */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-neon-orange/10 via-transparent to-neon-red/5" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon-orange/70 to-transparent" />

              {/* Scanline shimmer */}
              <div
                className={cn(
                  'pointer-events-none absolute inset-0 overflow-hidden opacity-30',
                  open && 'animate-scanline',
                )}
              >
                <div className="h-px w-full bg-neon-orange/40" />
              </div>

              <div className="relative max-w-7xl mx-auto px-4 py-5 pb-6">
                <div className="flex items-center gap-2 mb-5">
                  <Sparkles className="w-4 h-4 text-neon-yellow" />
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-neon-orange/80">
                    Navigation matrix
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <NavGroup title="On this page">
                    <DrawerLink
                      label="Program"
                      description="Goals & structure"
                      visible={open}
                      delay={0}
                      onClick={() => handleAnchor('#program')}
                    />
                    <DrawerLink
                      label="Schedule"
                      description="Weekly split"
                      visible={open}
                      delay={60}
                      onClick={() => handleAnchor('#schedule')}
                    />
                    <DrawerLink
                      label="Progression"
                      description="Load & rep rules"
                      visible={open}
                      delay={120}
                      onClick={() => handleAnchor('#progression')}
                    />
                  </NavGroup>

                  <NavGroup title="App">
                    <DrawerLink
                      label="Training"
                      description="Log workouts & sets"
                      icon={Dumbbell}
                      accent
                      visible={open}
                      delay={180}
                      disabled={!onTrainingClick}
                      onClick={() => handleAction(onTrainingClick)}
                    />
                    <DrawerLink
                      label="Running"
                      description="Warmup · run · cooldown"
                      icon={Footprints}
                      visible={open}
                      delay={210}
                      disabled={!onRunningClick}
                      onClick={() => handleAction(onRunningClick)}
                    />
                    <DrawerLink
                      label="Metrics"
                      description="Weight & measurements"
                      icon={Ruler}
                      visible={open}
                      delay={270}
                      disabled={!onMetricsClick}
                      onClick={() => handleAction(onMetricsClick)}
                    />
                    <DrawerLink
                      label="Settings"
                      description="Fonts, history, alerts"
                      icon={Settings}
                      visible={open}
                      delay={330}
                      disabled={!onSettingsClick}
                      onClick={() => handleAction(onSettingsClick)}
                    />
                  </NavGroup>
                </div>

                <div
                  className={cn(
                    'mt-6 pt-4 border-t border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4',
                    open && 'animate-in fade-in slide-in-from-top-2 duration-500 delay-300 fill-mode-both',
                  )}
                >
                  <AuthPanel />
                  <span className="font-mono text-[10px] text-muted-foreground/70 tracking-wider">
                    FOUNDATION STRENGTH · v2.0.26
                  </span>
                </div>
              </div>

              {/* Corner brackets */}
              <div className="pointer-events-none absolute top-2 left-3 w-5 h-5 border-t-2 border-l-2 border-neon-orange/50" />
              <div className="pointer-events-none absolute top-2 right-3 w-5 h-5 border-t-2 border-r-2 border-neon-yellow/50" />
              <div className="pointer-events-none absolute bottom-2 left-3 w-5 h-5 border-b-2 border-l-2 border-neon-red/40" />
              <div className="pointer-events-none absolute bottom-2 right-3 w-5 h-5 border-b-2 border-r-2 border-neon-red/40" />
            </div>
          </div>
        </div>
      </header>

      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close menu"
        tabIndex={open ? 0 : -1}
        onClick={close}
        className={cn(
          'fixed inset-0 z-40 bg-background/70 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />
    </>
  )
}

function NavGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 flex items-center gap-2">
        <LayoutGrid className="w-3 h-3 text-neon-orange/60" />
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function DrawerLink({
  label,
  description,
  icon: Icon,
  accent,
  disabled,
  visible,
  delay = 0,
  onClick,
}: {
  label: string
  description: string
  icon?: typeof Dumbbell
  accent?: boolean
  disabled?: boolean
  visible?: boolean
  delay?: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-haptic="selection"
      style={{ animationDelay: `${delay}ms` }}
      className={cn(
        'group w-full text-left rounded-xl border px-4 py-3.5 transition-all duration-300',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-orange/50',
        visible && 'animate-in fade-in slide-in-from-top-3 fill-mode-both duration-500',
        disabled && 'opacity-40 cursor-not-allowed',
        accent
          ? 'border-neon-orange/40 bg-neon-orange/10 hover:bg-neon-orange/15 hover:border-neon-orange/60'
          : 'border-border/70 bg-card/40 hover:bg-card/70 hover:border-neon-orange/30',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {Icon && (
            <div
              className={cn(
                'mt-0.5 shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center transition-colors',
                accent
                  ? 'border-neon-orange/40 bg-neon-orange/15 text-neon-orange'
                  : 'border-border text-muted-foreground group-hover:text-neon-orange group-hover:border-neon-orange/30',
              )}
            >
              <Icon className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0">
            <div
              className={cn(
                'font-sans text-sm font-bold tracking-wider uppercase',
                accent ? 'text-neon-orange neon-text-orange' : 'text-foreground group-hover:text-neon-orange',
              )}
            >
              {label}
            </div>
            <div className="font-mono text-[11px] text-muted-foreground mt-0.5 truncate">
              {description}
            </div>
          </div>
        </div>
        <ChevronRight
          className={cn(
            'w-4 h-4 shrink-0 transition-transform duration-300',
            accent ? 'text-neon-orange' : 'text-muted-foreground/50 group-hover:text-neon-orange',
            'group-hover:translate-x-0.5',
          )}
        />
      </div>
    </button>
  )
}
