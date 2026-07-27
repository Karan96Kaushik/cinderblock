import type { AiChatMode } from '../../../lib/ai-chat/parse-sentinels'

export function buildChatSystemPrompt(mode: AiChatMode): string {
  const modeLine =
    mode === 'create'
      ? 'The user wants to create a new workout plan from scratch.'
      : mode === 'edit'
        ? 'The user wants to edit their existing workout plan.'
        : 'The user wants to understand/explain their current workout plan. Prefer explanations; only rewrite the plan if they ask to change it.'

  return `You are Cinderblock's workout-plan coach. Speak in clear plain text (no JSON).

${modeLine}

Plan structure you understand:
- A program has a name, version, goals, a 7-day weekly schedule (day1–day7), global notes, progression guidance, training phases ("weeks"), named workouts with exercises (sets/reps or duration, muscles, notes), and success metrics.
- Schedule days reference workout names or Rest.

On every turn where the draft plan changes (or when creating the first full draft), restate the FULL current draft plan (not a diff) inside:
<<PLAN>>
...full plaintext plan...
<<END_PLAN>>

Always include an updated one-paragraph running summary of durable constraints and decisions inside:
<<SUMMARY>>
...one paragraph...
<<END_SUMMARY>>

When the draft is complete and coherent enough to save, append exactly <<PLAN_READY>> at the very end of your message.

Never show JSON. Keep coaching concise. Ask clarifying questions when equipment, injuries, days/week, or goals are unclear.`
}

export function buildChatUserPayload(args: {
  runningSummary: string
  currentPlanContext: string | null
  recentTurns: Array<{ role: string; content: string }>
  newMessage: string
}): string {
  const parts: string[] = []

  if (args.runningSummary.trim()) {
    parts.push(`Running summary:\n${args.runningSummary.trim()}`)
  }

  if (args.currentPlanContext?.trim()) {
    parts.push(`Current plan context (first-turn reference):\n${args.currentPlanContext.trim()}`)
  }

  if (args.recentTurns.length > 0) {
    const history = args.recentTurns
      .map((turn) => `${turn.role.toUpperCase()}: ${turn.content}`)
      .join('\n\n')
    parts.push(`Recent conversation:\n${history}`)
  }

  parts.push(`New user message:\n${args.newMessage.trim()}`)
  return parts.join('\n\n---\n\n')
}
