import type { AppSettings } from '@/lib/settings'
import { getSupabase } from './client'

export async function fetchRemoteSettings(userId: string): Promise<{
  settings: AppSettings
  updatedAt: string
} | null> {
  const { data, error } = await getSupabase()
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
  const { error } = await getSupabase().from('user_settings').upsert(
    {
      user_id: userId,
      settings,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (error) throw new Error(error.message)
}
