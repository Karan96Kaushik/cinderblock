import { format } from 'date-fns'
import { getDeviceId } from '@/lib/device-id'
import {
  buildTrainingLogsBackup,
  type TrainingLogsBackup,
} from '@/lib/training-backup'
import { localDataBelongsToAccount } from './account-scope'
import type { UserBackupRow } from './database.types'
import { supabase } from '@/utils/supabase'

export type CloudBackupSummary = {
  id: string
  label: string | null
  createdAt: string
  deviceId: string
  gymDays: number
  runs: number
  metrics: number
}

function toSummary(row: {
  id: string
  label: string | null
  created_at: string
  device_id: string
  payload: TrainingLogsBackup
}): CloudBackupSummary {
  return {
    id: row.id,
    label: row.label,
    createdAt: row.created_at,
    deviceId: row.device_id,
    gymDays: Object.keys(row.payload.gymLog ?? {}).length,
    runs: row.payload.runLog?.length ?? 0,
    metrics: row.payload.bodyMetrics?.length ?? 0,
  }
}

/** List backups for this account on this device only. */
export async function listCloudBackups(userId: string): Promise<CloudBackupSummary[]> {
  const deviceId = getDeviceId()
  const { data, error } = await supabase
    .from('user_backups')
    .select('id, label, created_at, device_id, payload')
    .eq('user_id', userId)
    .eq('device_id', deviceId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) =>
    toSummary({
      ...row,
      payload: row.payload as TrainingLogsBackup,
    }),
  )
}

export async function uploadCloudBackup(
  userId: string,
  label?: string,
): Promise<CloudBackupSummary> {
  if (!localDataBelongsToAccount(userId)) {
    throw new Error(
      'Local data belongs to a different account. Sign out, clear local data, or continue only after switching back.',
    )
  }

  const deviceId = getDeviceId()
  const payload = buildTrainingLogsBackup()
  const backupLabel =
    label?.trim() || `Backup ${format(new Date(), 'yyyy-MM-dd HH:mm')}`

  const { data, error } = await supabase
    .from('user_backups')
    .insert({
      user_id: userId,
      device_id: deviceId,
      payload,
      label: backupLabel,
    })
    .select('id, label, created_at, device_id, payload')
    .single()

  if (error) throw new Error(error.message)

  const saved = data as UserBackupRow
  return toSummary({
    id: saved.id,
    label: saved.label,
    created_at: saved.created_at,
    device_id: saved.device_id,
    payload,
  })
}

export async function fetchCloudBackup(
  userId: string,
  backupId: string,
): Promise<TrainingLogsBackup> {
  const deviceId = getDeviceId()
  const { data, error } = await supabase
    .from('user_backups')
    .select('payload')
    .eq('user_id', userId)
    .eq('device_id', deviceId)
    .eq('id', backupId)
    .single()

  if (error) throw new Error(error.message)
  return data.payload as TrainingLogsBackup
}

export async function deleteCloudBackup(userId: string, backupId: string): Promise<void> {
  const deviceId = getDeviceId()
  const { error } = await supabase
    .from('user_backups')
    .delete()
    .eq('user_id', userId)
    .eq('device_id', deviceId)
    .eq('id', backupId)

  if (error) throw new Error(error.message)
}
