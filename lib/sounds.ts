export type SoundType = 'exerciseChange' | 'timerComplete' | 'phaseChange' | 'sessionComplete'

let enabled = true
let volume = 0.7
let audioContext: AudioContext | null = null

const MIN_INTERVAL_MS = 80
let lastPlayAt = 0

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioContext) {
    const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    audioContext = new Ctx()
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {})
  }
  return audioContext
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  peakGain = 1,
) {
  const ctx = getContext()
  if (!ctx || !enabled || volume <= 0) return

  const now = Date.now()
  if (now - lastPlayAt < MIN_INTERVAL_MS) return
  lastPlayAt = now

  const osc = ctx.createOscillator()
  const gainNode = ctx.createGain()
  const t = ctx.currentTime
  const peak = volume * peakGain

  osc.type = type
  osc.frequency.value = frequency
  gainNode.gain.setValueAtTime(0, t)
  gainNode.gain.linearRampToValueAtTime(peak, t + 0.01)
  gainNode.gain.exponentialRampToValueAtTime(0.001, t + duration)
  osc.connect(gainNode)
  gainNode.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + duration + 0.05)
}

function playSequence(
  notes: { freq: number; delay: number; duration: number; type?: OscillatorType; gain?: number }[],
) {
  for (const note of notes) {
    window.setTimeout(() => {
      playTone(note.freq, note.duration, note.type ?? 'sine', note.gain ?? 1)
    }, note.delay)
  }
}

const SOUND_PATTERNS: Record<SoundType, () => void> = {
  exerciseChange: () => playTone(520, 0.07, 'sine', 0.35),

  timerComplete: () =>
    playSequence([
      { freq: 523, delay: 0, duration: 0.14, gain: 0.75 },
      { freq: 659, delay: 90, duration: 0.18, gain: 0.75 },
      { freq: 784, delay: 180, duration: 0.28, gain: 0.8 },
    ]),

  phaseChange: () =>
    playSequence([
      { freq: 392, delay: 0, duration: 0.12, type: 'triangle', gain: 0.65 },
      { freq: 523, delay: 100, duration: 0.2, type: 'triangle', gain: 0.7 },
    ]),

  sessionComplete: () =>
    playSequence([
      { freq: 523, delay: 0, duration: 0.18, gain: 0.8 },
      { freq: 659, delay: 140, duration: 0.18, gain: 0.8 },
      { freq: 784, delay: 280, duration: 0.22, gain: 0.85 },
      { freq: 1047, delay: 420, duration: 0.35, gain: 0.9 },
    ]),
}

export const Sound = {
  play(type: SoundType) {
    SOUND_PATTERNS[type]?.()
  },

  preview(type: SoundType = 'timerComplete') {
    const wasEnabled = enabled
    enabled = true
    lastPlayAt = 0
    SOUND_PATTERNS[type]?.()
    window.setTimeout(() => {
      enabled = wasEnabled
    }, 1000)
  },

  setEnabled(value: boolean) {
    enabled = value
  },

  setVolume(value: number) {
    volume = Math.max(0, Math.min(1, value))
  },

  configure(opts: { enabled: boolean; volume: number }) {
    enabled = opts.enabled
    volume = Math.max(0, Math.min(1, opts.volume))
  },
}
