export const SUMMARY_START = '<<SUMMARY>>'
export const SUMMARY_END = '<<END_SUMMARY>>'
export const PLAN_START = '<<PLAN>>'
export const PLAN_END = '<<END_PLAN>>'
export const PLAN_READY_TOKEN = '<<PLAN_READY>>'

export const AI_CHAT_SCHEMA_VERSION = '1.0'
export const AI_CHAT_MAX_RECENT_TURNS = 7

export type ChatRole = 'user' | 'assistant'

export type ChatTurn = {
  role: ChatRole
  content: string
}

export type AiChatMode = 'explain' | 'edit' | 'create'

export type ParsedAssistantPayload = {
  /** User-visible text with sentinel blocks removed. */
  displayText: string
  runningSummary: string | null
  plaintextDraft: string | null
  planReady: boolean
}

/**
 * Extract SUMMARY / PLAN / PLAN_READY sentinels from an assistant message.
 * Sentinels are stripped from the text shown in the chat UI.
 */
export function parseAssistantPayload(raw: string): ParsedAssistantPayload {
  let working = raw
  let runningSummary: string | null = null
  let plaintextDraft: string | null = null
  let planReady = false

  const summaryMatch = working.match(/<<SUMMARY>>([\s\S]*?)<<END_SUMMARY>>/)
  if (summaryMatch) {
    runningSummary = summaryMatch[1]?.trim() || null
    working = working.replace(summaryMatch[0], '')
  }

  const planMatch = working.match(/<<PLAN>>([\s\S]*?)<<END_PLAN>>/)
  if (planMatch) {
    plaintextDraft = planMatch[1]?.trim() || null
    working = working.replace(planMatch[0], '')
  }

  if (working.includes(PLAN_READY_TOKEN)) {
    planReady = true
    working = working.split(PLAN_READY_TOKEN).join('')
  }

  return {
    displayText: working.replace(/\n{3,}/g, '\n\n').trim(),
    runningSummary,
    plaintextDraft,
    planReady,
  }
}

/**
 * Keep at most `maxTurns` recent messages. Older overflow is folded into a
 * compact textual note the caller can merge into runningSummary locally
 * when the model forgets to emit <<SUMMARY>>.
 */
export function trimRecentTurns(
  turns: ChatTurn[],
  maxTurns: number = AI_CHAT_MAX_RECENT_TURNS,
): { recentTurns: ChatTurn[]; overflow: ChatTurn[] } {
  if (turns.length <= maxTurns) {
    return { recentTurns: turns, overflow: [] }
  }
  const overflowCount = turns.length - maxTurns
  return {
    overflow: turns.slice(0, overflowCount),
    recentTurns: turns.slice(overflowCount),
  }
}

export function foldOverflowIntoSummary(
  currentSummary: string,
  overflow: ChatTurn[],
): string {
  if (overflow.length === 0) return currentSummary
  const overflowText = overflow
    .map((turn) => `${turn.role}: ${turn.content.slice(0, 240)}`)
    .join(' | ')
  const base = currentSummary.trim()
  const addition = `Earlier context: ${overflowText}`
  return base ? `${base}\n${addition}` : addition
}
