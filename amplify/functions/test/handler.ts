import type { APIGatewayProxyResultV2, Context, LambdaFunctionURLEvent } from 'aws-lambda'
import { createClient } from '@supabase/supabase-js'
import { log } from './logger'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

/**
 * Project URL must be the origin only, e.g. https://xxxx.supabase.co
 * Pasting .../rest/v1 makes auth hit rest/v1/auth/v1/* ("Invalid path...").
 */
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
    return value
      .replace(/\/+$/, '')
      .replace(/\/(rest|auth|storage|functions|realtime)\/v1$/i, '')
  }
}

function json(statusCode: number, body: Record<string, unknown>): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
  }
}

function getBearerToken(event: LambdaFunctionURLEvent): string | null {
  const raw =
    event.headers.authorization ??
    event.headers.Authorization ??
    event.headers.AUTHORIZATION
  if (!raw) return null
  const match = /^Bearer\s+(.+)$/i.exec(raw.trim())
  return match?.[1]?.trim() || null
}

function formatAuthError(message: string, supabaseUrl: string): string {
  if (/PGRST125|Invalid path/i.test(message)) {
    return `Invalid Supabase URL (${supabaseUrl}). Use the project URL only (https://xxxx.supabase.co), not .../rest/v1.`
  }
  return message
}

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return '(invalid-url)'
  }
}

export const handler = async (
  event: LambdaFunctionURLEvent,
  context: Context,
): Promise<APIGatewayProxyResultV2> => {
  const startedAt = Date.now()
  const requestId = context.awsRequestId
  const method = event.requestContext.http.method.toUpperCase()
  const path = event.rawPath || '/'

  const base = { requestId, method, path }

  log.info('request.start', {
    ...base,
    sourceIp: event.requestContext.http.sourceIp,
    userAgent: event.headers['user-agent'] ?? event.headers['User-Agent'] ?? null,
  })

  try {
    if (method === 'OPTIONS') {
      log.info('request.done', { ...base, statusCode: 204, durationMs: Date.now() - startedAt })
      return { statusCode: 204, headers: corsHeaders }
    }

    if (method !== 'POST') {
      log.warn('request.rejected', { ...base, reason: 'method_not_allowed', statusCode: 405 })
      return json(405, { ok: false, error: 'Method not allowed' })
    }

    const rawSupabaseUrl = (process.env.VITE_SUPABASE_URL ?? '').trim()
    const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl)
    const secretKey = (process.env.VITE_SUPABASE_SECRET_KEY ?? '').trim()

    log.info('config.loaded', {
      ...base,
      supabaseHost: supabaseUrl ? hostOf(supabaseUrl) : null,
      urlNormalized: Boolean(rawSupabaseUrl && rawSupabaseUrl !== supabaseUrl),
      hasSecretKey: Boolean(secretKey),
      secretKeyLength: secretKey ? secretKey.length : 0,
    })

    if (!supabaseUrl || !secretKey) {
      log.error('config.missing', {
        ...base,
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasSecretKey: Boolean(secretKey),
        statusCode: 500,
      })
      return json(500, {
        ok: false,
        error:
          'Server misconfigured: set VITE_SUPABASE_URL and Amplify secret VITE_SUPABASE_SECRET_KEY',
      })
    }

    const accessToken = getBearerToken(event)
    if (!accessToken) {
      log.warn('auth.missing_token', { ...base, statusCode: 401 })
      return json(401, { ok: false, error: 'Missing Authorization Bearer token' })
    }

    log.info('auth.token_present', {
      ...base,
      tokenLength: accessToken.length,
    })

    const supabase = createClient(supabaseUrl, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })

    const authStartedAt = Date.now()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken)
    const authDurationMs = Date.now() - authStartedAt

    if (userError || !user) {
      const message = formatAuthError(
        userError?.message ?? 'Invalid or expired Supabase session',
        supabaseUrl,
      )
      log.warn('auth.get_user_failed', {
        ...base,
        statusCode: 401,
        authDurationMs,
        supabaseHost: hostOf(supabaseUrl),
        errorMessage: userError?.message ?? null,
        errorName: userError?.name ?? null,
        errorStatus: (userError as { status?: number } | null)?.status ?? null,
      })
      return json(401, { ok: false, error: message })
    }

    log.info('auth.get_user_ok', {
      ...base,
      authDurationMs,
      userId: user.id,
      email: user.email ?? null,
    })

    const dbStartedAt = Date.now()
    const { data: settings, error: dbError } = await supabase
      .from('user_settings')
      .select('updated_at')
      .eq('user_id', user.id)
      .maybeSingle()
    const dbDurationMs = Date.now() - dbStartedAt

    if (dbError) {
      log.error('db.user_settings_failed', {
        ...base,
        statusCode: 500,
        dbDurationMs,
        userId: user.id,
        errorMessage: dbError.message,
        errorCode: dbError.code ?? null,
        errorDetails: dbError.details ?? null,
        errorHint: dbError.hint ?? null,
      })
      return json(500, {
        ok: false,
        error: `Supabase DB error: ${dbError.message}`,
        userId: user.id,
        email: user.email ?? null,
      })
    }

    const result = {
      ok: true,
      message: 'Amplify test function reached Supabase successfully',
      userId: user.id,
      email: user.email ?? null,
      hasSettingsRow: Boolean(settings),
      settingsUpdatedAt: settings?.updated_at ?? null,
    }

    log.info('request.done', {
      ...base,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      authDurationMs,
      dbDurationMs,
      userId: user.id,
      hasSettingsRow: result.hasSettingsRow,
    })

    return json(200, result)
  } catch (err) {
    log.errorWithCause('request.unhandled', err, {
      ...base,
      statusCode: 500,
      durationMs: Date.now() - startedAt,
    })
    return json(500, {
      ok: false,
      error: err instanceof Error ? err.message : 'Unexpected server error',
    })
  }
}
