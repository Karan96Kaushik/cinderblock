import type { GymStore } from '@/components/gym/gym-tracker'
import type { MetricsStore } from '@/components/metrics/metrics-tracker'
import type { RunSessionLog } from '@/lib/running'
import { readRunLog, writeRunLog } from '@/lib/running'
import type { TrainingLogsBackup } from '@/lib/training-backup'
import { buildTrainingLogsBackup } from '@/lib/training-backup'
import { getDeviceId } from '@/lib/device-id'
import { mergeBodyMetrics, mergeGymLogs } from '@/lib/sync/merge'
import { readBodyMetrics, readGymLog, writeBodyMetrics, writeGymLog } from '@/lib/sync/storage'
import { TRAINING_LOG_EVENT, notifyTrainingLogChanged } from '@/lib/sync/events'
import { localDataBelongsToAccount } from './account-scope'
import { supabase } from '@/utils/supabase'

export { TRAINING_LOG_EVENT, notifyTrainingLogChanged }

export type TrainingLogPayload = {
  gymLog: GymStore
  runLog: RunSessionLog[]
  bodyMetrics: MetricsStore
  settings?: TrainingLogsBackup['settings']
  defaultRunningPlan?: TrainingLogsBackup['defaultRunningPlan']
  exportedAt?: string
  version?: number
}

function mergeRunLogs(local: RunSessionLog[], remote: RunSessionLog[]): RunSessionLog[] {
  const byId = new Map<string, RunSessionLog>()
  for (const entry of remote) byId.set(entry.id, entry)
  for (const entry of local) {
    const existing = byId.get(entry.id)
    if (!existing || entry.completedAt >= existing.completedAt) {
      byId.set(entry.id, entry)
    }
  }
  return [...byId.values()].sort((a, b) => b.completedAt - a.completedAt)
}

export async function fetchRemoteTrainingLog(
  userId: string,
  deviceId: string = getDeviceId(),
): Promise<TrainingLogPayload | null> {
  const { data, error } = await supabase
    .from('user_training_logs')
    .select('payload, updated_at')
    .eq('user_id', userId)
    .eq('device_id', deviceId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return data.payload as TrainingLogPayload
}

export type RemoteDeviceTrainingLog = {
  deviceId: string
  updatedAt: string
  gymDays: number
  runs: number
  metrics: number
  isCurrent: boolean
}

/** List training-log rows for this account across devices (current device included). */
export async function listAccountTrainingLogDevices(
  userId: string,
): Promise<RemoteDeviceTrainingLog[]> {
  const currentDeviceId = getDeviceId()
  const { data, error } = await supabase
    .from('user_training_logs')
    .select('device_id, updated_at, payload')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => {
    const payload = row.payload as TrainingLogPayload
    return {
      deviceId: row.device_id,
      updatedAt: row.updated_at,
      gymDays: Object.keys(payload.gymLog ?? {}).length,
      runs: payload.runLog?.length ?? 0,
      metrics: payload.bodyMetrics?.length ?? 0,
      isCurrent: row.device_id === currentDeviceId,
    }
  })
}

/**
 * Merge another device's cloud training logs into this device's local + cloud copy.
 * Does not change app settings or the active run plan.
 */
