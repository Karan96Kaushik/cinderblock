import { defineFunction, secret } from '@aws-amplify/backend'
import { normalizeSupabaseUrl } from '../_shared/supabaseUrl'

/**
 * Converts a finalized plaintext workout draft into validated ProgramDocument JSON.
 */
export const aiExtractJson = defineFunction({
  name: 'ai-extract-json',
  entry: './handler.ts',
  timeoutSeconds: 90,
  memoryMB: 512,
  environment: {
    VITE_SUPABASE_URL: normalizeSupabaseUrl(process.env.VITE_SUPABASE_URL),
    VITE_SUPABASE_SECRET_KEY: secret('VITE_SUPABASE_SECRET_KEY'),
    GOOGLE_VERTEX_ACCESS_TOKEN: secret('GOOGLE_VERTEX_ACCESS_TOKEN'),
    GOOGLE_VERTEX_PROJECT_ID: secret('GOOGLE_VERTEX_PROJECT_ID'),
    GOOGLE_VERTEX_SERVICE_ACCOUNT: secret('GOOGLE_VERTEX_SERVICE_ACCOUNT'),
    GOOGLE_VERTEX_MODEL: process.env.GOOGLE_VERTEX_MODEL ?? '',
  },
})
