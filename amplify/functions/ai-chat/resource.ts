import { defineFunction, secret } from '@aws-amplify/backend'
import { normalizeSupabaseUrl } from '../_shared/supabaseUrl'

/**
 * Streaming conversational workout-plan chat via Cerebras.
 * Function URL must use InvokeMode.RESPONSE_STREAM (see amplify/backend.ts).
 */
export const aiChat = defineFunction({
  name: 'ai-chat',
  entry: './handler.ts',
  timeoutSeconds: 120,
  memoryMB: 512,
  environment: {
    VITE_SUPABASE_URL: normalizeSupabaseUrl(process.env.VITE_SUPABASE_URL),
    VITE_SUPABASE_SECRET_KEY: secret('VITE_SUPABASE_SECRET_KEY'),
    CEREBRAS_API_KEY: secret('CEREBRAS_API_KEY'),
    CEREBRAS_MODEL: process.env.CEREBRAS_MODEL ?? '',
  },
})
