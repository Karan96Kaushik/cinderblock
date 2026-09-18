import { useCallback, useEffect, useRef, useState } from 'react'
import { Haptic } from '@/lib/haptics'
import { Sound } from '@/lib/sounds'
import { formatTimer } from '@/lib/running'
import {
  clearActiveRestTimer,
  loadRestTimerState,
  readActiveRestTimer,
  writeActiveRestTimer,
} from '@/lib/rest-timer'
import { useSettings } from '@/hooks/use-settings'
import { useWakeLock } from '@/hooks/use-wake-lock'
import { useMediaSession } from '@/hooks/use-media-session'

function loadInitialState(workoutDate: string) {
  const saved = readActiveRestTimer()
  if (!saved || saved.workoutDate !== workoutDate) {
    return {
      exerciseName: null as string | null,
      open: false,
      duration: 0,
      remaining: 0,
      running: false,
      finished: false,
      startedAtIso: null as string | null,
    }
  }

  const restored = loadRestTimerState(workoutDate, saved.exerciseName)
  return {
    exerciseName: saved.exerciseName,
    open: restored.open,
    duration: restored.duration,
    remaining: restored.remaining,
    running: restored.running,
    finished: restored.finished,
    startedAtIso: restored.startedAtIso,
  }
}

export function useRestTimer(workoutDate: string) {
  const { settings } = useSettings()
  const initial = useRef(loadInitialState(workoutDate)).current
  const [exerciseName, setExerciseName] = useState<string | null>(initial.exerciseName)
  const [open, setOpen] = useState(initial.open)
  const [duration, setDuration] = useState(initial.duration)
  const [remaining, setRemaining] = useState(initial.remaining)
  const [running, setRunning] = useState(initial.running)
  const [finished, setFinished] = useState(initial.finished)
  const [startedAtIso, setStartedAtIso] = useState<string | null>(initial.startedAtIso)
  const [startGeneration, setStartGeneration] = useState(0)
  const endAtRef = useRef<number | null>(null)
  const tickRef = useRef<number | null>(null)

  const clearTick = useCallback(() => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [])

  const halt = useCallback(() => {
    clearTick()
    endAtRef.current = null
    setStartedAtIso(null)
    setRunning(false)
  }, [clearTick])

  const beginCountdown = useCallback(
    (ownerExerciseName: string, seconds: number, expand = true) => {
      clearTick()
      const startedAt = new Date().toISOString()
      setExerciseName(ownerExerciseName)
      setFinished(false)
      setDuration(seconds)
      setRemaining(seconds)
      setStartedAtIso(startedAt)
      endAtRef.current = Date.now() + seconds * 1000
      setStartGeneration((generation) => generation + 1)
      setRunning(true)
      if (expand) setOpen(true)
    },
    [clearTick],
  )

  /** Claims the panel for an exercise so it can be expanded before a preset is picked. */
  const setOpenFor = useCallback((ownerExerciseName: string, nextOpen: boolean) => {
    if (nextOpen) setExerciseName(ownerExerciseName)
    setOpen(nextOpen)
  }, [])

  const reset = useCallback(() => {
    halt()
    setFinished(false)
    setRemaining(duration)
    clearActiveRestTimer()
  }, [halt, duration])

  useEffect(() => {
    if (!initial.running || initial.remaining <= 0) return
    endAtRef.current = Date.now() + initial.remaining * 1000
    setStartGeneration((generation) => generation + 1)
  }, [])

  useEffect(() => {
    if (!running || endAtRef.current === null) return

    const tick = () => {
      const left = Math.max(0, Math.ceil((endAtRef.current! - Date.now()) / 1000))
      setRemaining(left)
      if (left <= 0) {
        clearTick()
        setRunning(false)
        setFinished(true)
        setStartedAtIso(null)
        endAtRef.current = null
        Haptic.success()
        Sound.play('timerComplete')
      }
    }

    tick()
    tickRef.current = window.setInterval(tick, 200)
    return clearTick
  }, [running, startGeneration, clearTick])

  useEffect(() => () => clearTick(), [clearTick])

  useEffect(() => {
    if (!exerciseName || duration <= 0) return

    if (finished) {
      clearActiveRestTimer()
      return
    }

    writeActiveRestTimer({
      workoutDate,
      exerciseName,
      durationSeconds: duration,
      remainingSeconds: remaining,
      running,
      startedAtIso,
      open,
      finished,
    })
  }, [
    workoutDate,
    exerciseName,
    duration,
    remaining,
    running,
    startedAtIso,
    open,
    finished,
  ])

  const toggleRun = useCallback(() => {
    if (finished) {
      reset()
      return
    }
    if (running) {
      if (endAtRef.current !== null) {
        setRemaining(Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000)))
      }
      halt()
      Haptic.light()
      return
    }
    if (remaining <= 0 && duration > 0) {
      setRemaining(duration)
    }
    if (remaining <= 0) return
    const startedAt = new Date().toISOString()
    setStartedAtIso(startedAt)
    endAtRef.current = Date.now() + remaining * 1000
    setStartGeneration((generation) => generation + 1)
    setRunning(true)
    Haptic.selection()
  }, [finished, running, remaining, duration, halt, reset])

  const selectPreset = useCallback(
    (ownerExerciseName: string, seconds: number) => {
      beginCountdown(ownerExerciseName, seconds)
      Haptic.selection()
    },
    [beginCountdown],
  )

  const isActive = duration > 0 && (running || remaining > 0 || finished)
  const timerActive = duration > 0 && (running || remaining > 0) && !finished

  useWakeLock(settings.alwaysAwake && running)

  const toggleRunRef = useRef(toggleRun)
  toggleRunRef.current = toggleRun

  useMediaSession({
    enabled: timerActive,
    title: finished
      ? 'Rest complete'
      : `${exerciseName ?? 'Rest timer'} · ${formatTimer(remaining)}`,
    artist: 'CINDERBLOCK',
    album: 'Rest stopwatch',
    playbackState: running ? 'playing' : 'paused',
    duration,
    position: Math.max(0, duration - remaining),
    enableTrackControls: true,
    onPlay: () => toggleRunRef.current(),
    onPause: () => toggleRunRef.current(),
  })

  return {
    exerciseName,
    open,
    setOpen,
    setOpenFor,
    duration,
    remaining,
    running,
    finished,
    isActive,
    timerActive,
    beginCountdown,
    selectPreset,
    toggleRun,
    reset,
  }
}
