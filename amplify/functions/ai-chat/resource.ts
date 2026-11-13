import { defineFunction, secret } from '@aws-amplify/backend'
import { normalizeSupabaseUrl } from '../_shared/supabaseUrl'

/**
 * Streaming conversational workout-plan chat via Google Vertex.
 * Function URL must use InvokeMode.RESPONSE_STREAM (see amplify/backend.ts).
 */
export const aiChat = defineFunction({
  name: 'ai-chat',
  entry: './handler.ts',
  timeoutSeconds: 180,
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
