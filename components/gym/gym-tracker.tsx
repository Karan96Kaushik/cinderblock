import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import program from '@/foundation-7-june.json'
import { WorkoutCalendar } from './workout-calendar'
import { WorkoutSelector } from './workout-selector'
import { WorkoutFlow } from './workout-flow'

export type WorkoutKey = 'upperA' | 'lowerA' | 'upperB' | 'lowerB' | 'rest'

export type SetLog = { weight: string; reps: string }

export type ExerciseLog = {
  sets: SetLog[]
  completed: boolean
}

export type DayLog = {
  workoutKey: WorkoutKey
  exercises: Record<string, ExerciseLog>
}

export type GymStore = Record<string, DayLog>

export type ProgramExercise = {
  name: string
  sets: number
  reps?: string
  duration?: string
  notes: string[]
}

const STORAGE_KEY = 'cinderblock_gym_log'

type WorkoutMap = Record<string, { name: string; exercises: ProgramExercise[] }>

function initExercises(key: WorkoutKey): Record<string, ExerciseLog> {
  if (key === 'rest') return {}
  const workouts = program.workouts as WorkoutMap
  const workout = workouts[key]
  if (!workout) return {}
  const result: Record<string, ExerciseLog> = {}
  workout.exercises.forEach((ex) => {
    result[ex.name] = {
      sets: Array.from({ length: ex.sets }, () => ({ weight: '', reps: '' })),
      completed: false,
    }
  })
  return result
}

interface GymTrackerProps {
  onBack: () => void
}

type View = 'calendar' | 'selector' | 'flow'

export function GymTracker({ onBack }: GymTrackerProps) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [view, setView] = useState<View>('calendar')
  const [selectedDate, setSelectedDate] = useState<string>(today)
  const [store, setStore] = useState<GymStore>({})

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setStore(JSON.parse(raw) as GymStore)
    } catch {
      // ignore corrupt storage
    }
  }, [])

  const saveStore = useCallback((newStore: GymStore) => {
    setStore(newStore)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newStore))
    } catch {
      // ignore storage errors
    }
  }, [])

  const handleSelectDate = (date: string) => {
    setSelectedDate(date)
    const existing = store[date]
    if (existing && existing.workoutKey !== 'rest') {
      setView('flow')
    } else {
      setView('selector')
    }
  }

  const handleSelectWorkout = (key: WorkoutKey) => {
    if (key === 'rest') {
      saveStore({ ...store, [selectedDate]: { workoutKey: 'rest', exercises: {} } })
      setView('calendar')
      return
    }
    const existing = store[selectedDate]
    if (!existing || existing.workoutKey !== key) {
      saveStore({
        ...store,
        [selectedDate]: { workoutKey: key, exercises: initExercises(key) },
      })
    }
    setView('flow')
  }

  const handleUpdateStore = (newStore: GymStore) => {
    saveStore(newStore)
  }

  const handleFinish = () => {
    setView('calendar')
  }

  const handleBackToCalendar = () => {
    setView('calendar')
  }

  const handleBackToSelector = () => {
    setView('selector')
  }

  const dayLog = store[selectedDate]
  const hasFlow = dayLog && dayLog.workoutKey !== 'rest'

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-background/95 border-b border-border backdrop-blur-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-neon-orange transition-colors min-h-[44px] px-1"
          >
            <span className="font-mono text-xs">← CINDERBLOCK</span>
          </button>
          <span className="font-sans text-xs font-bold tracking-widest text-neon-orange neon-text-orange">
            TRAINING
          </span>
          <span className="font-mono text-xs text-muted-foreground w-[100px] text-right">
            {format(new Date(selectedDate + 'T12:00:00'), 'MMM d, yyyy')}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {view === 'calendar' && (
          <WorkoutCalendar
            store={store}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
          />
        )}

        {view === 'selector' && (
          <WorkoutSelector
            date={selectedDate}
            existingKey={store[selectedDate]?.workoutKey}
            onSelect={handleSelectWorkout}
            onBack={handleBackToCalendar}
          />
        )}

        {view === 'flow' && hasFlow && (
          <WorkoutFlow
            date={selectedDate}
            workoutKey={dayLog.workoutKey}
            dayLog={dayLog}
            store={store}
            onUpdateStore={handleUpdateStore}
            onBack={handleBackToSelector}
            onFinish={handleFinish}
          />
        )}
      </div>
    </div>
  )
}
