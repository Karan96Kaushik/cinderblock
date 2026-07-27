import type { ProgramDocument, ProgramExercise } from '../program-json'

function formatExercise(exercise: ProgramExercise): string {
  const load =
    exercise.reps ??
    exercise.duration ??
    (exercise.seconds ? `${exercise.seconds}s` : undefined) ??
    '?'
  const muscles = exercise.muscles.length > 0 ? ` [${exercise.muscles.join(', ')}]` : ''
  const notes =
    exercise.notes.length > 0
      ? `\n    Notes: ${exercise.notes.join('; ')}`
      : ''
  return `  - ${exercise.name}: ${exercise.sets}×${load}${muscles}${notes}`
}

/**
 * Deterministic ProgramDocument → plaintext for AI chat context.
 * Not an LLM call — used on first edit-mode turn and for report payloads.
 */
export function programToPlaintext(program: ProgramDocument): string {
  const lines: string[] = []

  lines.push(`Program: ${program.name}`)
  lines.push(`Version: ${program.version}`)
  lines.push('')

  if (program.goal.length > 0) {
    lines.push('Goals:')
    for (const goal of program.goal) lines.push(`  - ${goal}`)
    lines.push('')
  }

  lines.push('Weekly schedule:')
  for (const day of [
    'day1',
    'day2',
    'day3',
    'day4',
    'day5',
    'day6',
    'day7',
  ] as const) {
    lines.push(`  ${day}: ${program.schedule[day]}`)
  }
  lines.push('')

  if (program.globalNotes.length > 0) {
    lines.push('Global notes:')
    for (const note of program.globalNotes) lines.push(`  - ${note}`)
    lines.push('')
  }

  lines.push(`Progression: ${program.progression.method}`)
  lines.push(
    `  Example (${program.progression.example.exercise}): ${program.progression.example.nextStep}`,
  )
  lines.push('')

  const weekKeys = Object.keys(program.weeks)
  if (weekKeys.length > 0) {
    lines.push('Training phases:')
    for (const phase of weekKeys) {
      lines.push(`  ${phase}:`)
      for (const note of program.weeks[phase] ?? []) lines.push(`    - ${note}`)
    }
    lines.push('')
  }

  lines.push('Workouts:')
  for (const [key, workout] of Object.entries(program.workouts)) {
    lines.push(`\n[${key}] ${workout.name}`)
    for (const exercise of workout.exercises) {
      lines.push(formatExercise(exercise))
    }
  }

  if (program.successMetrics.length > 0) {
    lines.push('')
    lines.push('Success metrics:')
    for (const metric of program.successMetrics) lines.push(`  - ${metric}`)
  }

  return lines.join('\n').trim()
}
