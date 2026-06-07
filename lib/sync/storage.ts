import type { GymStore } from '@/components/gym/gym-tracker'
import type { MetricsStore } from '@/components/metrics/metrics-tracker'
import {
  fetchRemoteSync,
  isSyncAvailable,
  mergeLocalAndRemote,
  pushRemoteSync,
} from './api-client'
import { withGymTimestamps, withMetricsTimestamps } from './merge'
import { STORAGE_KEYS } from './types'

export function readGymLog(): GymStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.gymLog)
    if (!raw) return {}
    return JSON.parse(raw) as GymStore
  } catch {
    return {}
  }
}

export function readBodyMetrics(): MetricsStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.bodyMetrics)
    if (!raw) return []
    const parsed = JSON.parse(raw) as MetricsStore
    return [...parsed].sort((a, b) => b.date.localeCompare(a.date))
  } catch {
    return []
  }
}

export function writeGymLog(store: GymStore) {
  const stamped = withGymTimestamps(store as Record<string, Record<string, unknown>>)
  localStorage.setItem(STORAGE_KEYS.gymLog, JSON.stringify(stamped))
}

export function writeBodyMetrics(store: MetricsStore) {
  const sorted = [...store].sort((a, b) => b.date.localeCompare(a.date))
  const stamped = withMetricsTimestamps(sorted as Record<string, unknown>[])
  localStorage.setItem(STORAGE_KEYS.bodyMetrics, JSON.stringify(stamped))
}

let pushTimer: ReturnType<typeof setTimeout> | null = null

export function scheduleRemotePush(token: string, gymLog: GymStore, bodyMetrics: MetricsStore) {
  if (!isSyncAvailable()) return

  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(async () => {
    try {
      await pushRemoteSync(token, readGymLog(), readBodyMetrics())
    } catch (error) {
      console.error('Sync push failed:', error)
    }
  }, 800)
}

export async function pullAndMerge(token: string): Promise<{ gymLog: GymStore; bodyMetrics: MetricsStore }> {
  const localGym = readGymLog()
  const localMetrics = readBodyMetrics()

  if (!isSyncAvailable()) {
    return { gymLog: localGym, bodyMetrics: localMetrics }
  }

  const remote = await fetchRemoteSync(token)
  const merged = mergeLocalAndRemote(
    localGym,
    localMetrics,
    remote.gymLog,
    remote.bodyMetrics,
  )

  writeGymLog(merged.gymLog)
  writeBodyMetrics(merged.bodyMetrics)

  const pushed = await pushRemoteSync(token, merged.gymLog, merged.bodyMetrics)

  writeGymLog(pushed.gymLog as GymStore)
  writeBodyMetrics(pushed.bodyMetrics as MetricsStore)

  return {
    gymLog: pushed.gymLog as GymStore,
    bodyMetrics: pushed.bodyMetrics as MetricsStore,
  }
}

export function saveGymLog(store: GymStore, token?: string | null) {
  writeGymLog(store)
  if (token) {
    scheduleRemotePush(token, store, readBodyMetrics())
  }
}

export function saveBodyMetrics(store: MetricsStore, token?: string | null) {
  writeBodyMetrics(store)
  if (token) {
    scheduleRemotePush(token, readGymLog(), store)
  }
}
