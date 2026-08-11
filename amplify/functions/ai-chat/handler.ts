import type { Context, LambdaFunctionURLEvent } from 'aws-lambda'
import { createCerebrasClient } from '../../../lib/cerebras'
import {
  AI_CHAT_MAX_MESSAGE_CHARS,
  AI_CHAT_MAX_PLAN_CONTEXT_CHARS,
  AI_CHAT_MAX_RECENT_TURNS,
  AI_CHAT_MAX_SUMMARY_CHARS,
  AI_CHAT_MAX_TURN_CONTENT_CHARS,
  STREAM_ERROR_MARKER,
  type AiChatMode,
  type ChatTurn,
} from '../../../lib/ai-chat/parse-sentinels'
import { parseJsonBody } from '../_shared/http'
import { createLogger } from '../_shared/logger'
import { checkRateLimit } from '../_shared/rateLimit'
import { readResolvedSecret } from '../_shared/secrets'
import { verifySupabaseAuth } from '../_shared/verifySupabaseAuth'
import { buildChatSystemPrompt, buildChatUserPayload } from './prompts'

const log = createLogger('ai-chat')

type WritableResponseStream = NodeJS.WritableStream & {
  write: (chunk: string | Buffer) => boolean
  end: (chunk?: string | Buffer) => void
  setContentType?: (type: string) => void
}

type AwsLambdaGlobal = {
  streamifyResponse: (
    handler: (
      event: LambdaFunctionURLEvent,
      responseStream: WritableResponseStream,
      context: Context,
    ) => Promise<void>,
  ) => (
    event: LambdaFunctionURLEvent,
    responseStream: WritableResponseStream,
    context: Context,
  ) => Promise<void>
  HttpResponseStream: {
    from: (
      stream: WritableResponseStream,
      metadata: { statusCode: number; headers?: Record<string, string> },
    ) => WritableResponseStream
  }
}

declare const awslambda: AwsLambdaGlobal

type ChatRequest = {
  mode?: AiChatMode
  runningSummary?: string
  currentPlanContext?: string | null
  recentTurns?: ChatTurn[]
  newMessage?: string
}

function writeJsonError(
  responseStream: WritableResponseStream,
  statusCode: number,
  body: Record<string, unknown>,
) {
  const stream = awslambda.HttpResponseStream.from(responseStream, {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
  })
  stream.write(JSON.stringify(body))
  stream.end()
}

async function streamHandler(
  event: LambdaFunctionURLEvent,
  responseStream: WritableResponseStream,
  context: Context,
): Promise<void> {
  const startedAt = Date.now()
  const requestId = context.awsRequestId
  const method = event.requestContext.http.method.toUpperCase()
  const path = event.rawPath || '/'
  const base = { requestId, method, path }

  log.info('request.start', { ...base })

  try {
    if (method === 'OPTIONS') {
      const stream = awslambda.HttpResponseStream.from(responseStream, {
        statusCode: 204,
        headers: { 'Content-Type': 'application/json' },
      })
      stream.end()
      return
    }

    if (method !== 'POST') {
      writeJsonError(responseStream, 405, { ok: false, error: 'Method not allowed' })
      return
    }

    const authResult = await verifySupabaseAuth(event)
    if (!authResult.ok) {
      log.warn('auth.failed', {
        ...base,
        statusCode: authResult.failure.statusCode,
        error: authResult.failure.error,
      })
      writeJsonError(responseStream, authResult.failure.statusCode, {
        ok: false,
        error: authResult.failure.error,
      })
      return
    }

    const { user } = authResult.auth
    const rate = checkRateLimit(`chat:${user.id}`, { limit: 60, windowMs: 60 * 60 * 1000 })
    if (!rate.allowed) {
      writeJsonError(responseStream, 429, {
        ok: false,
        error: `Rate limit exceeded. Retry in ${rate.retryAfterSeconds}s.`,
      })
      return
    }

    if (!readResolvedSecret('CEREBRAS_API_KEY')) {
      writeJsonError(responseStream, 500, {
        ok: false,
        error:
          'Server misconfigured: Amplify secret CEREBRAS_API_KEY is missing. Run `npx ampx sandbox secret set CEREBRAS_API_KEY` (shell export is not enough).',
      })
      return
    }

    const body = parseJsonBody<ChatRequest>(event)
    const newMessage = body?.newMessage?.trim() ?? ''
    if (!newMessage) {
      writeJsonError(responseStream, 400, { ok: false, error: 'newMessage is required' })
      return
    }
    if (newMessage.length > AI_CHAT_MAX_MESSAGE_CHARS) {
      writeJsonError(responseStream, 413, {
        ok: false,
        error: `Message is too long (max ${AI_CHAT_MAX_MESSAGE_CHARS} characters).`,
      })
      return
    }

    const mode: AiChatMode =
      body?.mode === 'edit' || body?.mode === 'discuss' || body?.mode === 'create'
        ? body.mode
        : body?.mode === 'explain'
          ? 'discuss'
          : 'create'

    // App-generated context fields are truncated (not rejected) so an oversized
    // summary or plan never blocks the conversation.
    const recentTurns = Array.isArray(body?.recentTurns)
      ? body!.recentTurns!
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

    const runningSummary = (body?.runningSummary ?? '').slice(0, AI_CHAT_MAX_SUMMARY_CHARS)
    const currentPlanContext =
      typeof body?.currentPlanContext === 'string'
        ? body.currentPlanContext.slice(0, AI_CHAT_MAX_PLAN_CONTEXT_CHARS)
        : null

    const client = createCerebrasClient({
      model: process.env.CEREBRAS_MODEL?.trim() || undefined,
    })

    const system = buildChatSystemPrompt(mode)
    const userPayload = buildChatUserPayload({
      runningSummary,
      currentPlanContext,
      recentTurns,
      newMessage,
    })

    const stream = awslambda.HttpResponseStream.from(responseStream, {
      statusCode: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })

    try {
      for await (const delta of client.streamChatCompletion({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userPayload },
        ],
        temperature: 0.6,
        maxTokens: 4096,
      })) {
        stream.write(delta)
      }
    } catch (err) {
      log.errorWithCause('cerebras.stream_failed', err, { ...base, userId: user.id })
      // Headers were already sent as 200 text/plain, so signal the failure with a
      // sentinel the client recognizes and converts into a thrown error.
      stream.write(
        `\n\n${STREAM_ERROR_MARKER} ${err instanceof Error ? err.message : 'Cerebras stream failed'}`,
      )
    }

    stream.end()
    log.info('request.done', {
      ...base,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      userId: user.id,
      mode,
    })
  } catch (err) {
    log.errorWithCause('request.unhandled', err, {
      ...base,
      durationMs: Date.now() - startedAt,
    })
    try {
      writeJsonError(responseStream, 500, {
        ok: false,
        error: err instanceof Error ? err.message : 'Unexpected server error',
      })
    } catch {
      responseStream.end()
    }
  }
}

export const handler = awslambda.streamifyResponse(streamHandler)
