import { useState, useEffect, useCallback, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { ChevronDown, ChevronUp, Plus, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Haptic } from '@/lib/haptics'
import { useAuth } from '@/hooks/use-auth'
import { readBodyMetrics, saveBodyMetrics } from '@/lib/sync/storage'

export type MetricEntry = {
  date: string
  weight?: string
  waist?: string
  chest?: string
  hips?: string
  bodyFat?: string
  notes?: string
}

export type MetricsStore = MetricEntry[]

const METRIC_FIELDS = [
  { key: 'weight' as const, label: 'Weight', unit: 'kg', inputMode: 'decimal' as const },
  { key: 'waist' as const, label: 'Waist', unit: 'cm', inputMode: 'decimal' as const },
  { key: 'chest' as const, label: 'Chest', unit: 'cm', inputMode: 'decimal' as const },
  { key: 'hips' as const, label: 'Hips', unit: 'cm', inputMode: 'decimal' as const },
  { key: 'bodyFat' as const, label: 'Body fat', unit: '%', inputMode: 'decimal' as const },
]

type MetricKey = (typeof METRIC_FIELDS)[number]['key']

function loadStore(): MetricsStore {
  return readBodyMetrics()
}

function parseNum(value?: string): number | null {
  if (!value?.trim()) return null
  const n = parseFloat(value)
  return Number.isFinite(n) ? n : null
}

function formatDelta(current?: string, previous?: string, unit?: string): string | null {
  const c = parseNum(current)
  const p = parseNum(previous)
  if (c === null || p === null) return null
  const diff = c - p
  if (diff === 0) return 'No change'
  const sign = diff > 0 ? '+' : ''
  return `${sign}${diff.toFixed(1)} ${unit ?? ''}`.trim()
}

interface MetricsTrackerProps {
  onBack: () => void
}

export function MetricsTracker({ onBack }: MetricsTrackerProps) {
  const { token } = useAuth()
  const today = format(new Date(), 'yyyy-MM-dd')
  const [store, setStore] = useState<MetricsStore>([])
  const [selectedDate, setSelectedDate] = useState(today)
  const [form, setForm] = useState<Omit<MetricEntry, 'date'>>({})
  const [notes, setNotes] = useState('')
  const [historyOpen, setHistoryOpen] = useState(true)

  const saveStore = useCallback(
    (entries: MetricsStore) => {
      const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))
      setStore(sorted)
      saveBodyMetrics(sorted, token)
    },
    [token],
  )

  useEffect(() => {
    setStore(loadStore())
  }, [])

  useEffect(() => {
    const existing = store.find((e) => e.date === selectedDate)
    if (existing) {
      setForm({
        weight: existing.weight ?? '',
        waist: existing.waist ?? '',
        chest: existing.chest ?? '',
        hips: existing.hips ?? '',
        bodyFat: existing.bodyFat ?? '',
      })
      setNotes(existing.notes ?? '')
    } else {
      setForm({})
      setNotes('')
    }
  }, [selectedDate, store])

  const previousEntry = useMemo(() => {
    const idx = store.findIndex((e) => e.date === selectedDate)
    if (idx === -1) return store.find((e) => e.date < selectedDate)
    return store[idx + 1]
  }, [store, selectedDate])

  const latestEntry = store[0]

  const hasFormData =
    METRIC_FIELDS.some((f) => form[f.key]?.trim()) || notes.trim().length > 0

  const handleFieldChange = (key: MetricKey, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    if (!hasFormData) return
    const entry: MetricEntry = {
      date: selectedDate,
      ...Object.fromEntries(
        METRIC_FIELDS.map((f) => [f.key, form[f.key]?.trim() || undefined]),
      ),
      notes: notes.trim() || undefined,
    }
    const withoutDate = store.filter((e) => e.date !== selectedDate)
    saveStore([entry, ...withoutDate])
  }

  const handleDelete = (date: string) => {
    saveStore(store.filter((e) => e.date !== date))
    if (date === selectedDate) {
      setForm({})
      setNotes('')
    }
  }

  const displayDate = format(parseISO(selectedDate + 'T12:00:00'), 'EEEE, MMM d')

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background/95 border-b border-border backdrop-blur-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3">
          <button
            onClick={onBack}
            data-haptic="light"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-neon-orange transition-colors min-h-[44px] px-1"
          >
            <span className="font-mono text-xs">← CINDERBLOCK</span>
          </button>
          <span className="font-sans text-xs font-bold tracking-widest text-neon-orange neon-text-orange">
            BODY METRICS
          </span>
          <span className="font-mono text-xs text-muted-foreground w-[100px] text-right">
            {format(new Date(), 'MMM d, yyyy')}
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-28">
        {/* Latest snapshot */}
        {latestEntry && (
          <section className="pt-6 pb-4">
            <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-3">
              Latest readings
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {METRIC_FIELDS.map((field) => {
                const value = latestEntry[field.key]
                if (!value) return null
                const prev = store[1]
                const delta = formatDelta(value, prev?.[field.key], field.unit)
                const deltaNum = parseNum(value) !== null && parseNum(prev?.[field.key]) !== null
                  ? parseNum(value)! - parseNum(prev?.[field.key])!
                  : null

                return (
                  <div
                    key={field.key}
                    className="bg-card/50 border border-border rounded-lg p-3"
                  >
                    <div className="font-mono text-xs text-muted-foreground">{field.label}</div>
                    <div className="font-sans text-lg font-bold text-foreground mt-0.5">
                      {value}
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        {field.unit}
                      </span>
                    </div>
                    {delta && deltaNum !== null && deltaNum !== 0 && (
                      <div
                        className={cn(
                          'font-mono text-xs mt-1 flex items-center gap-0.5',
                          field.key === 'waist' || field.key === 'bodyFat'
                            ? deltaNum < 0
                              ? 'text-neon-orange'
                              : 'text-muted-foreground'
                            : deltaNum > 0
                              ? 'text-neon-yellow'
                              : 'text-muted-foreground',
                        )}
                      >
                        {deltaNum > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {delta}
                      </div>
                    )}
                    <div className="font-mono text-[10px] text-muted-foreground/60 mt-1">
                      {format(parseISO(latestEntry.date + 'T12:00:00'), 'MMM d')}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Log form */}
        <section className="py-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              Log entry
            </h2>
            <input
              type="date"
              value={selectedDate}
              max={today}
              onChange={(e) => {
                setSelectedDate(e.target.value)
                Haptic.selection()
              }}
              data-haptic="selection"
              className="font-mono text-xs bg-card/50 border border-border rounded px-2 py-1.5 text-foreground min-h-[36px]"
            />
          </div>
          <p className="font-mono text-xs text-muted-foreground mb-4">{displayDate}</p>

          <div className="space-y-3 mb-4">
            {METRIC_FIELDS.map((field) => {
              const delta = previousEntry
                ? formatDelta(form[field.key], previousEntry[field.key], field.unit)
                : null

              return (
                <div key={field.key} className="bg-card/50 border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                      {field.label} ({field.unit})
                    </label>
                    {delta && form[field.key]?.trim() && (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        vs last: {delta}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    inputMode={field.inputMode}
                    value={form[field.key] ?? ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    className={cn(
                      'w-full h-11 bg-input/60 border border-border rounded-md px-3',
                      'font-mono text-base text-foreground placeholder:text-muted-foreground/40',
                      'focus:outline-none focus:border-neon-orange/60 focus:ring-1 focus:ring-neon-orange/30',
                    )}
                  />
                </div>
              )
            })}
          </div>

          <div className="mb-4">
            <label className="font-mono text-xs text-muted-foreground uppercase tracking-wider block mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sleep, energy, diet notes..."
              rows={3}
              className={cn(
                'w-full bg-input/60 border border-border rounded-md px-3 py-2',
                'font-mono text-sm text-foreground placeholder:text-muted-foreground/40',
                'focus:outline-none focus:border-neon-orange/60 focus:ring-1 focus:ring-neon-orange/30',
                'resize-none',
              )}
            />
          </div>
        </section>

        {/* History */}
        <section className="py-4">
          <button
            onClick={() => setHistoryOpen((o) => !o)}
            data-haptic="light"
            className="flex items-center justify-between w-full min-h-[44px] mb-3"
          >
            <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              History ({store.length})
            </h2>
            {historyOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {historyOpen && (
            <div className="space-y-2">
              {store.length === 0 ? (
                <p className="font-mono text-xs text-muted-foreground text-center py-8">
                  No entries yet. Log your first measurements above.
                </p>
              ) : (
                store.map((entry) => (
                  <div
                    key={entry.date}
                    className={cn(
                      'bg-card/40 border rounded-lg p-3 transition-colors',
                      entry.date === selectedDate
                        ? 'border-neon-orange/40'
                        : 'border-border',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <button
                        onClick={() => setSelectedDate(entry.date)}
                        data-haptic="selection"
                        className="text-left min-h-[36px]"
                      >
                        <div className="font-sans text-sm font-bold text-foreground">
                          {format(parseISO(entry.date + 'T12:00:00'), 'MMM d, yyyy')}
                        </div>
                        {entry.date === today && (
                          <span className="font-mono text-[10px] text-neon-orange">TODAY</span>
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(entry.date)}
                        data-haptic="warning"
                        className="p-2 text-muted-foreground hover:text-neon-red transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                        aria-label="Delete entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {METRIC_FIELDS.map((field) => {
                        const value = entry[field.key]
                        if (!value) return null
                        return (
                          <span
                            key={field.key}
                            className="font-mono text-xs bg-background/50 border border-border/60 rounded px-2 py-1 text-muted-foreground"
                          >
                            {field.label}: {value} {field.unit}
                          </span>
                        )
                      })}
                    </div>
                    {entry.notes && (
                      <p className="font-mono text-xs text-muted-foreground/80 mt-2 leading-relaxed">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* Program reference */}
        <section className="py-4 mb-4">
          <div className="bg-card/20 border border-border/40 rounded-lg p-4">
            <h3 className="font-mono text-xs text-neon-orange uppercase tracking-wider mb-2">
              Track weekly
            </h3>
            <ul className="space-y-1.5">
              <li className="font-mono text-xs text-muted-foreground flex gap-2">
                <span className="text-neon-orange/40 shrink-0">›</span>
                <span>Weigh yourself at the same time each week</span>
              </li>
              <li className="font-mono text-xs text-muted-foreground flex gap-2">
                <span className="text-neon-orange/40 shrink-0">›</span>
                <span>Measure waist at navel level, relaxed</span>
              </li>
              <li className="font-mono text-xs text-muted-foreground flex gap-2">
                <span className="text-neon-orange/40 shrink-0">›</span>
                <span>Stable or slightly increasing weight supports muscle gain</span>
              </li>
            </ul>
          </div>
        </section>
      </div>

      {/* Sticky save */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 border-t border-border backdrop-blur-sm">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={handleSave}
            disabled={!hasFormData}
            data-haptic="success"
            className={cn(
              'w-full min-h-[52px] rounded-lg font-mono text-sm font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2',
              hasFormData
                ? 'bg-neon-orange text-primary-foreground hover:opacity-90 active:opacity-75 neon-border-orange'
                : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50',
            )}
          >
            <Plus className="w-4 h-4" />
            {store.some((e) => e.date === selectedDate) ? 'UPDATE ENTRY' : 'SAVE ENTRY'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function getLatestMetrics(): MetricsStore {
  return loadStore()
}

export function getLatestMetricValue(
  store: MetricsStore,
  key: MetricKey,
): string | undefined {
  for (const entry of store) {
    const value = entry[key]
    if (value?.trim()) return value
  }
  return undefined
}
