import { format } from 'date-fns'
import type { GymStore } from '@/components/gym/gym-tracker'
import type { MetricsStore } from '@/components/metrics/metrics-tracker'
import { readRunLog, readDefaultRunningPlan, type RunSessionLog, type RunningPlan } from '@/lib/running'
import { readSettings, type AppSettings } from '@/lib/settings'
import { readBodyMetrics, readGymLog } from '@/lib/sync/storage'

export type TrainingLogsBackup = {
  version: 2
  exportedAt: string
  settings: AppSettings
  defaultRunningPlan: RunningPlan
  gymLog: GymStore
  runLog: RunSessionLog[]
  bodyMetrics: MetricsStore
}

export function buildTrainingLogsBackup(): TrainingLogsBackup {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    settings: readSettings(),
    defaultRunningPlan: readDefaultRunningPlan(),
    gymLog: readGymLog(),
    runLog: readRunLog(),
    bodyMetrics: readBodyMetrics(),
  }
}

export function downloadTrainingLogsBackup(): {
  gymDays: number
  runs: number
  metrics: number
} {
  const backup = buildTrainingLogsBackup()
  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `cinderblock-training-logs-${format(new Date(), 'yyyy-MM-dd')}.json`
  link.click()
  URL.revokeObjectURL(url)

  return {
    gymDays: Object.keys(backup.gymLog).length,
    runs: backup.runLog.length,
    metrics: backup.bodyMetrics.length,
  }
}
