import { useCallback, useEffect, useRef, useState } from 'react'
import { Haptic } from '@/lib/haptics'
import { Sound } from '@/lib/sounds'
import {
  clearActiveRestTimer,
  loadRestTimerState,
  readActiveRestTimer,
  writeActiveRestTimer,
} from '@/lib/rest-timer'

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

  const reset = useCallback(() => {
    halt()
    setFinished(false)
    setRemaining(duration)
    clearActiveRestTimer()
  }, [halt, duration])

  const clear = useCallback(() => {
    halt()
    setExerciseName(null)
    setOpen(false)
    setDuration(0)
    setRemaining(0)
    setFinished(false)
    clearActiveRestTimer()
  }, [halt])

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
    if (!exerciseName) return
    if (duration === 0 && remaining === 0 && !running && !finished && !open) return

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

  return {
    exerciseName,
    open,
    setOpen,
    duration,
    remaining,
    running,
    finished,
    isActive,
    beginCountdown,
    selectPreset,
    toggleRun,
    reset,
    clear,
  }
}
