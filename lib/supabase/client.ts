/** @deprecated Import from `@/utils/supabase` instead. */
export { supabase, isSupabaseConfigured } from '@/utils/supabase'

import { supabase, isSupabaseConfigured } from '@/utils/supabase'

/** @deprecated Use `supabase` from `@/utils/supabase`. */
export function getSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL (project URL, no /rest/v1) and VITE_SUPABASE_PUBLISHABLE_KEY.',
    )
  }
  return supabase
}

export function getSupabaseUrl(): string {
  return import.meta.env.VITE_SUPABASE_URL ?? ''
}
