/**
 * Integration test for the Cerebras module: sends a prompt + context to
 * Cerebras, requests a structured JSON program, then validates and
 * diagnoses the result in memory via `ProgramJsonManager`.
 *
 * Logs every stage in full (request, raw API response, parsed data,
 * transformed document, validation, diagnostics) to stdout and to a
 * timestamped file under `logs/`.
 *
 * Usage:
 *   export CEREBRAS_API_KEY=your-key-here
 *   npm run test:cerebras
 *
 * Optional env vars:
 *   CEREBRAS_MODEL   overrides the default model (gpt-oss-120b)
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  cerebrasProgramGenerationSchema,
  requestStructuredJson,
  toProgramDocumentPatch,
  type CerebrasProgramGeneration,
} from '../lib/cerebras'
import { ProgramJsonManager } from '../lib/program-json'

const PROMPT = `Design a 3-day full-body strength program for an intermediate lifter
who also runs twice a week and wants to build muscle while maintaining running
performance. Include:
- A 7-day weekly schedule (day1-day7) mixing lifting days, running days, and rest.
- Exactly 3 workouts, each with 6-8 exercises covering major muscle groups.
- A double-progression scheme with a worked example.
- 3 training-phase blocks ("weeks") covering an 8-week cycle.
- 4-6 program-level goals and 4-6 success metrics.`

const CONTEXT = `You are a strength and conditioning coach producing structured training
program data for the "Cinderblock" workout app. Follow these conventions:
- Exercise "sets" is a positive integer.
- Exercise "reps" is a rep range string like "8-12"; use null only for timed holds.
- Timed-hold exercises set "duration" (e.g. "30-60 seconds") and "reps" to null.
- "muscles" and "notes" must be non-empty arrays of short strings.
- Workout "key" values are short camelCase ids, e.g. "fullBodyA", unique per workout.
- "weeks" phase ids look like "week1-2" and describe guidance for that phase.
- Schedule day values should reference a workout's "name" or say "Rest".
- Return only the fields defined by the JSON schema — no extra commentary.`

const LOG_DIR = join(process.cwd(), 'logs')

/** Logs a titled section to stdout in full (no truncation) and to the in-memory log buffer. */
function logSection(buffer: string[], title: string, value: unknown): void {
  const heading = `\n===== ${title} =====`
  const body = typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  console.log(heading)
  console.log(body)
  buffer.push(heading, body)
}

function writeLogFile(buffer: string[]): string {
  mkdirSync(LOG_DIR, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filePath = join(LOG_DIR, `cerebras-program-${timestamp}.log`)
  writeFileSync(filePath, buffer.join('\n') + '\n', 'utf8')
  return filePath
}

async function main(): Promise<void> {
  const buffer: string[] = []
  const model = process.env.CEREBRAS_MODEL ?? '(default: gpt-oss-120b)'

  logSection(buffer, 'Request', {
    model,
    prompt: PROMPT,
    context: CONTEXT,
    schemaName: 'program_generation',
    schema: cerebrasProgramGenerationSchema,
  })

  console.log('\nCalling Cerebras...')

  const result = await requestStructuredJson<CerebrasProgramGeneration>({
    prompt: PROMPT,
    context: CONTEXT,
    schemaName: 'program_generation',
    schema: cerebrasProgramGenerationSchema,
    model: process.env.CEREBRAS_MODEL,
  })

  logSection(buffer, 'Full raw API response', result.response.raw)
  logSection(buffer, 'Response metadata', {
    id: result.response.id,
    model: result.response.model,
    finishReason: result.response.finishReason,
    usage: result.response.usage,
  })
  logSection(buffer, 'Structured content (raw string from model)', result.raw)
  logSection(buffer, 'Parsed structured data', result.data)

  const patch = toProgramDocumentPatch(result.data)
  logSection(buffer, 'Transformed ProgramDocument patch', patch)

  const manager = ProgramJsonManager.createFromTemplate(patch)

  const validation = manager.validate()
  logSection(buffer, `Schema validation: ${validation.ok ? 'PASSED' : 'FAILED'}`, validation)

  const issues = manager.diagnose()
  logSection(buffer, `Diagnostics (${issues.length} issue${issues.length === 1 ? '' : 's'})`, issues)

  logSection(buffer, 'Final document', manager.get())

  const logFilePath = writeLogFile(buffer)
  console.log(`\nFull log written to: ${logFilePath}`)

  const hasErrors = !validation.ok || issues.some((issue) => issue.severity === 'error')
  if (hasErrors) {
    console.log('\nResult: FAILED (schema or content errors found)')
    process.exitCode = 1
  } else {
    console.log('\nResult: OK')
  }
}

main().catch((error: unknown) => {
  console.error('\nCerebras program test failed:')
  console.error(error instanceof Error ? (error.stack ?? error.message) : error)
  process.exitCode = 1
})
