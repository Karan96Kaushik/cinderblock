const DIFF_LINE_CAP = 80

const IGNORED_LINE_PREFIXES = [/^version:\s*/i]

export type PlanDiffSummary = {
  changed: boolean
  addedCount: number
  removedCount: number
  addedLines: string[]
  removedLines: string[]
}

function normalizeLine(line: string): string | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  if (IGNORED_LINE_PREFIXES.some((pattern) => pattern.test(trimmed))) return null
  return trimmed
}

function lineSet(text: string): Set<string> {
  const lines = new Set<string>()
  for (const raw of text.split('\n')) {
    const line = normalizeLine(raw)
    if (line) lines.add(line)
  }
  return lines
}

/**
 * Set-of-lines diff for two plaintext plans. Ignores blank lines and the
 * Version: header so a restated plan with the same content is not a change.
 */
export function diffPlaintextPlans(previous: string, proposed: string): PlanDiffSummary {
  const before = lineSet(previous)
  const after = lineSet(proposed)
  const addedLines: string[] = []
  const removedLines: string[] = []

  for (const line of after) {
    if (!before.has(line)) addedLines.push(line)
  }
  for (const line of before) {
    if (!after.has(line)) removedLines.push(line)
  }

  return {
    changed: addedLines.length > 0 || removedLines.length > 0,
    addedCount: addedLines.length,
    removedCount: removedLines.length,
    addedLines,
    removedLines,
  }
}

export function formatPlanDiffForPrompt(diff: PlanDiffSummary): string {
  if (!diff.changed) return '(no material line-level changes)'

  const added = diff.addedLines.slice(0, DIFF_LINE_CAP)
  const removed = diff.removedLines.slice(0, DIFF_LINE_CAP)
  const parts = [
    `Added lines (${diff.addedCount}):`,
    added.length > 0 ? added.map((line) => `+ ${line}`).join('\n') : '(none)',
  ]

  if (diff.addedCount > added.length) {
    parts.push(`… ${diff.addedCount - added.length} more added lines omitted`)
  }

  parts.push(`Removed lines (${diff.removedCount}):`)
  parts.push(removed.length > 0 ? removed.map((line) => `- ${line}`).join('\n') : '(none)')

  if (diff.removedCount > removed.length) {
    parts.push(`… ${diff.removedCount - removed.length} more removed lines omitted`)
  }

  return parts.join('\n')
}
