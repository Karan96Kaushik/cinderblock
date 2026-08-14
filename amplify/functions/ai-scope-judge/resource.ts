import { defineFunction, secret } from '@aws-amplify/backend'
import { normalizeSupabaseUrl } from '../_shared/supabaseUrl'

/**
 * Second-layer auditor: accepts or rejects a proposed plan based on whether
 * it stays within the user's requested change scope.
 */
export const aiScopeJudge = defineFunction({
  name: 'ai-scope-judge',
  entry: './handler.ts',
  timeoutSeconds: 60,
  memoryMB: 512,
  environment: {
    VITE_SUPABASE_URL: normalizeSupabaseUrl(process.env.VITE_SUPABASE_URL),
    VITE_SUPABASE_SECRET_KEY: secret('VITE_SUPABASE_SECRET_KEY'),
    CEREBRAS_API_KEY: secret('CEREBRAS_API_KEY'),
    CEREBRAS_MODEL: process.env.CEREBRAS_MODEL ?? '',
  },
})
