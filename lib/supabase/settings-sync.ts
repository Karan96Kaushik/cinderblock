import type { AppSettings } from '@/lib/settings'
import { localDataBelongsToAccount } from './account-scope'
import { supabase } from '@/utils/supabase'

export async function fetchRemoteSettings(userId: string): Promise<{
  settings: AppSettings
  updatedAt: string
} | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('settings, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  return {
    settings: data.settings as AppSettings,
    updatedAt: data.updated_at,
  }
}

export async function upsertRemoteSettings(userId: string, settings: AppSettings): Promise<void> {
  const { error } = await supabase.from('user_settings').upsert(
    {
      user_id: userId,
      settings,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (error) throw new Error(error.message)
}

let settingsTimer: ReturnType<typeof setTimeout> | null = null
let pendingSettings: AppSettings | null = null

/** Debounced upsert of app settings to Supabase. */
export function scheduleSettingsBackup(userId: string, settings: AppSettings) {
  if (!localDataBelongsToAccount(userId)) return

  pendingSettings = settings
  if (settingsTimer) clearTimeout(settingsTimer)
  settingsTimer = setTimeout(() => {
    const next = pendingSettings
    pendingSettings = null
    if (!next) return
    upsertRemoteSettings(userId, next).catch((err) => {
      console.error('Settings backup failed:', err)
    })
  }, 600)
}
