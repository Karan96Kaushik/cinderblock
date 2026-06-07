import type { Timestamped } from './types'

export function stampRecord<T extends Record<string, unknown>>(record: T): T & { updatedAt: number } {
  return { ...record, updatedAt: Date.now() }
}

export function mergeGymLogs<T extends Timestamped>(
  local: Record<string, T>,
  remote: Record<string, T>,
): Record<string, T> {
  const merged: Record<string, T> = { ...remote }
  for (const [date, localEntry] of Object.entries(local)) {
    const remoteEntry = merged[date]
    const localTs = localEntry.updatedAt ?? 0
    const remoteTs = remoteEntry?.updatedAt ?? 0
    if (!remoteEntry || localTs >= remoteTs) {
      merged[date] = localEntry
    }
  }
  return merged
}

export function mergeBodyMetrics<T extends Timestamped>(
  local: T[],
  remote: T[],
): T[] {
  const byDate = new Map<string, T>()

  for (const entry of remote) {
    if (!entry.date) continue
    byDate.set(entry.date, entry)
  }

  for (const entry of local) {
    if (!entry.date) continue
    const existing = byDate.get(entry.date)
    const localTs = entry.updatedAt ?? 0
    const remoteTs = existing?.updatedAt ?? 0
    if (!existing || localTs >= remoteTs) {
      byDate.set(entry.date, entry)
    }
  }

  return [...byDate.values()].sort((a, b) => String(b.date).localeCompare(String(a.date)))
}

export function withGymTimestamps<T extends Record<string, unknown>>(
  gymLog: Record<string, T>,
): Record<string, T & { updatedAt: number }> {
  const result: Record<string, T & { updatedAt: number }> = {}
  for (const [date, entry] of Object.entries(gymLog)) {
    result[date] = stampRecord(entry)
  }
  return result
}

export function withMetricsTimestamps<T extends Record<string, unknown>>(
  metrics: T[],
): (T & { updatedAt: number })[] {
  return metrics.map((entry) => stampRecord(entry))
}
