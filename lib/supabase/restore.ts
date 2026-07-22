import type { GymStore } from '@/components/gym/gym-tracker'
import type { MetricsStore } from '@/components/metrics/metrics-tracker'
import type { TrainingLogsBackup } from '@/lib/training-backup'
import { writeSettings, type AppSettings } from '@/lib/settings'
import { writeRunLog, type RunSessionLog } from '@/lib/running'
import { writeBodyMetrics, writeGymLog } from '@/lib/sync/storage'
import { notifyActivePlanChanged } from './cloud-sync'

export type RestoreResult = {
  settings: AppSettings
  gymDays: number
  runs: number
  metrics: number
}

/** Apply a training backup to local storage (settings, plan, logs). */
export function restoreTrainingBackupLocally(backup: TrainingLogsBackup): RestoreResult {
  writeSettings(backup.settings)
  notifyActivePlanChanged(backup.defaultRunningPlan)
  writeGymLog(backup.gymLog as GymStore)
  writeRunLog(backup.runLog as RunSessionLog[])
  writeBodyMetrics(backup.bodyMetrics as MetricsStore)

  return {
    settings: backup.settings,
    gymDays: Object.keys(backup.gymLog).length,
    runs: backup.runLog.length,
    metrics: backup.bodyMetrics.length,
  }
}
