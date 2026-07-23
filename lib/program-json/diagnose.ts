import type { ProgramDocument, ProgramExercise, ProgramIssue } from './types'
import { validateProgramDocument } from './validate'

function issue(
  severity: ProgramIssue['severity'],
  path: string,
  code: string,
  message: string,
): ProgramIssue {
  return { severity, path, code, message }
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function diagnoseExercise(
  exercise: ProgramExercise,
  path: string,
  issues: ProgramIssue[],
): void {
  if (!exercise.name.trim()) {
    issues.push(issue('error', `${path}.name`, 'empty_name', 'Exercise name is empty'))
  }

  const hasReps = Boolean(exercise.reps?.trim())
  const hasDuration = Boolean(exercise.duration?.trim())
  if (!hasReps && !hasDuration) {
    issues.push(
      issue(
        'error',
        path,
        'missing_reps_or_duration',
        'Exercise must have reps or duration',
      ),
    )
  }

  if (exercise.muscles.length === 0) {
    issues.push(issue('warning', `${path}.muscles`, 'empty_muscles', 'Exercise has no muscles listed'))
  } else if (exercise.muscles.some((m) => !m.trim())) {
    issues.push(
      issue('warning', `${path}.muscles`, 'blank_muscle', 'Exercise has a blank muscle entry'),
    )
  }

  if (exercise.notes.length === 0) {
    issues.push(issue('warning', `${path}.notes`, 'empty_notes', 'Exercise has no notes'))
  } else if (exercise.notes.some((n) => !n.trim())) {
    issues.push(issue('warning', `${path}.notes`, 'blank_note', 'Exercise has a blank note entry'))
  }

  if (hasDuration && exercise.seconds !== undefined && !exercise.seconds.trim()) {
    issues.push(
      issue(
        'warning',
        `${path}.seconds`,
        'empty_seconds',
        'Timed exercise has an empty seconds field',
      ),
    )
  }

  if (exercise.refVideo !== undefined) {
    if (!exercise.refVideo.trim()) {
      issues.push(
        issue('warning', `${path}.refVideo`, 'empty_ref_video', 'Reference video URL is empty'),
      )
    } else if (!isHttpUrl(exercise.refVideo)) {
      issues.push(
        issue(
          'warning',
          `${path}.refVideo`,
          'invalid_ref_video',
          'Reference video is not a valid http(s) URL',
        ),
      )
    }
  }
}

/**
 * Schema validation plus content lint checks. Returns all issues found.
 */
export function diagnoseProgramDocument(raw: unknown): ProgramIssue[] {
  const validation = validateProgramDocument(raw)
  if (!validation.ok) {
    return validation.issues
  }

  const doc = validation.data
  const issues: ProgramIssue[] = []

  if (!doc.name.trim()) {
    issues.push(issue('error', 'name', 'empty_name', 'Program name is empty'))
  }

  if (!doc.version.trim()) {
    issues.push(issue('warning', 'version', 'empty_version', 'Program version is empty'))
  }

  if (doc.goal.length === 0) {
    issues.push(issue('warning', 'goal', 'empty_goal', 'Program has no goals'))
  }

  const workoutEntries = Object.entries(doc.workouts)
  if (workoutEntries.length === 0) {
    issues.push(issue('error', 'workouts', 'no_workouts', 'Program has no workouts'))
  }

  const workoutNames = new Set(
    workoutEntries.map(([, workout]) => workout.name.trim().toLowerCase()).filter(Boolean),
  )

  for (const [key, workout] of workoutEntries) {
    const workoutPath = `workouts.${key}`

    if (!workout.name.trim()) {
      issues.push(issue('error', `${workoutPath}.name`, 'empty_name', 'Workout name is empty'))
    }

    if (workout.exercises.length === 0) {
      issues.push(
        issue('error', `${workoutPath}.exercises`, 'empty_exercises', 'Workout has no exercises'),
      )
    }

    const seenNames = new Set<string>()
    for (let i = 0; i < workout.exercises.length; i++) {
      const exercise = workout.exercises[i]!
      const exercisePath = `${workoutPath}.exercises.${i}`
      diagnoseExercise(exercise, exercisePath, issues)

      const normalized = exercise.name.trim().toLowerCase()
      if (normalized) {
        if (seenNames.has(normalized)) {
          issues.push(
            issue(
              'warning',
              exercisePath,
              'duplicate_exercise',
              `Duplicate exercise name "${exercise.name}" in workout`,
            ),
          )
        }
        seenNames.add(normalized)
      }
    }
  }

  for (const [dayKey, label] of Object.entries(doc.schedule)) {
    const dayPath = `schedule.${dayKey}`
    if (!label.trim()) {
      issues.push(issue('warning', dayPath, 'empty_schedule_day', 'Schedule day label is empty'))
      continue
    }

    const normalizedLabel = label.toLowerCase()
    if (normalizedLabel.includes('rest')) continue

    const matchesWorkout = [...workoutNames].some((name) => normalizedLabel.includes(name))
    if (workoutNames.size > 0 && !matchesWorkout) {
      issues.push(
        issue(
          'warning',
          dayPath,
          'schedule_workout_mismatch',
          `Schedule label "${label}" does not reference a known workout name`,
        ),
      )
    }
  }

  if (doc.successMetrics.length === 0) {
    issues.push(
      issue('warning', 'successMetrics', 'empty_success_metrics', 'Program has no success metrics'),
    )
  }

  if (!doc.progression.method.trim()) {
    issues.push(
      issue('warning', 'progression.method', 'empty_progression_method', 'Progression method is empty'),
    )
  }

  return issues
}

export function diagnoseProgramDocumentTyped(doc: ProgramDocument): ProgramIssue[] {
  return diagnoseProgramDocument(doc)
}
