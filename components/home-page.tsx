import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Calendar, ChevronRight, Dumbbell, TrendingUp } from 'lucide-react'
import program from '@/foundation-7-june.json'
import { CyberGrid } from '@/components/cyber-grid'
import { CyberHeader } from '@/components/cyber-header'
import { GlitchText } from '@/components/glitch-text'
import type { GymStore } from '@/components/gym/gym-tracker'

const STORAGE_KEY = 'cinderblock_gym_log'

interface HomePageProps {
  onStartTraining: () => void
}

function getTrainingStats(store: GymStore) {
  const dates = Object.keys(store)
  const completed = dates.filter((date) => {
    const log = store[date]
    if (!log) return false
    if (log.workoutKey === 'rest') return true
    const exercises = Object.values(log.exercises)
    return exercises.length > 0 && exercises.every((e) => e.completed)
  })
  return { sessions: dates.length, completed: completed.length }
}

export function HomePage({ onStartTraining }: HomePageProps) {
  const [stats, setStats] = useState({ sessions: 0, completed: 0 })

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setStats(getTrainingStats(JSON.parse(raw) as GymStore))
    } catch {
      // ignore corrupt storage
    }
  }, [])

  const todayLabel = format(new Date(), 'EEEE, MMMM d')
  const scheduleEntries = Object.entries(program.schedule)

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <CyberGrid />
      <CyberHeader onTrainingClick={onStartTraining} />

      <main className="relative z-10 pt-24 pb-20">
        <section className="max-w-3xl mx-auto px-4 py-10 md:py-16">
          {/* Hero */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-card/50 border border-neon-orange/40 rounded-full mb-6 font-mono text-xs neon-border-orange">
              <Dumbbell className="w-3.5 h-3.5 text-neon-orange" />
              <span className="text-muted-foreground">STRENGTH PROGRAM</span>
              <span className="text-neon-orange">// v{program.version}</span>
            </div>

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-sans font-bold tracking-tight mb-4">
              <GlitchText className="fire-gradient-text">FOUNDATION</GlitchText>
              <br />
              <span className="fire-gradient-text neon-text-orange">STRENGTH</span>
            </h1>

            <p className="max-w-xl text-base md:text-lg text-muted-foreground font-mono leading-relaxed mb-8">
              Track your 4-day split, log sets and reps, and build consistency week
              after week — built for strength alongside running.
            </p>

            <button
              onClick={onStartTraining}
              className="w-full sm:w-auto min-h-[52px] px-8 rounded-lg font-mono text-sm font-bold tracking-widest uppercase bg-neon-orange text-primary-foreground hover:opacity-90 active:opacity-75 transition-opacity neon-border-orange flex items-center justify-center gap-2"
            >
              START TRAINING
              <ChevronRight className="w-4 h-4" />
            </button>

            <p className="font-mono text-xs text-muted-foreground mt-4">{todayLabel}</p>
          </div>

          {/* Stats from local log */}
          {(stats.sessions > 0 || stats.completed > 0) && (
            <div className="grid grid-cols-2 gap-3 mb-12">
              <div className="bg-card/50 border border-border rounded-lg p-4 text-center">
                <div className="font-sans text-2xl font-bold text-neon-orange">{stats.sessions}</div>
                <div className="font-mono text-xs text-muted-foreground mt-1">SESSIONS LOGGED</div>
              </div>
              <div className="bg-card/50 border border-border rounded-lg p-4 text-center">
                <div className="font-sans text-2xl font-bold text-neon-yellow">{stats.completed}</div>
                <div className="font-mono text-xs text-muted-foreground mt-1">COMPLETED</div>
              </div>
            </div>
          )}

          {/* Goals */}
          <section id="program" className="mb-14">
            <SectionDivider label="PROGRAM GOALS" />
            <div className="grid sm:grid-cols-2 gap-3">
              {program.goal.map((goal, index) => (
                <div
                  key={goal}
                  className="flex items-start gap-3 bg-card/50 border border-border rounded-lg p-4"
                >
                  <span className="font-mono text-xs text-neon-orange shrink-0 pt-0.5">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="font-sans text-sm text-foreground">{goal}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Weekly schedule */}
          <section id="schedule" className="mb-14">
            <SectionDivider label="WEEKLY SCHEDULE" />
            <div className="bg-card/50 border border-border rounded-lg p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4 text-neon-orange">
                <Calendar className="w-4 h-4" />
                <span className="font-mono text-xs uppercase tracking-wider">4-day split + running</span>
              </div>
              <div className="space-y-3">
                {scheduleEntries.map(([day, label], index) => (
                  <div
                    key={day}
                    className="flex items-center gap-4 py-2 border-b border-border/50 last:border-0"
                  >
                    <span className="font-mono text-xs text-neon-orange w-8 shrink-0">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground uppercase w-12 shrink-0">
                      {day.replace('day', 'Day ')}
                    </span>
                    <span className="font-sans text-sm text-foreground">{label as string}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Workouts overview */}
          <section className="mb-14">
            <SectionDivider label="WORKOUT TYPES" />
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(program.workouts).map(([key, workout]) => (
                <div
                  key={key}
                  className="bg-card/40 border border-border rounded-lg p-4 hover:border-neon-orange/40 transition-colors"
                >
                  <div
                    className={`font-sans text-sm font-bold tracking-wider uppercase mb-1 ${
                      key.startsWith('upper') ? 'text-neon-orange' : 'text-neon-amber'
                    }`}
                  >
                    {workout.name}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {workout.exercises.length} exercises
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Progression */}
          <section id="progression" className="mb-14">
            <SectionDivider label="PROGRESSION" />
            <div className="bg-card/50 border border-border rounded-lg p-5 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-neon-yellow" />
                <span className="font-sans text-sm font-bold text-foreground">
                  {program.progression.method}
                </span>
              </div>
              <p className="font-mono text-xs text-muted-foreground leading-relaxed mb-4">
                Hit the top of the rep range on all sets, then increase weight by the
                smallest increment. Track every session to see progress clearly.
              </p>
              <div className="bg-background/50 border border-border/60 rounded-md p-3 font-mono text-xs text-muted-foreground space-y-1">
                <div>
                  <span className="text-neon-orange">{program.progression.example.exercise}</span>
                  {' — '}
                  {program.progression.example.nextStep}
                </div>
                <div className="text-muted-foreground/70">
                  W1 → W2 → W3: add reps, then add weight
                </div>
              </div>
            </div>
          </section>

          {/* Bottom CTA */}
          <div className="text-center pt-4">
            <p className="font-mono text-xs text-muted-foreground mb-4">
              Ready to log today&apos;s session?
            </p>
            <button
              onClick={onStartTraining}
              className="w-full sm:w-auto min-h-[48px] px-6 rounded-lg border border-neon-orange/50 font-mono text-sm tracking-widest uppercase text-neon-orange hover:bg-neon-orange/10 transition-colors"
            >
              OPEN TRAINING LOG
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 mb-6">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neon-orange/50 to-transparent" />
      <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground shrink-0">
        [{label}]
      </h2>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neon-orange/50 to-transparent" />
    </div>
  )
}
