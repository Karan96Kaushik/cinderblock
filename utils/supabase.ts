import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Project URL must be the origin only, e.g. https://xxxx.supabase.co
 * Pasting .../rest/v1 makes auth hit rest/v1/auth/v1/* (PGRST125).
 */
export function normalizeSupabaseUrl(raw: string | undefined): string {
  const value = (raw ?? '').trim()
  if (!value) return ''

  try {
    const parsed = new URL(value)
    const stripped = parsed.pathname
      .replace(/\/+$/, '')
      .replace(/\/(rest|auth|storage|functions|realtime)\/v1$/i, '')
      .replace(/\/+$/, '')

    parsed.pathname = stripped || '/'
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString().replace(/\/$/, '')
  } catch {
    return value.replace(/\/+$/, '').replace(/\/(rest|auth|storage|functions|realtime)\/v1$/i, '')
  }
}

export const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL)
export const supabasePublishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim()

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabasePublishableKey)
}

/**
 * Shared Supabase JS client (official SDK pattern).
 * @see https://supabase.com/docs/reference/javascript/initializing
 */
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabasePublishableKey || 'sb_publishable_placeholder',
  {
    auth: {
      persistSession: isSupabaseConfigured(),
      autoRefreshToken: isSupabaseConfigured(),
      detectSessionInUrl: isSupabaseConfigured(),
      storageKey: 'cinderblock_supabase_auth',
    },
  },
)
