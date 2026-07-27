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
    CEREBRAS_API_KEY: secret('CEREBRAS_API_KEY'),
    CEREBRAS_MODEL: process.env.CEREBRAS_MODEL ?? '',
  },
})
