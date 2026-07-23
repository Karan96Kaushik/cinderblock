import type {
  CerebrasChatRequest,
  CerebrasChatResponse,
  CerebrasClientOptions,
  CerebrasRawChatCompletion,
  CerebrasRawErrorBody,
} from './types'

const DEFAULT_BASE_URL = 'https://api.cerebras.ai/v1'
const DEFAULT_MODEL = 'gpt-oss-120b'

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
  const apiKey = explicit ?? readEnvApiKey()
  if (!apiKey) {
    throw new Error(
      'Cerebras API key is missing. Run `export CEREBRAS_API_KEY=...` before starting, ' +
        'or pass `apiKey` explicitly when creating the client.',
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
    const body: Record<string, unknown> = {
      model: request.model ?? this.defaultModel,
      messages: request.messages,
    }

    if (request.temperature !== undefined) body.temperature = request.temperature
    if (request.maxTokens !== undefined) body.max_tokens = request.maxTokens
    if (request.responseFormat) body.response_format = toResponseFormatPayload(request.responseFormat)

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    })

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
