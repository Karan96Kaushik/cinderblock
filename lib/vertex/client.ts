import { createSign } from 'node:crypto'
import type {
  CerebrasChatRequest,
  CerebrasChatResponse,
  CerebrasRawChatCompletion,
  CerebrasRawErrorBody,
} from '../cerebras/types'

/**
 * Google Vertex AI via the global OpenAI-compatible chat endpoint.
 * Matches ai-assitant-node `src/integrations/vertexClient.js`:
 * model ids may be prefixed with "vertex:" and are sent as "google/<model>".
 */

const PREFIX = 'vertex:'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CLOUD_SCOPE = 'https://www.googleapis.com/auth/cloud-platform'
const DEFAULT_MODEL = 'gemini-3.6-flash'
const AMPLIFY_SSM_PLACEHOLDER = '<value will be resolved during runtime>'

export const VERTEX_MISCONFIGURED_ERROR =
  'Server misconfigured: set Amplify secret GOOGLE_VERTEX_SERVICE_ACCOUNT, or both GOOGLE_VERTEX_ACCESS_TOKEN and GOOGLE_VERTEX_PROJECT_ID. Run `npx ampx sandbox secret set GOOGLE_VERTEX_SERVICE_ACCOUNT`.'

type ServiceAccount = {
  type?: string
  private_key?: string
  client_email?: string
  project_id?: string
  token_uri?: string
}

type CachedAccessToken = {
  token: string
  exp: number
  email: string
}

let cachedAccessToken: CachedAccessToken = { token: '', exp: 0, email: '' }

export class VertexApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, message: string, body: unknown) {
    super(message)
    this.name = 'VertexApiError'
    this.status = status
    this.body = body
  }
}

export type VertexClientOptions = {
  /** Default model when a request does not set one. `GOOGLE_VERTEX_MODEL` overrides the built-in default. */
  model?: string
}

function envValue(name: string): string {
  const value = typeof process !== 'undefined' ? process.env[name]?.trim() ?? '' : ''
  if (!value || value === AMPLIFY_SSM_PLACEHOLDER) return ''
  return value
}

function credentialValue(raw: string): string {
  return raw.trim().replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '')
}

/** OAuth access tokens use Bearer. API keys are sent as x-goog-api-key. */
function authHeaders(credential: string): Record<string, string> {
  if (credential.startsWith('ya29.')) return { Authorization: `Bearer ${credential}` }
  return { 'x-goog-api-key': credential }
}

function googleError(payload: unknown): { message: string; reason: string } | null {
  const body = Array.isArray(payload) ? payload[0] : payload
  if (!body || typeof body !== 'object') return null
  const error = (body as { error?: unknown }).error
  if (!error || typeof error !== 'object') return null
  const record = error as { message?: unknown; status?: unknown; details?: unknown }
  const details = Array.isArray(record.details) ? record.details : []
  const reasonItem = details.find(
    (item) => item && typeof item === 'object' && 'reason' in item,
  ) as { reason?: unknown } | undefined
  return {
    message: String(record.message || record.status || ''),
    reason: String(reasonItem?.reason || ''),
  }
}

function parseServiceAccount(raw: string): ServiceAccount | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as ServiceAccount
    if (parsed?.type !== 'service_account' || !parsed.private_key || !parsed.client_email) return null
    return parsed
  } catch {
    return null
  }
}

