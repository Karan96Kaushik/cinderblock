import type { APIGatewayProxyResultV2, Context, LambdaFunctionURLEvent } from 'aws-lambda'
import { requestScopeJudgement, type ScopeJudgeStage } from '../../../lib/cerebras/scope-judge'
import {
  AI_CHAT_MAX_PLAN_CONTEXT_CHARS,
  AI_CHAT_MAX_SUMMARY_CHARS,
  AI_CHAT_MAX_TURN_CONTENT_CHARS,
  AI_CHAT_MAX_RECENT_TURNS,
  type AiChatMode,
  type ChatTurn,
} from '../../../lib/ai-chat/parse-sentinels'
import { diffPlaintextPlans } from '../../../lib/ai-chat/plan-diff'
import { json, jsonHeaders, parseJsonBody } from '../_shared/http'
import { createLogger } from '../_shared/logger'
import { checkRateLimit } from '../_shared/rateLimit'
import { readResolvedSecret } from '../_shared/secrets'
import { verifySupabaseAuth } from '../_shared/verifySupabaseAuth'

const log = createLogger('ai-scope-judge')

type JudgeRequest = {
  mode?: AiChatMode
  stage?: ScopeJudgeStage
  runningSummary?: string
  recentTurns?: ChatTurn[]
  previousPlan?: string
  proposedPlan?: string
}

function parseMode(value: unknown): AiChatMode {
  if (value === 'edit' || value === 'discuss' || value === 'create') return value
  if (value === 'explain') return 'discuss'
  return 'edit'
}

function parseStage(value: unknown): ScopeJudgeStage {
  return value === 'save' ? 'save' : 'apply'
}

function formatConversation(turns: ChatTurn[]): string {
  return turns
    .map((turn) => `${turn.role.toUpperCase()}: ${turn.content}`)
    .join('\n\n')
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

    const { user } = authResult.auth
    const rate = checkRateLimit(`scope:${user.id}`, { limit: 40, windowMs: 60 * 60 * 1000 })
    if (!rate.allowed) {
      return json(429, {
        ok: false,
        error: `Rate limit exceeded. Retry in ${rate.retryAfterSeconds}s.`,
      })
    }

    if (!readResolvedSecret('CEREBRAS_API_KEY')) {
      return json(500, {
        ok: false,
        error:
          'Server misconfigured: Amplify secret CEREBRAS_API_KEY is missing. Run `npx ampx sandbox secret set CEREBRAS_API_KEY`.',
      })
    }

    const body = parseJsonBody<JudgeRequest>(event)
    const proposedPlan = (body?.proposedPlan ?? '').slice(0, AI_CHAT_MAX_PLAN_CONTEXT_CHARS).trim()
    if (!proposedPlan) {
      return json(400, { ok: false, error: 'proposedPlan is required' })
    }

    const previousPlan = (body?.previousPlan ?? '').slice(0, AI_CHAT_MAX_PLAN_CONTEXT_CHARS)
    const runningSummary = (body?.runningSummary ?? '').slice(0, AI_CHAT_MAX_SUMMARY_CHARS)
    const mode = parseMode(body?.mode)
    const stage = parseStage(body?.stage)
    const recentTurns = Array.isArray(body?.recentTurns)
      ? body.recentTurns
          .filter(
            (turn): turn is ChatTurn =>
              !!turn &&
              (turn.role === 'user' || turn.role === 'assistant') &&
              typeof turn.content === 'string',
          )
          .slice(-AI_CHAT_MAX_RECENT_TURNS)
          .map((turn) => ({
            role: turn.role,
            content: turn.content.slice(0, AI_CHAT_MAX_TURN_CONTENT_CHARS),
          }))
      : []

    const diff = diffPlaintextPlans(previousPlan, proposedPlan)
    if (!diff.changed) {
      log.info('request.done', {
        ...base,
        statusCode: 200,
        durationMs: Date.now() - startedAt,
        userId: user.id,
        mode,
        stage,
        verdict: 'accept',
        skipped: 'unchanged',
      })
      return json(200, {
        ok: true,
        verdict: 'accept',
        reason: 'Proposed plan matches the previous plan.',
        requestedChanges: [],
        extraChanges: [],
      })
    }

    const judgement = await requestScopeJudgement({
      mode,
      stage,
      runningSummary,
      conversation: formatConversation(recentTurns),
      previousPlan,
      proposedPlan,
      diff,
    })

    log.info('request.done', {
      ...base,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      userId: user.id,
      mode,
      stage,
      verdict: judgement.verdict,
      extraChangeCount: judgement.extraChanges.length,
      addedLines: diff.addedCount,
      removedLines: diff.removedCount,
    })

    return json(200, {
      ok: true,
      ...judgement,
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
