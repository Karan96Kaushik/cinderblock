import type {
  CerebrasChatRequest,
  CerebrasChatResponse,
  CerebrasClientOptions,
  CerebrasRawChatCompletion,
  CerebrasRawErrorBody,
} from './types'

const DEFAULT_BASE_URL = 'https://api.cerebras.ai/v1'
const DEFAULT_MODEL = 'gpt-oss-120b'

/** Amplify Gen 2 injects this until `ampx sandbox secret set` resolves SSM. */
const AMPLIFY_SSM_PLACEHOLDER = '<value will be resolved during runtime>'

export class CerebrasApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, message: string, body: unknown) {
    super(message)
    this.name = 'CerebrasApiError'
    this.status = status
    this.body = body
  }
}

function readEnvApiKey(): string | undefined {
  return typeof process !== 'undefined' ? process.env.CEREBRAS_API_KEY : undefined
}

function resolveApiKey(explicit?: string): string {
  const apiKey = (explicit ?? readEnvApiKey())?.trim()
  if (!apiKey || apiKey === AMPLIFY_SSM_PLACEHOLDER) {
    throw new Error(
      'Cerebras API key is missing or unresolved. For local scripts, `export CEREBRAS_API_KEY=...`. ' +
        'For Amplify Lambdas, run `npx ampx sandbox secret set CEREBRAS_API_KEY` ' +
        '(shell export alone does not populate function secrets).',
    )
  }
  return apiKey
}

/**
 * Thin client around the Cerebras chat-completions API
 * (https://inference-docs.cerebras.ai/api-reference/chat-completions).
 * Intended for server-side / script usage — reads the API key from
 * `CEREBRAS_API_KEY` by default.
 */
export class CerebrasClient {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly defaultModel: string

  constructor(options: CerebrasClientOptions = {}) {
    this.apiKey = resolveApiKey(options.apiKey)
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '')
    this.defaultModel = options.model ?? DEFAULT_MODEL
  }

  async chatCompletion(request: CerebrasChatRequest): Promise<CerebrasChatResponse> {
    const body = this.buildRequestBody(request)
    const response = await this.post(body)

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      const errorBody = payload as CerebrasRawErrorBody
      throw new CerebrasApiError(
        response.status,
        errorBody.error?.message ?? `Cerebras request failed (${response.status})`,
        payload,
      )
    }

    return toChatResponse(payload as CerebrasRawChatCompletion, body.model as string)
  }

  /**
   * Streaming chat completion. Yields text deltas as they arrive from Cerebras SSE.
   * Callers must drain the iterator fully (or abort via AbortSignal).
   */
  async *streamChatCompletion(
    request: Omit<CerebrasChatRequest, 'stream'>,
    options?: { signal?: AbortSignal },
  ): AsyncGenerator<string, void, undefined> {
    const body = this.buildRequestBody({ ...request, stream: true })
    const response = await this.post(body, options?.signal)

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      const errorBody = payload as CerebrasRawErrorBody
      throw new CerebrasApiError(
        response.status,
        errorBody.error?.message ?? `Cerebras request failed (${response.status})`,
        payload,
      )
    }

    if (!response.body) {
      throw new CerebrasApiError(502, 'Cerebras stream response had no body', null)
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
            const delta = parsed.choices?.[0]?.delta?.content
            if (typeof delta === 'string' && delta.length > 0) {
              yield delta
            }
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
    const body: Record<string, unknown> = {
      model: request.model ?? this.defaultModel,
      messages: request.messages,
    }

    if (request.temperature !== undefined) body.temperature = request.temperature
    if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens
    if (request.responseFormat) body.response_format = toResponseFormatPayload(request.responseFormat)
    if (request.stream) body.stream = true

    return body
  }

  private async post(body: Record<string, unknown>, signal?: AbortSignal): Promise<Response> {
    return fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    })
  }
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

export function createCerebrasClient(options?: CerebrasClientOptions): CerebrasClient {
  return new CerebrasClient(options)
}
