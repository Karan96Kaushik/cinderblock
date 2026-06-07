export function CyberGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 cyber-grid cyber-grid-layer" />

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-full h-1 cyber-scanline animate-scanline" />
      </div>

      <div className="absolute inset-0 cyber-vignette" />

      <svg className="absolute top-0 left-0 w-32 h-32 text-neon-orange/40" viewBox="0 0 100 100">
        <path d="M0 30 L0 0 L30 0" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="0" cy="30" r="3" fill="currentColor" />
        <circle cx="30" cy="0" r="3" fill="currentColor" />
      </svg>

      <svg className="absolute top-0 right-0 w-32 h-32 text-neon-yellow/40" viewBox="0 0 100 100">
        <path d="M100 30 L100 0 L70 0" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="100" cy="30" r="3" fill="currentColor" />
        <circle cx="70" cy="0" r="3" fill="currentColor" />
      </svg>

      <svg className="absolute bottom-0 left-0 w-32 h-32 text-neon-red/40" viewBox="0 0 100 100">
        <path d="M0 70 L0 100 L30 100" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="0" cy="70" r="3" fill="currentColor" />
        <circle cx="30" cy="100" r="3" fill="currentColor" />
      </svg>

      <svg className="absolute bottom-0 right-0 w-32 h-32 text-neon-red/40" viewBox="0 0 100 100">
        <path d="M100 70 L100 100 L70 100" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="100" cy="70" r="3" fill="currentColor" />
        <circle cx="70" cy="100" r="3" fill="currentColor" />
      </svg>
    </div>
  )
}
