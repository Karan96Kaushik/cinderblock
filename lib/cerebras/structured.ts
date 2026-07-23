import { CerebrasClient, createCerebrasClient } from './client'
import type { CerebrasChatResponse, CerebrasClientOptions, CerebrasMessage, CerebrasUsage } from './types'

export type StructuredJsonRequest = {
  /** The user-facing instruction / task. */
  prompt: string
  /** Additional context injected as a system message ahead of the prompt. */
  context?: string
  /** Name for the JSON schema, echoed back by the API for logging/debugging. */
  schemaName: string
  /** JSON Schema the response must conform to (draft-7 style, strict-mode compatible). */
  schema: Record<string, unknown>
  model?: string
  temperature?: number
  /** Defaults to true (constrained decoding). */
  strict?: boolean
  /** Reuse an existing client instead of creating one from env/options. */
  client?: CerebrasClient
  clientOptions?: CerebrasClientOptions
}

export type StructuredJsonResult<T> = {
  /** Parsed JSON response, typed as requested by the caller. */
  data: T
  /** Raw JSON string returned by the model, prior to parsing. */
  raw: string
  usage?: CerebrasUsage
  /** Full chat-completion response (id, model, finish reason, full API payload). */
  response: CerebrasChatResponse
}

export class StructuredOutputParseError extends Error {
  readonly raw: string

  constructor(raw: string, cause: unknown) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause)
    super(`Failed to parse Cerebras structured output as JSON: ${causeMessage}`)
    this.name = 'StructuredOutputParseError'
    this.raw = raw
  }
}

/**
 * Sends a prompt (plus optional context) to Cerebras and returns the
 * structured JSON response, parsed and typed. Uses `response_format:
 * json_schema` with strict constrained decoding by default so the shape is
 * guaranteed to match `request.schema`.
 */
export async function requestStructuredJson<T = unknown>(
  request: StructuredJsonRequest,
): Promise<StructuredJsonResult<T>> {
  const client = request.client ?? createCerebrasClient(request.clientOptions)

  const messages: CerebrasMessage[] = []
  if (request.context) {
    messages.push({ role: 'system', content: request.context })
  }
  messages.push({ role: 'user', content: request.prompt })

  const response = await client.chatCompletion({
    model: request.model,
    messages,
    temperature: request.temperature,
    responseFormat: {
      type: 'json_schema',
      jsonSchema: {
        name: request.schemaName,
        strict: request.strict ?? true,
        schema: request.schema,
      },
    },
  })

  let data: T
  try {
    data = JSON.parse(response.content) as T
  } catch (error) {
    throw new StructuredOutputParseError(response.content, error)
  }

  return { data, raw: response.content, usage: response.usage, response }
}
