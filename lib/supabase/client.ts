import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') ?? ''
/** Publishable key (`sb_publishable_...`) — safe for the browser. Never use a secret key here. */
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''

let client: SupabaseClient<Database> | null = null

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabasePublishableKey)
}

export function getSupabase(): SupabaseClient<Database> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
    )
  }

  if (!client) {
    client = createClient<Database>(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'cinderblock_supabase_auth',
      },
    })
  }

  return client
}
