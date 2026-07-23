import { defineFunction, secret } from '@aws-amplify/backend'

function normalizeSupabaseUrl(raw: string | undefined): string {
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

/**
 * Standalone Amplify Lambda for server-side Supabase access.
 * Auth stays on Supabase — the UI passes the user's access token;
 * this function verifies it and uses the secret key for DB access.
 */
export const amplifyTest = defineFunction({
  name: 'amplify-test',
  entry: './handler.ts',
  timeoutSeconds: 15,
  environment: {
    VITE_SUPABASE_URL: normalizeSupabaseUrl(process.env.VITE_SUPABASE_URL),
    VITE_SUPABASE_SECRET_KEY: secret('VITE_SUPABASE_SECRET_KEY'),
  },
})
