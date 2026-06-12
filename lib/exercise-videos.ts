export type ExerciseVideoStore = Record<string, string>

const STORAGE_KEY = 'cinderblock_exercise_videos'

export function readExerciseVideos(): ExerciseVideoStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as ExerciseVideoStore
  } catch {
    return {}
  }
}

export function writeExerciseVideos(store: ExerciseVideoStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function normalizeVideoUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed) return null

  try {
    const parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.href
  } catch {
    return null
  }
}

export function setExerciseVideo(
  store: ExerciseVideoStore,
  exerciseName: string,
  url: string,
): ExerciseVideoStore {
  const normalized = normalizeVideoUrl(url)
  const next = { ...store }

  if (!normalized) {
    delete next[exerciseName]
  } else {
    next[exerciseName] = normalized
  }

  writeExerciseVideos(next)
  return next
}

export function getExerciseVideoUrl(
  exerciseName: string,
  store: ExerciseVideoStore,
  programRefVideo?: string,
): string | undefined {
  return store[exerciseName] || programRefVideo
}
