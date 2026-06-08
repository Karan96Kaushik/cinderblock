import { DayPicker } from 'react-day-picker'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getWorkoutDotColorClass, program, REST_DAY_KEY } from '@/lib/program'
import { getRunsForDate, type RunSessionLog } from '@/lib/running'
import { RunSessionDetails } from '@/components/running/run-session-details'
import type { GymStore } from './gym-tracker'
import { isDayComplete } from './gym-tracker'
import { WorkoutSessionDetails } from './workout-session-details'

interface WorkoutCalendarProps {
  store: GymStore
  runs: RunSessionLog[]
  selectedDate: string
  onSelectDate: (date: string) => void
  onOpenWorkout: () => void
  onStartWorkout: () => void
  onStartToday: () => void
  onExploreWorkout: () => void
}

function getDotColor(workoutKey: string) {
  return getWorkoutDotColorClass(workoutKey)
}

export function WorkoutCalendar({
  store,
  runs,
  selectedDate,
  onSelectDate,
  onOpenWorkout,
  onStartWorkout,
  onStartToday,
  onExploreWorkout,
}: WorkoutCalendarProps) {
  const selected = new Date(selectedDate + 'T12:00:00')
  const today = format(new Date(), 'yyyy-MM-dd')

  const totalLogged = Object.keys(store).length
  const totalCompleted = Object.keys(store).filter((d) => isDayComplete(store[d])).length
  const totalRuns = runs.length
  const selectedRuns = getRunsForDate(runs, selectedDate)
  const hasStats = totalLogged > 0 || totalRuns > 0

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="font-sans text-2xl font-bold fire-gradient-text tracking-wider">
          TRAINING LOG
        </h1>
        <p className="font-mono text-xs text-muted-foreground mt-1">{program.name}</p>
        <button
          type="button"
          onClick={onExploreWorkout}
          data-haptic="selection"
          className="mt-3 w-full min-h-[40px] rounded-lg border border-border font-mono text-xs tracking-widest uppercase text-muted-foreground hover:text-neon-orange hover:border-neon-orange/40 transition-colors"
        >
          Explore workout
        </button>
      </div>

      {/* Stats row */}
      {hasStats && (
        <div className="px-4 mb-4">
          <div className="flex gap-4">
            <div className="bg-card/50 border border-border rounded-lg px-4 py-2 flex-1 text-center">
              <div className="font-sans text-lg font-bold text-neon-orange">{totalLogged}</div>
              <div className="font-mono text-xs text-muted-foreground">GYM</div>
            </div>
            <div className="bg-card/50 border border-border rounded-lg px-4 py-2 flex-1 text-center">
              <div className="font-sans text-lg font-bold text-neon-yellow">{totalCompleted}</div>
              <div className="font-mono text-xs text-muted-foreground">COMPLETED</div>
            </div>
            {totalRuns > 0 && (
              <div className="bg-card/50 border border-border rounded-lg px-4 py-2 flex-1 text-center">
                <div className="font-sans text-lg font-bold text-neon-yellow">{totalRuns}</div>
                <div className="font-mono text-xs text-muted-foreground">RUNS</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="px-4 mb-3">
        <div className="bg-card/50 border border-border rounded-lg p-4">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(date) => date && onSelectDate(format(date, 'yyyy-MM-dd'))}
            classNames={{
              root: 'w-full',
              months: 'w-full',
              month: 'w-full',
              month_caption: 'flex items-center justify-center relative h-10 mb-2',
              caption_label:
                'font-sans text-xs font-bold tracking-widest uppercase text-foreground',
              nav: 'absolute inset-0 flex items-center justify-between pointer-events-none',
              button_previous:
                'h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-neon-orange hover:bg-muted transition-colors pointer-events-auto',
              button_next:
                'h-9 w-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-neon-orange hover:bg-muted transition-colors pointer-events-auto',
              month_grid: 'w-full',
              weekdays: 'grid grid-cols-7 mb-1',
              weekday:
                'font-mono text-xs text-muted-foreground text-center py-1 uppercase select-none',
              weeks: 'space-y-1',
              week: 'grid grid-cols-7',
              day: 'relative p-0',
              day_button: 'w-full',
              outside: '',
              disabled: '',
              selected: '',
              today: '',
              hidden: 'invisible',
            }}
            components={{
              Chevron: ({ orientation }) => {
                if (orientation === 'left') return <ChevronLeft className="w-4 h-4" />
                return <ChevronRight className="w-4 h-4" />
              },
              DayButton: ({ day, modifiers, ...props }) => {
                const dateStr = format(day.date, 'yyyy-MM-dd')
                const log = store[dateStr]
                const complete = isDayComplete(log)
                const dayRuns = getRunsForDate(runs, dateStr)
                const isToday = dateStr === today

                return (
                  <button
                    {...props}
                    data-haptic="selection"
                    className={cn(
                      'w-full flex flex-col items-center justify-center gap-0.5 rounded-md',
                      'font-mono text-sm transition-colors min-h-[44px]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-orange/50',
                      modifiers.selected && 'bg-neon-orange/20 text-neon-orange',
                      !modifiers.selected && isToday && 'text-neon-yellow font-bold',
                      !modifiers.selected &&
                        !isToday &&
                        !modifiers.outside &&
                        'text-foreground hover:bg-muted',
                      modifiers.outside && 'text-muted-foreground/30',
                      modifiers.disabled && 'opacity-30 pointer-events-none',
                    )}
                  >
                    <span className="leading-none text-xs">{day.date.getDate()}</span>
                    {log || dayRuns.length > 0 ? (
                      <span className="flex items-center gap-0.5 h-1.5">
                        {log ? (
                          <span
                            className={cn(
                              'w-1.5 h-1.5 rounded-full',
                              getDotColor(log.workoutKey),
                              complete && 'ring-1 ring-offset-1 ring-offset-background ring-current',
                            )}
                          />
                        ) : null}
                        {dayRuns.length > 0 ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-neon-yellow" />
                        ) : null}
                      </span>
                    ) : (
                      <span className="w-1.5 h-1.5" />
                    )}
                  </button>
                )
              },
            }}
          />
        </div>
      </div>

      <WorkoutSessionDetails
        date={selectedDate}
        log={store[selectedDate]}
        onOpenWorkout={
          store[selectedDate]?.workoutKey && store[selectedDate]?.workoutKey !== REST_DAY_KEY
            ? onOpenWorkout
            : undefined
        }
        onStartWorkout={onStartWorkout}
      />

      {selectedRuns.length > 0 && (
        <div className="px-4 mb-4 space-y-3">
          {selectedRuns.map((run) => (
            <RunSessionDetails key={run.id} run={run} />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="px-4 mb-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-neon-orange" />
            <span className="font-mono text-xs text-muted-foreground">Upper</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-neon-amber" />
            <span className="font-mono text-xs text-muted-foreground">Lower</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-muted-foreground" />
            <span className="font-mono text-xs text-muted-foreground">Rest</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-neon-yellow" />
            <span className="font-mono text-xs text-muted-foreground">Run</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative w-2 h-2 rounded-full bg-neon-orange ring-1 ring-offset-1 ring-offset-background ring-neon-orange" />
            <span className="font-mono text-xs text-muted-foreground">Done</span>
          </div>
        </div>
      </div>

      {/* Week guidance */}
      <div className="px-4 mb-6">
        <div className="bg-card/30 border border-border/50 rounded-lg p-4">
          <h3 className="font-mono text-xs text-neon-orange uppercase tracking-wider mb-3">
            PROGRAM GUIDE
          </h3>
          <div className="space-y-3">
            {Object.entries(program.weeks).map(([range, tips]) => (
              <div key={range}>
                <span className="font-sans text-xs font-bold text-foreground uppercase tracking-wider">
                  {range}
                </span>
                <ul className="mt-1.5 space-y-1">
                  {(tips as string[]).map((tip, i) => (
                    <li key={i} className="font-mono text-xs text-muted-foreground flex gap-2">
                      <span className="text-neon-orange/50 shrink-0">›</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly schedule reference */}
      <div className="px-4 mb-6">
        <div className="bg-card/30 border border-border/50 rounded-lg p-4">
          <h3 className="font-mono text-xs text-neon-orange uppercase tracking-wider mb-3">
            WEEKLY SCHEDULE
          </h3>
          <div className="grid grid-cols-7 gap-1">
            {Object.entries(program.schedule).map(([day, label]) => (
              <div key={day} className="text-center">
                <div className="font-mono text-xs text-muted-foreground uppercase">
                  {day.replace('day', 'D')}
                </div>
                <div className="font-mono text-xs text-foreground mt-1 leading-tight">
                  {(label as string).split(' + ')[0]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 border-t border-border backdrop-blur-sm">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={onStartToday}
            data-haptic="success"
            className="w-full min-h-[52px] rounded-lg font-mono text-sm font-bold tracking-widest uppercase bg-neon-orange text-primary-foreground hover:opacity-90 active:opacity-75 transition-opacity neon-border-orange"
          >
            + START TODAY'S WORKOUT
          </button>
        </div>
      </div>
    </div>
  )
}
