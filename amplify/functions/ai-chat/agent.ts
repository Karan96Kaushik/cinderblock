import { requestStructuredJson } from '../../../lib/cerebras/structured'
import type { VertexClient } from '../../../lib/vertex/client'
import type { AiChatMode } from '../../../lib/ai-chat/parse-sentinels'
import { buildChatSystemPrompt } from './prompts'

const MAX_PARTS = 5

const planSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    goal: {
      type: 'string',
      description: 'One sentence describing the finished outcome of this user request.',
    },
    parts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          task: {
            type: 'string',
            description: 'One concrete piece of the request, in the order it should be done.',
          },
          changesPlan: {
            type: 'boolean',
            description: 'True when this part must change the workout plan. False for a question or explanation.',
          },
        },
        required: ['task', 'changesPlan'],
      },
    },
  },
  required: ['goal', 'parts'],
} as const

const partSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: {
      type: 'string',
      description: 'One sentence: what this part concluded or changed.',
    },
    detail: {
      type: 'string',
      description:
        'Facts or exact edits the final reply must use. For plan edits, name the workout, exercise, and new sets, reps, or schedule line. Do not write the full plan.',
    },
  },
  required: ['summary', 'detail'],
} as const

export type AgentPart = {
  task: string
  changesPlan: boolean
}

export type ProcessedPart = AgentPart & {
  summary: string
  detail: string
}

type PlanDraft = {
  goal?: unknown
  parts?: unknown
}

type PartDraft = {
  summary?: unknown
  detail?: unknown
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function messageChangesPlan(message: string, mode: AiChatMode): boolean {
  if (mode === 'create' || mode === 'edit') return true
  return /\b(change|swap|replace|add|remove|delete|update|create|build|rewrite|increase|decrease|drop|cut)\b/i.test(
    message,
  )
}

function normalizeParts(raw: unknown, fallbackTask: string): { goal: string; parts: AgentPart[] } {
  const record = raw && typeof raw === 'object' ? (raw as PlanDraft) : {}
  const goal = asText(record.goal) || fallbackTask
  const parts = Array.isArray(record.parts)
    ? record.parts
        .map((item) => {
          if (!item || typeof item !== 'object') return null
          const row = item as { task?: unknown; changesPlan?: unknown }
          const task = asText(row.task)
          if (!task) return null
          return { task, changesPlan: row.changesPlan === true }
        })
        .filter((part): part is AgentPart => part !== null)
        .slice(0, MAX_PARTS)
    : []

  if (parts.length === 0) {
    return { goal, parts: [{ task: fallbackTask, changesPlan: false }] }
  }
  return { goal, parts }
}

/**
 * Break one user request into ordered parts, process each part, then stream
 * a single finished reply. The user does not confirm between parts.
 */
export async function* streamAgentReply(args: {
  client: VertexClient
  mode: AiChatMode
  userPayload: string
  newMessage: string
}): AsyncGenerator<string, void, undefined> {
  const planned = await planRequest(args)
  const processed: ProcessedPart[] = []

  for (const part of planned.parts) {
    const result = await processPart({
      client: args.client,
      userPayload: args.userPayload,
      goal: planned.goal,
      part,
      earlier: processed,
    })
    processed.push(result)
  }

  yield* args.client.streamChatCompletion({
    messages: [
      { role: 'system', content: buildChatSystemPrompt(args.mode) },
      {
        role: 'user',
        content: buildSynthesisPrompt({
          userPayload: args.userPayload,
          goal: planned.goal,
          parts: processed,
        }),
      },
    ],
    temperature: 0.4,
    maxTokens: 8192,
  })
}

async function planRequest(args: {
  client: VertexClient
  mode: AiChatMode
  userPayload: string
  newMessage: string
}): Promise<{ goal: string; parts: AgentPart[] }> {
  try {
    const result = await requestStructuredJson<PlanDraft>({
      client: args.client,
      temperature: 0.2,
      schemaName: 'turn_plan',
      schema: planSchema as unknown as Record<string, unknown>,
      context: `You split one workout-coaching request into ordered parts. You do not answer the user.
Mode: ${args.mode}.
Rules:
- Cover the whole request. Do not drop a change they asked for, and do not add work they did not ask for.
- Each part is one concrete task (one exercise swap, one schedule change, one question).
- changesPlan is true only when that part rewrites the workout plan.
- A pure question is one part with changesPlan false.
- At most ${MAX_PARTS} parts. Merge tiny leftovers into the nearest part.
- Do not include a part that asks the user to confirm.`,
      prompt: args.userPayload,
    })
    return normalizeParts(result.data, args.newMessage)
  } catch {
    return {
      goal: args.newMessage,
      parts: [{ task: args.newMessage, changesPlan: messageChangesPlan(args.newMessage, args.mode) }],
    }
  }
}

async function processPart(args: {
  client: VertexClient
  userPayload: string
  goal: string
  part: AgentPart
  earlier: ProcessedPart[]
}): Promise<ProcessedPart> {
  const earlierBlock =
    args.earlier.length === 0
      ? '(none yet)'
      : args.earlier
          .map((part, index) => `${index + 1}. ${part.task}\n${part.detail}`)
          .join('\n\n')

  try {
    const result = await requestStructuredJson<PartDraft>({
      client: args.client,
      temperature: 0.2,
      schemaName: 'turn_part',
      schema: partSchema as unknown as Record<string, unknown>,
      context: `You process exactly one part of a workout request. You do not write the user-facing reply and you do not write the full plan.
Use the current plan and earlier part results as facts.
If changesPlan is true, detail must state the exact edit (workout, exercise, sets, reps, duration, or schedule line) and nothing else.
If changesPlan is false, detail must state the answer facts for this part only.
Do not invent extras the user did not ask for. Do not ask a follow-up question.`,
      prompt: `${args.userPayload}

Goal: ${args.goal}

Earlier parts already processed:
${earlierBlock}

Part to process now:
${args.part.task}
changesPlan: ${args.part.changesPlan ? 'true' : 'false'}`,
    })
    return {
      ...args.part,
      summary: asText(result.data.summary) || args.part.task,
      detail: asText(result.data.detail) || args.part.task,
    }
  } catch {
    return {
      ...args.part,
      summary: args.part.task,
      detail: args.part.task,
    }
  }
}

function buildSynthesisPrompt(args: {
  userPayload: string
  goal: string
  parts: ProcessedPart[]
}): string {
  const partBlock = args.parts
    .map(
      (part, index) =>
        `${index + 1}. ${part.task} (changesPlan: ${part.changesPlan ? 'yes' : 'no'})\nSummary: ${part.summary}\nDetail: ${part.detail}`,
    )
    .join('\n\n')

  return `${args.userPayload}

---

The request was split into parts and each part has already been processed. Finish the turn now.

Goal: ${args.goal}

Processed parts (binding — do not add changes beyond these):
${partBlock}`
}