function signServiceAccountJwt(account: ServiceAccount): string {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const claim = Buffer.from(
    JSON.stringify({
      iss: account.client_email,
      scope: CLOUD_SCOPE,
      aud: account.token_uri || TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  ).toString('base64url')
  const data = `${header}.${claim}`
  const signer = createSign('RSA-SHA256')
  signer.update(data)
  signer.end()
  return `${data}.${signer.sign(account.private_key!).toString('base64url')}`
}

async function serviceAccountAccessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (
    cachedAccessToken.token &&
    cachedAccessToken.email === account.client_email &&
    cachedAccessToken.exp > now + 60
  ) {
    return cachedAccessToken.token
  }

  const assertion = signServiceAccountJwt(account)
  const response = await fetch(account.token_uri || TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  const text = await response.text()
  type TokenResponse = {
    access_token?: string
    expires_in?: number
    error?: string
    error_description?: string
  }
  let payload: TokenResponse | null = null
  try {
    payload = text ? (JSON.parse(text) as TokenResponse) : null
  } catch {
    payload = null
  }
  if (!response.ok || !payload?.access_token) {
    const message =
      payload?.error_description || payload?.error || text || `token exchange failed (${response.status})`
    throw new VertexApiError(
      response.status,
      `Google Vertex service account token exchange failed: ${message}`,
      payload,
    )
  }
  cachedAccessToken = {
    token: payload.access_token,
    exp: now + Number(payload.expires_in || 3600),
    email: account.client_email!,
  }
  return cachedAccessToken.token
}

/**
 * Prefer the service-account secret. It mints a short-lived ya29 token.
 * A raw access token or API key in GOOGLE_VERTEX_ACCESS_TOKEN still works.
 */
export async function resolveVertexRequest(): Promise<{
  projectId: string
  headers: Record<string, string>
}> {
  const account = parseServiceAccount(envValue('GOOGLE_VERTEX_SERVICE_ACCOUNT'))
  const project = envValue('GOOGLE_VERTEX_PROJECT_ID') || String(account?.project_id || '').trim()
  if (account) {
    const token = await serviceAccountAccessToken(account)
    return { projectId: project, headers: { Authorization: `Bearer ${token}` } }
  }
  const key = credentialValue(envValue('GOOGLE_VERTEX_ACCESS_TOKEN'))
  if (!key || !project) {
    throw new VertexApiError(0, VERTEX_MISCONFIGURED_ERROR, null)
  }
  return { projectId: project, headers: authHeaders(key) }
}

export function isVertexConfigured(): boolean {
  if (parseServiceAccount(envValue('GOOGLE_VERTEX_SERVICE_ACCOUNT'))) return true
  return Boolean(envValue('GOOGLE_VERTEX_ACCESS_TOKEN') && envValue('GOOGLE_VERTEX_PROJECT_ID'))
}

/** Strip the app prefix and add the publisher Vertex requires. */
export function toApiModelId(modelId: string): string {
  const id = modelId.trim()
  const bare = id.startsWith(PREFIX) ? id.slice(PREFIX.length) : id
  if (!bare) return ''
  return bare.includes('/') ? bare : `google/${bare}`
}

function endpointFor(project: string): string {
  const id = project.trim()
  if (!id) return ''
  return `https://aiplatform.googleapis.com/v1/projects/${encodeURIComponent(id)}/locations/global/endpoints/openapi/chat/completions`
}

function resolveDefaultModel(explicit?: string): string {
  const raw = (explicit || envValue('GOOGLE_VERTEX_MODEL') || DEFAULT_MODEL).trim()
  return toApiModelId(raw)
}

function errorMessage(status: number, payload: unknown, fallbackText: string): string {
  const parsed = googleError(payload)
  const openAi = payload as CerebrasRawErrorBody
  let message =
    parsed?.message ||
    openAi?.error?.message ||
    fallbackText ||
    `Google Vertex request failed (${status})`
  if (parsed?.reason === 'ACCESS_TOKEN_TYPE_UNSUPPORTED') {
    message =
      'Google Vertex rejected GOOGLE_VERTEX_ACCESS_TOKEN. That value is an OAuth access token (ya29) Vertex will not accept. Put the API key in that secret instead.'
  }
  return message
}

function toResponseFormatPayload(format: CerebrasChatRequest['responseFormat']): unknown {
  if (!format) return undefined
  if (format.type === 'json_schema') {
    return {
      type: 'json_schema',
      json_schema: {
        name: format.jsonSchema.name,
        strict: format.jsonSchema.strict ?? true,
        schema: format.jsonSchema.schema,
      },
    }
  }
  return { type: format.type }
}

function toChatResponse(payload: CerebrasRawChatCompletion, requestedModel: string): CerebrasChatResponse {
  const choice = payload.choices?.[0]
  const usage = payload.usage
  return {
    id: payload.id ?? '',
    model: payload.model ?? requestedModel,
    content: choice?.message?.content ?? '',
    finishReason: choice?.finish_reason ?? null,
    usage: usage
      ? {
          promptTokens: usage.prompt_tokens ?? 0,
          completionTokens: usage.completion_tokens ?? 0,
          totalTokens: usage.total_tokens ?? 0,
        }
      : undefined,
    raw: payload,
  }
}

export class VertexClient {
  private readonly defaultModel: string

  constructor(options: VertexClientOptions = {}) {
    this.defaultModel = resolveDefaultModel(options.model)
  }

  async chatCompletion(request: CerebrasChatRequest): Promise<CerebrasChatResponse> {
    const body = this.buildRequestBody(request)
    const response = await this.post(body)
    const text = await response.text()
    const payload = parseJson(text)

    if (!response.ok) {
      throw new VertexApiError(response.status, errorMessage(response.status, payload, text), payload)
    }

    return toChatResponse(payload as CerebrasRawChatCompletion, body.model as string)
  }

  /**
   * Streaming chat completion. Yields user-visible text deltas (`delta.content`).
   */
  async *streamChatCompletion(
    request: Omit<CerebrasChatRequest, 'stream'>,
    options?: { signal?: AbortSignal },
  ): AsyncGenerator<string, void, undefined> {
    const body = this.buildRequestBody({ ...request, stream: true })
    const response = await this.post(body, options?.signal)

    if (!response.ok) {
      const text = await response.text()
      const payload = parseJson(text)
      throw new VertexApiError(response.status, errorMessage(response.status, payload, text), payload)
    }

    if (!response.body) {
      throw new VertexApiError(502, 'Google Vertex stream response had no body', null)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const rawLine of lines) {
          const line = rawLine.trim()
          if (!line || line.startsWith(':')) continue
          if (!line.startsWith('data:')) continue

          const data = line.slice(5).trim()
          if (data === '[DONE]') return

          try {
            const parsed = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string | null } }>
            }
            const content = parsed.choices?.[0]?.delta?.content
            if (typeof content === 'string' && content.length > 0) yield content
          } catch {
            // Ignore malformed SSE chunks; continue streaming.
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  private buildRequestBody(request: CerebrasChatRequest): Record<string, unknown> {
    const model = request.model ? toApiModelId(request.model) : this.defaultModel
    if (!model) throw new VertexApiError(0, 'Google Vertex requires a model id', null)

    const body: Record<string, unknown> = {
      model,
      messages: request.messages,
    }
    if (request.temperature !== undefined) body.temperature = request.temperature
    if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens
    if (request.responseFormat) body.response_format = toResponseFormatPayload(request.responseFormat)
    if (request.stream) body.stream = true
    return body
  }

  private async post(body: Record<string, unknown>, signal?: AbortSignal): Promise<Response> {
    const auth = await resolveVertexRequest()
    const url = endpointFor(auth.projectId)
    if (!url) throw new VertexApiError(0, 'GOOGLE_VERTEX_PROJECT_ID is not set', null)

    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...auth.headers,
      },
      body: JSON.stringify(body),
      signal,
    })
  }
}

function parseJson(text: string): unknown {
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    return {}
  }
}

export function createVertexClient(options?: VertexClientOptions): VertexClient {
  return new VertexClient(options)
}
