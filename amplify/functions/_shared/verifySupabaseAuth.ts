import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import type { LambdaFunctionURLEvent } from 'aws-lambda'
import { getBearerToken } from './http'
import { hostOf, normalizeSupabaseUrl } from './supabaseUrl'

export type VerifiedAuth = {
  user: User
  accessToken: string
  supabaseUrl: string
  secretKey: string
  /** Service-role client — never expose to the browser. */
  supabase: SupabaseClient
}

export type AuthFailure = {
  statusCode: 401 | 500
  error: string
  details?: Record<string, unknown>
}

function formatAuthError(message: string, supabaseUrl: string): string {
  if (/PGRST125|Invalid path/i.test(message)) {
    return `Invalid Supabase URL (${supabaseUrl}). Use the project URL only (https://xxxx.supabase.co), not .../rest/v1.`
  }
  return message
}

/**
 * Verifies the caller's Supabase access token via `auth.getUser`.
 * Prefer this over local JWT-secret verification so HS256 and asymmetric
 * project keys both work without Lambda config changes.
 */
export async function verifySupabaseAuth(
  event: LambdaFunctionURLEvent,
): Promise<{ ok: true; auth: VerifiedAuth } | { ok: false; failure: AuthFailure }> {
  const rawSupabaseUrl = (process.env.VITE_SUPABASE_URL ?? '').trim()
  const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl)
  const secretKey = (process.env.VITE_SUPABASE_SECRET_KEY ?? '').trim()

  if (!supabaseUrl || !secretKey) {
    return {
      ok: false,
      failure: {
        statusCode: 500,
        error:
          'Server misconfigured: set VITE_SUPABASE_URL and Amplify secret VITE_SUPABASE_SECRET_KEY',
        details: {
          hasSupabaseUrl: Boolean(supabaseUrl),
          hasSecretKey: Boolean(secretKey),
          supabaseHost: supabaseUrl ? hostOf(supabaseUrl) : null,
        },
      },
    }
  }

  const accessToken = getBearerToken(event)
  if (!accessToken) {
    return {
      ok: false,
      failure: {
        statusCode: 401,
        error: 'Missing Authorization Bearer token',
      },
    }
  }

  const supabase = createClient(supabaseUrl, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken)

  if (userError || !user) {
    return {
      ok: false,
      failure: {
        statusCode: 401,
        error: formatAuthError(
          userError?.message ?? 'Invalid or expired Supabase session',
          supabaseUrl,
        ),
        details: {
          supabaseHost: hostOf(supabaseUrl),
          errorMessage: userError?.message ?? null,
        },
      },
    }
  }

  return {
    ok: true,
    auth: { user, accessToken, supabaseUrl, secretKey, supabase },
  }
}
