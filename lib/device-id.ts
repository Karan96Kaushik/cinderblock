import { supabase } from '@/utils/supabase'
import type { TrainingLogsBackup } from '@/lib/training-backup'

const DEVICE_ID_KEY = 'cinderblock_device_id'
const PREVIOUS_DEVICE_ID_KEY = 'cinderblock_device_id_previous'
const DEVICE_ID_PREFIX = 'cbdev_'

/** Legacy random UUID from the previous generator. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function readPlatform(): string {
  if (typeof navigator === 'undefined') return 'unknown'
  const uaData = (
    navigator as Navigator & { userAgentData?: { platform?: string } }
  ).userAgentData
  return (uaData?.platform || navigator.platform || 'unknown').trim() || 'unknown'
}

function readScreenSize(): string {
  if (typeof screen === 'undefined') return '0x0'
  return `${screen.width}x${screen.height}`
}

/** FNV-1a 64-bit → 16 hex chars (sync, stable). */
function fnv1a64Hex(input: string): string {
  let hash = 0xcbf29ce484222325n
  const prime = 0x100000001b3n
  for (let i = 0; i < input.length; i++) {
    hash ^= BigInt(input.charCodeAt(i))
    hash = BigInt.asUintN(64, hash * prime)
  }
  return hash.toString(16).padStart(16, '0')
}

/**
 * Deterministic id for this browser profile from platform + screen size.
 * Same inputs → same id even after localStorage is cleared.
 */
export function computeDeterministicDeviceId(): string {
  const material = `cinderblock-device-v1|${readPlatform()}|${readScreenSize()}`
  return `${DEVICE_ID_PREFIX}${fnv1a64Hex(material)}`
}

export function isLegacyDeviceId(id: string): boolean {
  if (!id || id === 'unknown-device') return true
  if (id.startsWith(DEVICE_ID_PREFIX)) return false
  if (UUID_RE.test(id)) return true
  if (id.startsWith('dev_')) return true
  if (id === 'legacy-unscoped') return true
  return true
}

/**
 * Stable per-browser-profile device id (cached in localStorage).
 * Source of truth is the deterministic fingerprint; cache is for speed.
 * When the cached value differs (legacy random id or fingerprint change),
 * the previous id is stashed for server-side remint.
 */
export function getDeviceId(): string {
  const computed = computeDeterministicDeviceId()

  try {
    const cached = localStorage.getItem(DEVICE_ID_KEY)

    if (!cached) {
      localStorage.setItem(DEVICE_ID_KEY, computed)
      return computed
    }

    if (cached === computed) {
      return computed
    }

    // Legacy random id or fingerprint drift — keep previous for migration
    localStorage.setItem(PREVIOUS_DEVICE_ID_KEY, cached)
    localStorage.setItem(DEVICE_ID_KEY, computed)
    return computed
  } catch {
    return computed
  }
}

export function peekPreviousDeviceId(): string | null {
  try {
    return localStorage.getItem(PREVIOUS_DEVICE_ID_KEY)
  } catch {
    return null
  }
}

function clearPreviousDeviceId() {
  try {
    localStorage.removeItem(PREVIOUS_DEVICE_ID_KEY)
  } catch {
    // ignore
  }
}

/**
 * Remint cloud rows from a legacy/previous device_id onto the deterministic id.
 * Safe to call on every login; no-ops when nothing to migrate.
 */
export async function migrateLegacyDeviceIdIfNeeded(userId: string): Promise<void> {
  // Ensure cache is reconciled and previous id is stashed if needed
  const current = getDeviceId()
  let previous = peekPreviousDeviceId()

  // First run after upgrade: cached was already overwritten elsewhere, or
  // getDeviceId just stashed it. Also handle case where only current exists
  // but we never stashed (e.g. old session still holding UUID in memory only).
  if (!previous) {
    clearPreviousDeviceId()
    return
  }

  if (previous === current) {
    clearPreviousDeviceId()
    return
  }

  try {
    await remintDeviceScopedRows(userId, previous, current)
    clearPreviousDeviceId()
  } catch (err) {
    console.error('Device id migration failed:', err)
    // Keep previous key so a later sync can retry
  }
}

async function remintDeviceScopedRows(
  userId: string,
  fromDeviceId: string,
  toDeviceId: string,
): Promise<void> {
  // --- user_backups: rewrite device_id ---
  const { error: backupError } = await supabase
    .from('user_backups')
    .update({ device_id: toDeviceId })
    .eq('user_id', userId)
    .eq('device_id', fromDeviceId)

  if (backupError) throw new Error(backupError.message)

  // --- user_training_logs: merge if both exist, else rename ---
  const { data: rows, error: fetchError } = await supabase
    .from('user_training_logs')
    .select('device_id, payload, updated_at')
    .eq('user_id', userId)
    .in('device_id', [fromDeviceId, toDeviceId])

  if (fetchError) throw new Error(fetchError.message)

  const fromRow = rows?.find((r) => r.device_id === fromDeviceId)
  const toRow = rows?.find((r) => r.device_id === toDeviceId)

  if (fromRow && !toRow) {
    const { error: insertError } = await supabase.from('user_training_logs').insert({
      user_id: userId,
      device_id: toDeviceId,
      payload: fromRow.payload as TrainingLogsBackup,
      updated_at: fromRow.updated_at,
    })
    if (insertError) throw new Error(insertError.message)

    const { error: deleteError } = await supabase
      .from('user_training_logs')
      .delete()
      .eq('user_id', userId)
      .eq('device_id', fromDeviceId)

    if (deleteError) throw new Error(deleteError.message)
    return
  }

  if (fromRow && toRow) {
    // Prefer the newer payload; drop the legacy row
    const fromTs = Date.parse(fromRow.updated_at) || 0
    const toTs = Date.parse(toRow.updated_at) || 0
    if (fromTs > toTs) {
      const { error: updateError } = await supabase
        .from('user_training_logs')
        .update({
          payload: fromRow.payload as TrainingLogsBackup,
          updated_at: fromRow.updated_at,
        })
        .eq('user_id', userId)
        .eq('device_id', toDeviceId)

      if (updateError) throw new Error(updateError.message)
    }

    const { error: deleteError } = await supabase
      .from('user_training_logs')
      .delete()
      .eq('user_id', userId)
      .eq('device_id', fromDeviceId)

    if (deleteError) throw new Error(deleteError.message)
  }
}
