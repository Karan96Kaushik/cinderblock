import { createCerebrasClient } from './client'
import { requestStructuredJson } from './structured'
import type { AiChatMode } from '../ai-chat/parse-sentinels'
import { formatPlanDiffForPrompt, type PlanDiffSummary } from '../ai-chat/plan-diff'

export type ScopeJudgeStage = 'apply' | 'save'

export type ScopeJudgeVerdict = 'accept' | 'reject'

export type ScopeJudgeResult = {
  verdict: ScopeJudgeVerdict
  reason: string
  requestedChanges: string[]
  extraChanges: string[]
}

export const cerebrasScopeJudgeSchema = {
  type: 'object',
  properties: {
    verdict: {
      type: 'string',
      description: 'Exactly "accept" or "reject".',
    },
    reason: {
      type: 'string',
      description: 'One or two sentences explaining the verdict for the user.',
    },
    requestedChanges: {
      type: 'array',
      items: { type: 'string' },
      description: 'Changes the user actually asked for or confirmed.',
    },
    extraChanges: {
      type: 'array',
      items: { type: 'string' },
      description: 'Material changes in the proposed plan that the user did not request.',
    },
  },
  required: ['verdict', 'reason', 'requestedChanges', 'extraChanges'],
  additionalProperties: false,
} as const

export const SCOPE_JUDGE_CONTEXT = `You are a strict change-scope auditor for Cinderblock workout plans. You do not coach and you do not improve programs. You only decide whether a proposed plan stays within what the user asked for.

Reject when the proposed plan includes material extras the user did not request or confirm, including:
- extra training days, workouts, or a split redesign
- swapping or adding exercises they did not mention
- rewriting notes, goals, progression, or phases they did not ask to change
- "while we're here" improvements, rebalancing, renaming, or restructuring

Accept when:
- the plan only applies the requested / confirmed items
- create mode produced a complete program that matches stated days, equipment, and goals without large unsolicited extras
- small mechanical follow-through is required (e.g. a schedule day label following a workout rename they requested)
- differences are formatting, wording restatement of the same content, or the Version line

If there is no previous plan (first create draft), judge the proposed plan against the user's stated requirements only.
If the user only asked a question (discuss) and did not ask to change the plan, reject any rewrite.
When unsure whether an extra is material, reject.`

export type ScopeJudgePromptInput = {
  mode: AiChatMode
  stage: ScopeJudgeStage
  runningSummary: string
  conversation: string
  previousPlan: string
  proposedPlan: string
  diff: PlanDiffSummary
}

export function buildScopeJudgePrompt(input: ScopeJudgePromptInput): string {
  const stageLine =
    input.stage === 'save'
      ? 'This is the final save check. Reject if the program that would be persisted overreaches the conversation.'
      : 'This is the apply check after the coach emitted a new <<PLAN>>. Reject if that draft overreaches the latest request.'

  const previousBlock = input.previousPlan.trim()
    ? input.previousPlan.trim()
    : '(none — this is a first draft)'

  return `Mode: ${input.mode}
Stage: ${input.stage}
${stageLine}

Running summary of constraints and decisions:
${input.runningSummary.trim() || '(none)'}

Conversation (user requests and coach replies):
${input.conversation.trim() || '(none)'}

Line-level diff (ignore Version:):
${formatPlanDiffForPrompt(input.diff)}

Previous plan:
${previousBlock}

Proposed plan:
${input.proposedPlan.trim() || '(empty)'}

Return JSON only. verdict must be exactly "accept" or "reject".`
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

export function normalizeScopeJudgeResult(raw: unknown): ScopeJudgeResult {
  const record = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const verdictRaw = typeof record.verdict === 'string' ? record.verdict.trim().toLowerCase() : ''
  const extraChanges = asStringArray(record.extraChanges)
  const requestedChanges = asStringArray(record.requestedChanges)
  const reason =
    typeof record.reason === 'string' && record.reason.trim()
      ? record.reason.trim()
      : verdictRaw === 'reject'
        ? 'The proposed plan includes changes beyond what you asked for.'
        : 'Changes match the request.'

  // An explicit reject, or extras listed with a non-accept verdict, fail closed.
  const verdict: ScopeJudgeVerdict =
    verdictRaw === 'reject' || (verdictRaw !== 'accept' && extraChanges.length > 0)
      ? 'reject'
      : 'accept'

  return { verdict, reason, requestedChanges, extraChanges }
}

export async function requestScopeJudgement(
  input: ScopeJudgePromptInput,
): Promise<ScopeJudgeResult> {
  const client = createCerebrasClient({
    model: process.env.CEREBRAS_MODEL?.trim() || undefined,
  })

  const result = await requestStructuredJson<unknown>({
    prompt: buildScopeJudgePrompt(input),
    context: SCOPE_JUDGE_CONTEXT,
    schemaName: 'plan_scope_judge',
    schema: cerebrasScopeJudgeSchema as unknown as Record<string, unknown>,
    client,
    temperature: 0,
  })

  return normalizeScopeJudgeResult(result.data)
}
