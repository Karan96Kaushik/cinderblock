import type { APIGatewayProxyResultV2, LambdaFunctionURLEvent } from 'aws-lambda'
import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
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

export const handler = async (event: LambdaFunctionURLEvent): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method.toUpperCase()
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders }
  }

  if (method !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' })
  }

  const supabaseUrl = (process.env.VITE_SUPABASE_URL ?? '').trim()
  const secretKey = (process.env.VITE_SUPABASE_SECRET_KEY ?? '').trim()

  if (!supabaseUrl || !secretKey) {
    return json(500, {
      ok: false,
      error:
        'Server misconfigured: set VITE_SUPABASE_URL and Amplify secret VITE_SUPABASE_SECRET_KEY',
    })
  }

  const accessToken = getBearerToken(event)
  if (!accessToken) {
    return json(401, { ok: false, error: 'Missing Authorization Bearer token' })
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
    return json(401, {
      ok: false,
      error: userError?.message ?? 'Invalid or expired Supabase session',
    })
  }

  const { data: settings, error: dbError } = await supabase
    .from('user_settings')
    .select('updated_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (dbError) {
    return json(500, {
      ok: false,
      error: `Supabase DB error: ${dbError.message}`,
      userId: user.id,
      email: user.email ?? null,
    })
  }

  return json(200, {
    ok: true,
    message: 'Amplify test function reached Supabase successfully',
    userId: user.id,
    email: user.email ?? null,
    hasSettingsRow: Boolean(settings),
    settingsUpdatedAt: settings?.updated_at ?? null,
  })
}
