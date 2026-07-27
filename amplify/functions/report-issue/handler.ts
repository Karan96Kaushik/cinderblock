import type { APIGatewayProxyResultV2, Context, LambdaFunctionURLEvent } from 'aws-lambda'
import { AI_CHAT_SCHEMA_VERSION } from '../../../lib/ai-chat/parse-sentinels'
import { json, jsonHeaders, parseJsonBody } from '../_shared/http'
import { createLogger } from '../_shared/logger'
import { checkRateLimit } from '../_shared/rateLimit'
import { verifySupabaseAuth } from '../_shared/verifySupabaseAuth'

const log = createLogger('report-issue')

type ReportRequest = {
  chatHistoryFull?: unknown
  plaintextDraft?: string
  runningSummary?: string
  jsonAttempts?: unknown
  validatorErrors?: unknown
  schemaVersion?: string
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

  log.info('request.start', { ...base })

  try {
    if (method === 'OPTIONS') {
      return { statusCode: 204, headers: jsonHeaders }
    }

    if (method !== 'POST') {
      return json(405, { ok: false, error: 'Method not allowed' })
    }

    const authResult = await verifySupabaseAuth(event)
    if (!authResult.ok) {
      log.warn('auth.failed', {
        ...base,
        statusCode: authResult.failure.statusCode,
        error: authResult.failure.error,
      })
      return json(authResult.failure.statusCode, {
        ok: false,
        error: authResult.failure.error,
      })
    }

    const { user, supabase } = authResult.auth
    const rate = checkRateLimit(`report:${user.id}`, { limit: 30, windowMs: 60 * 60 * 1000 })
    if (!rate.allowed) {
      return json(429, {
        ok: false,
        error: `Rate limit exceeded. Retry in ${rate.retryAfterSeconds}s.`,
      })
    }

    const body = parseJsonBody<ReportRequest>(event)
    if (!body) {
      return json(400, { ok: false, error: 'Invalid JSON body' })
    }

    const row = {
      user_id: user.id,
      chat_history: body.chatHistoryFull ?? [],
      plaintext_draft: body.plaintextDraft ?? '',
      running_summary: body.runningSummary ?? '',
      json_attempts: body.jsonAttempts ?? [],
      validator_errors: body.validatorErrors ?? [],
      schema_version: body.schemaVersion?.trim() || AI_CHAT_SCHEMA_VERSION,
    }

    const { data, error } = await supabase
      .from('ai_chat_reports')
      .insert(row)
      .select('id, created_at')
      .single()

    if (error) {
      log.error('db.insert_failed', {
        ...base,
        userId: user.id,
        errorMessage: error.message,
        errorCode: error.code ?? null,
      })
      return json(500, {
        ok: false,
        error: `Failed to store report: ${error.message}`,
      })
    }

    log.info('request.done', {
      ...base,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      userId: user.id,
      reportId: data.id,
    })

    return json(200, {
      ok: true,
      reportId: data.id,
      createdAt: data.created_at,
    })
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
