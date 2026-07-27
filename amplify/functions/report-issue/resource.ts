import { defineFunction, secret } from '@aws-amplify/backend'
import { normalizeSupabaseUrl } from '../_shared/supabaseUrl'

/**
 * Persists AI chat hard-failure reports for developer review.
 */
export const reportIssue = defineFunction({
  name: 'report-issue',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 256,
  environment: {
    VITE_SUPABASE_URL: normalizeSupabaseUrl(process.env.VITE_SUPABASE_URL),
    VITE_SUPABASE_SECRET_KEY: secret('VITE_SUPABASE_SECRET_KEY'),
  },
})
