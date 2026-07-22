import { format } from 'date-fns'
import {
  buildTrainingLogsBackup,
  type TrainingLogsBackup,
} from '@/lib/training-backup'
import type { UserBackupRow } from './database.types'
import { getSupabase } from './client'

export type CloudBackupSummary = {
  id: string
  label: string | null
  createdAt: string
  gymDays: number
  runs: number
  metrics: number
}

export async function listCloudBackups(userId: string): Promise<CloudBackupSummary[]> {
  const { data, error } = await getSupabase()
    .from('user_backups')
    .select('id, label, created_at, payload')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => {
    const payload = row.payload as TrainingLogsBackup
    return {
      id: row.id,
      label: row.label,
      createdAt: row.created_at,
      gymDays: Object.keys(payload.gymLog ?? {}).length,
      runs: payload.runLog?.length ?? 0,
      metrics: payload.bodyMetrics?.length ?? 0,
    }
  })
}

export async function uploadCloudBackup(
  userId: string,
  label?: string,
): Promise<CloudBackupSummary> {
  const payload = buildTrainingLogsBackup()
  const backupLabel =
    label?.trim() || `Backup ${format(new Date(), 'yyyy-MM-dd HH:mm')}`

  const { data, error } = await getSupabase()
    .from('user_backups')
    .insert({
      user_id: userId,
      payload,
      label: backupLabel,
    })
    .select('id, label, created_at, payload')
    .single()

  if (error) throw new Error(error.message)

  const saved = data as UserBackupRow
  return {
    id: saved.id,
    label: saved.label,
    createdAt: saved.created_at,
    gymDays: Object.keys(payload.gymLog).length,
    runs: payload.runLog.length,
    metrics: payload.bodyMetrics.length,
  }
}

export async function fetchCloudBackup(
  userId: string,
  backupId: string,
): Promise<TrainingLogsBackup> {
  const { data, error } = await getSupabase()
    .from('user_backups')
    .select('payload')
    .eq('user_id', userId)
    .eq('id', backupId)
    .single()

  if (error) throw new Error(error.message)
  return data.payload as TrainingLogsBackup
}

export async function deleteCloudBackup(userId: string, backupId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('user_backups')
    .delete()
    .eq('user_id', userId)
    .eq('id', backupId)

  if (error) throw new Error(error.message)
}
