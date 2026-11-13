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
    GOOGLE_VERTEX_ACCESS_TOKEN: secret('GOOGLE_VERTEX_ACCESS_TOKEN'),
    GOOGLE_VERTEX_PROJECT_ID: secret('GOOGLE_VERTEX_PROJECT_ID'),
    GOOGLE_VERTEX_SERVICE_ACCOUNT: secret('GOOGLE_VERTEX_SERVICE_ACCOUNT'),
    GOOGLE_VERTEX_MODEL: process.env.GOOGLE_VERTEX_MODEL ?? '',
  },
})
