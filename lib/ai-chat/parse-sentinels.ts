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

export type AiChatMode = 'discuss' | 'edit' | 'create'

export type ParsedAssistantPayload = {
  /**
   * User-visible text. Summary / PLAN_READY markers are removed.
   * Plan body stays visible (only the <<PLAN>> tags are stripped).
   */
  displayText: string
  runningSummary: string | null
  plaintextDraft: string | null
  planReady: boolean
}

export type ParseAssistantOptions = {
  /** While streaming, hide incomplete trailing sentinel blocks that aren't closed yet. */
  streaming?: boolean
}

/**
 * Extract SUMMARY / PLAN / PLAN_READY sentinels from an assistant message.
 * - SUMMARY is bookkeeping → removed from UI entirely
 * - PLAN body is the main content → kept in the bubble; tags stripped
 * - PLAN_READY is a soft signal → removed from UI
 */
export function parseAssistantPayload(
  raw: string,
  opts: ParseAssistantOptions = {},
): ParsedAssistantPayload {
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
    // Keep the plan body visible — only drop the sentinel tags.
    working = working.replace(planMatch[0], `\n${planMatch[1] ?? ''}\n`)
  }

  if (working.includes(PLAN_READY_TOKEN)) {
    planReady = true
    working = working.split(PLAN_READY_TOKEN).join('')
  }

  if (opts.streaming) {
    working = scrubIncompleteSentinels(working)
  }

  return {
    displayText: working.replace(/\n{3,}/g, '\n\n').trim(),
    runningSummary,
    plaintextDraft,
    planReady,
  }
}

/**
 * Hide half-written sentinel regions so the user doesn't see raw <<TAGS>>
 * flicker while tokens arrive.
 */
function scrubIncompleteSentinels(text: string): string {
  let working = text

  // Open SUMMARY without END yet → hide from the tag to the end (it's trailing bookkeeping).
  const summaryOpen = working.lastIndexOf(SUMMARY_START)
  if (summaryOpen !== -1 && !working.includes(SUMMARY_END, summaryOpen)) {
    working = working.slice(0, summaryOpen)
  }

  // Open PLAN without END yet → drop the opening tag, keep the body that's streaming in.
  const planOpen = working.lastIndexOf(PLAN_START)
  if (planOpen !== -1 && !working.includes(PLAN_END, planOpen)) {
    working =
      working.slice(0, planOpen) + working.slice(planOpen + PLAN_START.length)
  }

  // Hide a partial tag being typed at the end, e.g. "<<PLA" or "<<SUM".
  working = working.replace(/<<(?:PLAN(?:_READY)?)?$|<<(?:END_)?(?:PLAN|SUMMARY)?$/i, '')

  return working
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
