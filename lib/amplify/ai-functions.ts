import outputs from '@/amplify_outputs.json'
import { supabase } from '@/utils/supabase'
import { STREAM_ERROR_MARKER, type AiChatMode, type ChatTurn } from '@/lib/ai-chat'
import type { ProgramDocument, ProgramIssue } from '@/lib/program-json'

type AmplifyOutputsCustom = {
  testFunctionUrl?: string
  aiExtractJsonUrl?: string
  aiChatUrl?: string
  reportIssueUrl?: string
}

function getCustom(): AmplifyOutputsCustom {
  return ((outputs as { custom?: AmplifyOutputsCustom }).custom ?? {}) as AmplifyOutputsCustom
}

function readUrl(key: keyof AmplifyOutputsCustom): string {
  const value = getCustom()[key]
  return typeof value === 'string' ? value.trim() : ''
}

export function isAiChatConfigured(): boolean {
  return Boolean(readUrl('aiChatUrl') && readUrl('aiExtractJsonUrl'))
}

export function isReportIssueConfigured(): boolean {
  return Boolean(readUrl('reportIssueUrl'))
}

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(error.message)
  const accessToken = data.session?.access_token
  if (!accessToken) {
    throw new AuthRequiredError('Sign in with Supabase to use AI workout chat.')
  }
  return accessToken
}

export class AuthRequiredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthRequiredError'
  }
}

export class AiHttpError extends Error {
  readonly status: number
  readonly payload: unknown

  constructor(status: number, message: string, payload?: unknown) {
    super(message)
    this.name = 'AiHttpError'
    this.status = status
    this.payload = payload
  }
}

async function authorizedFetch(
  url: string,
  body: unknown,
  init?: { signal?: AbortSignal },
): Promise<Response> {
  const accessToken = await getAccessToken()
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: init?.signal,
  })

  if (response.status === 401) {
    throw new AuthRequiredError('Your session expired. Sign in again to continue.')
  }

  return response
}

export type StreamChatRequest = {
  mode: AiChatMode
  runningSummary: string
  currentPlanContext: string | null
  recentTurns: ChatTurn[]
  newMessage: string
  signal?: AbortSignal
  onDelta: (chunk: string) => void
}

/**
 * Streams plain-text assistant tokens from the ai-chat Function URL.
 */
export async function streamAiChat(request: StreamChatRequest): Promise<string> {
  const url = readUrl('aiChatUrl')
  if (!url) {
    throw new Error(
      'AI chat URL is not set. Run `npx ampx sandbox` so amplify_outputs.json includes custom.aiChatUrl.',
    )
  }

  const response = await authorizedFetch(
    url,
    {
      mode: request.mode,
      runningSummary: request.runningSummary,
      currentPlanContext: request.currentPlanContext,
      recentTurns: request.recentTurns,
      newMessage: request.newMessage,
    },
    { signal: request.signal },
  )

  const contentType = response.headers.get('content-type') ?? ''

  if (!response.ok) {
    let payload: unknown = null
    try {
      payload = contentType.includes('application/json')
        ? await response.json()
        : await response.text()
    } catch {
      payload = null
    }
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : `AI chat failed (HTTP ${response.status})`
    throw new AiHttpError(response.status, message, payload)
  }

  if (!response.body) {
    throw new AiHttpError(502, 'AI chat returned an empty body')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    full += chunk

    // Server signals mid-stream LLM failures with a sentinel (headers are
    // already 200 text/plain by then). Drain the rest of the error message
    // and surface it as a real error instead of assistant content.
    if (full.includes(STREAM_ERROR_MARKER)) {
      while (true) {
        const rest = await reader.read()
        if (rest.done) break
        full += decoder.decode(rest.value, { stream: true })
      }
      full += decoder.decode()
      const markerIndex = full.indexOf(STREAM_ERROR_MARKER)
      const message = full.slice(markerIndex + STREAM_ERROR_MARKER.length).trim()
      throw new AiHttpError(502, message || 'AI chat stream failed')
    }

    request.onDelta(chunk)
  }

  full += decoder.decode()
  return full
}

export type ExtractJsonSuccess = {
  ok: true
  plan: ProgramDocument
  schemaVersion: string
  attempts: number
}

export type ExtractJsonFailure = {
  ok: false
  reason?: string
  error?: string
  attempts?: Array<{ raw: string; issues: ProgramIssue[] }>
  validatorErrors?: ProgramIssue[]
  schemaVersion?: string
}

export async function extractPlanJson(args: {
  plaintextDraft: string
  runningSummary: string
  schemaVersion: string
}): Promise<ExtractJsonSuccess | ExtractJsonFailure> {
  const url = readUrl('aiExtractJsonUrl')
  if (!url) {
    throw new Error(
      'AI extract URL is not set. Run `npx ampx sandbox` so amplify_outputs.json includes custom.aiExtractJsonUrl.',
    )
  }

  const response = await authorizedFetch(url, args)
  let payload: ExtractJsonSuccess | ExtractJsonFailure
  try {
    payload = (await response.json()) as ExtractJsonSuccess | ExtractJsonFailure
  } catch {
    throw new AiHttpError(response.status, `AI extract returned non-JSON (HTTP ${response.status})`)
  }

  if (!response.ok) {
    throw new AiHttpError(
      response.status,
      payload && 'error' in payload && payload.error
        ? String(payload.error)
        : `AI extract failed (HTTP ${response.status})`,
      payload,
    )
  }

  return payload
}

export async function reportAiChatIssue(args: {
  chatHistoryFull: ChatTurn[]
  plaintextDraft: string
  runningSummary: string
  jsonAttempts: unknown
  validatorErrors: unknown
  schemaVersion: string
}): Promise<{ ok: true; reportId: string }> {
  const url = readUrl('reportIssueUrl')
  if (!url) {
    throw new Error(
      'Report URL is not set. Run `npx ampx sandbox` so amplify_outputs.json includes custom.reportIssueUrl.',
    )
  }

  const response = await authorizedFetch(url, args)
  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean
    reportId?: string
    error?: string
  }

  if (!response.ok || !payload.ok || !payload.reportId) {
    throw new AiHttpError(
      response.status,
      payload.error ?? `Report failed (HTTP ${response.status})`,
      payload,
    )
  }

  return { ok: true, reportId: payload.reportId }
}
