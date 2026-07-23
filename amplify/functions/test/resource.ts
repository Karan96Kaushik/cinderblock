import { defineFunction, secret } from '@aws-amplify/backend'

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
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? '',
    VITE_SUPABASE_SECRET_KEY: secret('VITE_SUPABASE_SECRET_KEY'),
  },
})