export async function importTrainingLogFromDevice(
  userId: string,
  sourceDeviceId: string,
): Promise<{ gymDays: number; runs: number; metrics: number }> {
  if (!localDataBelongsToAccount(userId)) {
    throw new Error('Local data belongs to a different account.')
  }

  const currentDeviceId = getDeviceId()
  if (sourceDeviceId === currentDeviceId) {
    throw new Error('That is already this device.')
  }

  const remote = await fetchRemoteTrainingLog(userId, sourceDeviceId)
  if (!remote) {
    throw new Error('No training logs found for that device.')
  }

  const localGym = readGymLog()
  const localMetrics = readBodyMetrics()
  const localRuns = readRunLog()

  const mergedGym = mergeGymLogs(
    localGym as Record<string, { updatedAt?: number }>,
    (remote.gymLog ?? {}) as Record<string, { updatedAt?: number }>,
  ) as GymStore

  const mergedMetrics = mergeBodyMetrics(
    localMetrics as Array<{ updatedAt?: number; date?: string }>,
    (remote.bodyMetrics ?? []) as Array<{ updatedAt?: number; date?: string }>,
  ) as unknown as MetricsStore

  const mergedRuns = mergeRunLogs(localRuns, remote.runLog ?? [])

  writeGymLog(mergedGym, { silent: true })
  writeBodyMetrics(mergedMetrics, { silent: true })
  writeRunLog(mergedRuns, { silent: true })
  notifyTrainingLogChanged()

  await upsertRemoteTrainingLog(userId, {
    gymLog: mergedGym,
    runLog: mergedRuns,
    bodyMetrics: mergedMetrics,
  })

  return {
    gymDays: Object.keys(mergedGym).length,
    runs: mergedRuns.length,
    metrics: mergedMetrics.length,
  }
}

export async function upsertRemoteTrainingLog(
  userId: string,
  payload?: TrainingLogPayload,
): Promise<void> {
  if (!localDataBelongsToAccount(userId)) return

  const deviceId = getDeviceId()
  const snapshot = buildTrainingLogsBackup()
  const full = payload ?? snapshot
  const body: TrainingLogsBackup = {
    version: 2,
    exportedAt: new Date().toISOString(),
    settings: full.settings ?? snapshot.settings,
    defaultRunningPlan: full.defaultRunningPlan ?? snapshot.defaultRunningPlan,
    gymLog: full.gymLog,
    runLog: full.runLog,
    bodyMetrics: full.bodyMetrics,
  }

  const { error } = await supabase.from('user_training_logs').upsert(
    {
      user_id: userId,
      device_id: deviceId,
      payload: body,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,device_id' },
  )

  if (error) throw new Error(error.message)
}

/**
 * Merge remote training logs into local storage, then push the merged result.
 * Seeds remote from local when no remote row exists.
 */
export async function pullAndMergeTrainingLog(userId: string): Promise<void> {
  const canUseLocal = localDataBelongsToAccount(userId)
  const localGym = readGymLog()
  const localMetrics = readBodyMetrics()
  const localRuns = readRunLog()

  const remote = await fetchRemoteTrainingLog(userId)

  if (!remote) {
    if (canUseLocal) {
      await upsertRemoteTrainingLog(userId)
    }
    return
  }

  const mergedGym = mergeGymLogs(
    localGym as Record<string, { updatedAt?: number }>,
    (remote.gymLog ?? {}) as Record<string, { updatedAt?: number }>,
  ) as GymStore

  const mergedMetrics = mergeBodyMetrics(
    localMetrics as Array<{ updatedAt?: number; date?: string }>,
    (remote.bodyMetrics ?? []) as Array<{ updatedAt?: number; date?: string }>,
  ) as unknown as MetricsStore

  const mergedRuns = mergeRunLogs(localRuns, remote.runLog ?? [])

  writeGymLog(mergedGym, { silent: true })
  writeBodyMetrics(mergedMetrics, { silent: true })
  writeRunLog(mergedRuns, { silent: true })
  // One event after silent writes so Home / Gym / Metrics refresh without echo-pushing mid-pull
  notifyTrainingLogChanged()

  await upsertRemoteTrainingLog(userId, {
    gymLog: mergedGym,
    runLog: mergedRuns,
    bodyMetrics: mergedMetrics,
  })
}

let backupTimer: ReturnType<typeof setTimeout> | null = null

/** Debounced upsert of the current device training log to Supabase. */
export function scheduleTrainingLogBackup(userId: string) {
  if (!localDataBelongsToAccount(userId)) return

  if (backupTimer) clearTimeout(backupTimer)
  backupTimer = setTimeout(() => {
    upsertRemoteTrainingLog(userId).catch((err) => {
      console.error('Training log backup failed:', err)
    })
  }, 1000)
}
