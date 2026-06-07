import { format } from 'date-fns'
import type { GymStore } from '@/components/gym/gym-tracker'
import { readRunLog, type RunSessionLog } from '@/lib/running'
import { readGymLog } from '@/lib/sync/storage'

export type TrainingLogsBackup = {
  version: 1
  exportedAt: string
  gymLog: GymStore
  runLog: RunSessionLog[]
}

export function buildTrainingLogsBackup(): TrainingLogsBackup {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    gymLog: readGymLog(),
    runLog: readRunLog(),
  }
}

export function downloadTrainingLogsBackup(): { gymDays: number; runs: number } {
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
  }
}
