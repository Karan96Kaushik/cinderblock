export type CerebrasRole = 'system' | 'user' | 'assistant'

export type CerebrasMessage = {
  role: CerebrasRole
  content: string
}

export type CerebrasJsonSchema = {
  /** Identifier for the schema; echoed back by the API, useful for logging. */
  name: string
  /**
   * When true, Cerebras uses constrained decoding to guarantee the response
   * matches `schema` exactly. Requires `additionalProperties: false` and a
   * fully populated `required` array at every object level in the schema.
   */
  strict?: boolean
  schema: Record<string, unknown>
}

export type CerebrasResponseFormat =
  | { type: 'text' }
  | { type: 'json_object' }
  | { type: 'json_schema'; jsonSchema: CerebrasJsonSchema }

export type CerebrasReasoningFormat = 'parsed' | 'raw' | 'hidden' | 'none'
export type CerebrasReasoningEffort = 'low' | 'medium' | 'high'

export type CerebrasChatRequest = {
  model?: string
  messages: CerebrasMessage[]
  responseFormat?: CerebrasResponseFormat
  temperature?: number
  maxTokens?: number
  /** When true, the API returns an SSE stream of token deltas. */
  stream?: boolean
  /**
   * How reasoning models (gpt-oss-120b, gemma-4-31b) return chain-of-thought.
   * `parsed` puts thinking in `delta.reasoning` and the user-visible reply in
   * `delta.content` — content does not start until reasoning finishes.
   */
  reasoningFormat?: CerebrasReasoningFormat
  reasoningEffort?: CerebrasReasoningEffort
}

export type CerebrasUsage = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export type CerebrasChatResponse = {
  id: string
  model: string
  content: string
  finishReason: string | null
  usage?: CerebrasUsage
  /** Full, untyped response body as returned by the Cerebras API. */
  raw: unknown
}

export type CerebrasClientOptions = {
  /** Falls back to the `CEREBRAS_API_KEY` environment variable when omitted. */
  apiKey?: string
  /** Defaults to `https://api.cerebras.ai/v1`. */
  baseUrl?: string
  /** Default model used when a request does not specify one. */
  model?: string
}

/** Shape of the raw Cerebras chat-completions API response body. */
export type CerebrasRawChatCompletion = {
  id?: string
  model?: string
  choices?: Array<{
    message?: { role?: string; content?: string | null }
    finish_reason?: string | null
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

export type CerebrasRawErrorBody = {
  error?: { message?: string; type?: string; code?: string }
}
