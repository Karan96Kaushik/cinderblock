import type { APIGatewayProxyResultV2, Context, LambdaFunctionURLEvent } from 'aws-lambda'
import {
  cerebrasProgramGenerationSchema,
  createCerebrasClient,
  requestStructuredJson,
  toProgramDocumentPatch,
  type CerebrasProgramGeneration,
} from '../../../lib/cerebras'
import { ProgramJsonManager, type ProgramIssue } from '../../../lib/program-json'
import { AI_CHAT_SCHEMA_VERSION } from '../../../lib/ai-chat/parse-sentinels'
import { json, jsonHeaders, parseJsonBody } from '../_shared/http'
import { createLogger } from '../_shared/logger'
import { checkRateLimit } from '../_shared/rateLimit'
import { readResolvedSecret } from '../_shared/secrets'
import { verifySupabaseAuth } from '../_shared/verifySupabaseAuth'

const log = createLogger('ai-extract-json')

const EXTRACT_CONTEXT = `You convert a plaintext workout plan into structured JSON for the Cinderblock app.
Follow these conventions exactly:
- Exercise "sets" is a positive integer.
- Exercise "reps" is a rep range string like "8-12"; use null only for timed holds.
- Timed-hold exercises set "duration" (e.g. "30-60 seconds") and "reps" to null.
- "muscles" and "notes" must be non-empty arrays of short strings.
- Workout "key" values are short camelCase ids, e.g. "fullBodyA", unique per workout.
- "weeks" phase ids look like "week1-2" and describe guidance for that phase.
- Schedule day values should reference a workout's "name" or say "Rest".
- Return only fields defined by the JSON schema — no commentary.`

type ExtractRequest = {
  plaintextDraft?: string
  runningSummary?: string
  schemaVersion?: string
}

type AttemptRecord = {
  raw: string
  issues: ProgramIssue[]
}

function issuesToPrompt(issues: ProgramIssue[]): string {
  return issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ')
}

async function extractOnce(args: {
  plaintextDraft: string
  runningSummary: string
  repairErrors?: string
}): Promise<{ generation: CerebrasProgramGeneration; raw: string }> {
  const client = createCerebrasClient({
    model: process.env.CEREBRAS_MODEL?.trim() || undefined,
  })

  const repairBlock = args.repairErrors
    ? `\n\nPrevious output failed validation: ${args.repairErrors}. Fix and return corrected JSON only.`
    : ''

  const prompt = `Running summary (constraints / preferences):
${args.runningSummary || '(none)'}

Plaintext workout plan to convert:
${args.plaintextDraft}${repairBlock}`

  const result = await requestStructuredJson<CerebrasProgramGeneration>({
    prompt,
    context: EXTRACT_CONTEXT,
    schemaName: 'program_generation',
    schema: cerebrasProgramGenerationSchema as unknown as Record<string, unknown>,
    client,
  })

  return { generation: result.data, raw: result.raw }
}

function validateGeneration(generation: CerebrasProgramGeneration): {
  ok: boolean
  plan?: ReturnType<ProgramJsonManager['get']>
  issues: ProgramIssue[]
} {
  const patch = toProgramDocumentPatch(generation)
  const manager = ProgramJsonManager.createFromTemplate(patch)
  const validation = manager.validate()
  if (!validation.ok) {
    return { ok: false, issues: validation.issues }
  }
  const diagnoseIssues = manager.diagnose().filter((issue) => issue.severity === 'error')
  if (diagnoseIssues.length > 0) {
    return { ok: false, issues: diagnoseIssues }
  }
  return { ok: true, plan: manager.get(), issues: [] }
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
    const rate = checkRateLimit(`extract:${user.id}`, { limit: 20, windowMs: 60 * 60 * 1000 })
    if (!rate.allowed) {
      return json(429, {
        ok: false,
        error: `Rate limit exceeded. Retry in ${rate.retryAfterSeconds}s.`,
      })
    }

    const body = parseJsonBody<ExtractRequest>(event)
    const plaintextDraft = body?.plaintextDraft?.trim() ?? ''
    const runningSummary = body?.runningSummary?.trim() ?? ''
    const schemaVersion = body?.schemaVersion?.trim() || AI_CHAT_SCHEMA_VERSION

    if (!plaintextDraft) {
      return json(400, { ok: false, error: 'plaintextDraft is required' })
    }

    if (!readResolvedSecret('CEREBRAS_API_KEY')) {
      return json(500, {
        ok: false,
        error:
          'Server misconfigured: Amplify secret CEREBRAS_API_KEY is missing. Run `npx ampx sandbox secret set CEREBRAS_API_KEY` (shell export is not enough).',
      })
    }

    const attempts: AttemptRecord[] = []

    let first: { generation: CerebrasProgramGeneration; raw: string }
    try {
      first = await extractOnce({ plaintextDraft, runningSummary })
    } catch (err) {
      log.errorWithCause('cerebras.first_failed', err, { ...base, userId: user.id })
      return json(502, {
        ok: false,
        reason: 'cerebras_error',
        error: err instanceof Error ? err.message : 'Cerebras request failed',
      })
    }

    let validated = validateGeneration(first.generation)
    attempts.push({ raw: first.raw, issues: validated.issues })

    if (!validated.ok) {
      log.warn('validation.retry', {
        ...base,
        userId: user.id,
        issueCount: validated.issues.length,
      })

      try {
        const second = await extractOnce({
          plaintextDraft,
          runningSummary,
          repairErrors: issuesToPrompt(validated.issues),
        })
        validated = validateGeneration(second.generation)
        attempts.push({ raw: second.raw, issues: validated.issues })
      } catch (err) {
        log.errorWithCause('cerebras.retry_failed', err, { ...base, userId: user.id })
        return json(502, {
          ok: false,
          reason: 'cerebras_error',
          error: err instanceof Error ? err.message : 'Cerebras retry failed',
          attempts,
        })
      }
    }

    if (!validated.ok || !validated.plan) {
      log.warn('validation.hard_fail', {
        ...base,
        userId: user.id,
        attempts: attempts.length,
      })
      return json(200, {
        ok: false,
        reason: 'validation_failed',
        schemaVersion,
        attempts,
        validatorErrors: validated.issues,
      })
    }

    log.info('request.done', {
      ...base,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      userId: user.id,
      programName: validated.plan.name,
    })

    return json(200, {
      ok: true,
      schemaVersion,
      plan: validated.plan,
      attempts: attempts.length,
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
