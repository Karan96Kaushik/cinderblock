import type { ProgramExercise } from '@/lib/program-json'

export type ExerciseCategory = 
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'legs'
  | 'core'
  | 'cardio'

export type ExercisePreset = Omit<ProgramExercise, 'sets'> & {
  category: ExerciseCategory
  defaultSets: number
}

export const EXERCISE_PRESETS: ExercisePreset[] = [
  // Chest
  {
    name: 'Chest Press Machine',
    category: 'chest',
    defaultSets: 3,
    reps: '8-12',
    muscles: ['Chest', 'Front delts', 'Triceps'],
    notes: ['Primary chest movement', 'Shoulder blades pinned back', 'Control the lowering phase'],
  },
  {
    name: 'Pectoral Fly Machine',
    category: 'chest',
    defaultSets: 3,
    reps: '10-15',
    muscles: ['Chest'],
    notes: ['Slight bend in elbows', 'Focus on chest contraction', 'Use controlled tempo'],
  },
  {
    name: 'Incline Chest Press',
    category: 'chest',
    defaultSets: 3,
    reps: '8-12',
    muscles: ['Upper chest', 'Front delts', 'Triceps'],
    notes: ['Target upper chest', 'Keep shoulder blades retracted'],
  },
  {
    name: 'Dumbbell Chest Press',
    category: 'chest',
    defaultSets: 3,
    reps: '8-12',
    muscles: ['Chest', 'Front delts', 'Triceps'],
    notes: ['Full range of motion', 'Control the weight'],
  },
  {
    name: 'Push-Ups',
    category: 'chest',
    defaultSets: 3,
    reps: 'Near failure',
    muscles: ['Chest', 'Front delts', 'Triceps', 'Core'],
    notes: ['Use full range of motion', 'Chest close to floor', 'Maintain straight body line'],
  },

  // Back
  {
    name: 'Lat Pulldown',
    category: 'back',
    defaultSets: 3,
    reps: '8-12',
    muscles: ['Lats', 'Biceps', 'Rear delts'],
    notes: ['Pull to upper chest', 'Lead with elbows', 'Avoid leaning back excessively'],
  },
  {
    name: 'Row Machine',
    category: 'back',
    defaultSets: 3,
    reps: '8-12',
    muscles: ['Lats', 'Rhomboids', 'Rear delts', 'Biceps', 'Mid traps'],
    notes: ['Pull elbows toward hips', 'Avoid shrugging shoulders', 'Control the return'],
  },
  {
    name: 'Cable Row',
    category: 'back',
    defaultSets: 3,
    reps: '8-12',
    muscles: ['Lats', 'Rhomboids', 'Biceps'],
    notes: ['Pull to lower chest', 'Keep torso stable', 'Squeeze shoulder blades'],
  },
  {
    name: 'Pull-Ups',
    category: 'back',
    defaultSets: 3,
    reps: '5-10',
    muscles: ['Lats', 'Biceps', 'Upper back'],
    notes: ['Full range of motion', 'Control the descent', 'Use assistance if needed'],
  },
  {
    name: 'T-Bar Row',
    category: 'back',
    defaultSets: 3,
    reps: '8-12',
    muscles: ['Mid back', 'Lats', 'Rhomboids'],
    notes: ['Pull to chest', 'Keep core tight'],
  },
  {
    name: 'Rear Delt Machine',
    category: 'back',
    defaultSets: 2,
    reps: '12-15',
    muscles: ['Rear delts', 'Rhomboids'],
    notes: ['Move through full range', 'Keep shoulders down'],
  },

  // Shoulders
  {
    name: 'Shoulder Press Machine',
    category: 'shoulders',
    defaultSets: 3,
    reps: '8-12',
    muscles: ['Front delts', 'Side delts', 'Triceps'],
    notes: ['Keep core tight', 'Press overhead smoothly', 'Avoid locking out aggressively'],
  },
  {
    name: 'Dumbbell Shoulder Press',
    category: 'shoulders',
    defaultSets: 3,
    reps: '8-12',
    muscles: ['Front delts', 'Side delts', 'Triceps'],
    notes: ['Press overhead', 'Control the weight'],
  },
  {
    name: 'Lateral Raises',
    category: 'shoulders',
    defaultSets: 3,
    reps: '12-15',
    muscles: ['Side delts'],
    notes: ['Slight bend in elbows', 'Raise to shoulder height', 'Control the descent'],
  },
  {
    name: 'Front Raises',
    category: 'shoulders',
    defaultSets: 3,
    reps: '12-15',
    muscles: ['Front delts'],
    notes: ['Controlled movement', 'Raise to eye level'],
  },
  {
    name: 'Upright Rows',
    category: 'shoulders',
    defaultSets: 3,
    reps: '10-12',
    muscles: ['Side delts', 'Traps'],
    notes: ['Pull elbows high', 'Keep bar close to body'],
  },

  // Arms
  {
    name: 'Bicep Curl Machine',
    category: 'arms',
    defaultSets: 3,
    reps: '10-15',
    muscles: ['Biceps'],
    notes: ['Isolation curl', 'Control both phases', 'Avoid swinging'],
  },
  {
    name: 'Dumbbell Bicep Curls',
    category: 'arms',
    defaultSets: 3,
    reps: '10-12',
    muscles: ['Biceps'],
    notes: ['Keep elbows stationary', 'Full range of motion'],
  },
  {
    name: 'Hammer Curls',
    category: 'arms',
    defaultSets: 3,
    reps: '10-12',
    muscles: ['Biceps', 'Forearms'],
    notes: ['Neutral grip', 'Control the weight'],
  },
  {
    name: 'Tricep Pushdowns',
    category: 'arms',
    defaultSets: 3,
    reps: '10-15',
    muscles: ['Triceps'],
    notes: ['Keep elbows at sides', 'Full extension', 'Squeeze at bottom'],
  },
  {
    name: 'Overhead Tricep Extension',
    category: 'arms',
    defaultSets: 3,
    reps: '10-12',
    muscles: ['Triceps'],
    notes: ['Keep elbows close', 'Full stretch at top'],
  },
  {
    name: 'Dips',
    category: 'arms',
    defaultSets: 3,
    reps: '8-12',
    muscles: ['Triceps', 'Chest', 'Front delts'],
    notes: ['Lean forward for chest', 'Stay upright for triceps', 'Control the descent'],
  },

  // Legs
  {
    name: 'Leg Press',
    category: 'legs',
    defaultSets: 4,
    reps: '8-12',
    muscles: ['Quads', 'Glutes'],
    notes: ['Lower under control', 'Push through full foot', 'Avoid bouncing'],
  },
  {
    name: 'Leg Extension',
    category: 'legs',
    defaultSets: 3,
    reps: '12-15',
    muscles: ['Quads'],
    notes: ['Avoid swinging', 'Pause at top', 'Control descent'],
  },
  {
    name: 'Seated Leg Curl',
    category: 'legs',
    defaultSets: 3,
    reps: '10-15',
    muscles: ['Hamstrings'],
    notes: ['Pause briefly at contraction', 'Control lowering phase'],
  },
  {
    name: 'Romanian Deadlift',
    category: 'legs',
    defaultSets: 3,
    reps: '8-12',
    muscles: ['Hamstrings', 'Glutes', 'Lower back', 'Core'],
    notes: ['Push hips backwards', 'Maintain neutral spine', 'Keep bar close to legs', 'Feel stretch in hamstrings'],
  },
  {
    name: 'Walking Lunges',
    category: 'legs',
    defaultSets: 3,
    reps: '10-12 per leg',
    muscles: ['Quads', 'Glutes', 'Hamstrings'],
    notes: ['Take controlled steps', 'Keep torso upright'],
  },
  {
    name: 'Bulgarian Split Squats',
    category: 'legs',
    defaultSets: 3,
    reps: '8-12 per leg',
    muscles: ['Quads', 'Glutes'],
    notes: ['Back foot elevated', 'Front knee tracking over toes'],
  },
  {
    name: 'Leg Press Calf Raises',
    category: 'legs',
    defaultSets: 3,
    reps: '12-20',
    muscles: ['Calves'],
    notes: ['Use full stretch', 'Pause at top'],
  },
  {
    name: 'Calf Raises',
    category: 'legs',
    defaultSets: 3,
    reps: '12-20',
    muscles: ['Calves'],
    notes: ['Use full stretch', 'Pause at top'],
  },
  {
    name: 'Hip Thrusts',
    category: 'legs',
    defaultSets: 3,
    reps: '10-15',
    muscles: ['Glutes', 'Hamstrings'],
    notes: ['Squeeze glutes at top', 'Keep chin tucked'],
  },

  // Core
  {
    name: 'Plank',
    category: 'core',
    defaultSets: 3,
    duration: '30-60 seconds',
    seconds: '',
    muscles: ['Abs', 'Obliques', 'Lower back'],
    notes: ['Brace core', 'Do not let hips sag'],
  },
  {
    name: 'Crunches or Leg Raises',
    category: 'core',
    defaultSets: 3,
    reps: '10-20',
    muscles: ['Abs', 'Hip flexors'],
    notes: ['Control movement', 'Avoid using momentum'],
  },
  {
    name: 'Russian Twists',
    category: 'core',
    defaultSets: 3,
    reps: '15-20 per side',
    muscles: ['Obliques', 'Abs'],
    notes: ['Rotate torso', 'Keep core engaged'],
  },
  {
    name: 'Dead Bug',
    category: 'core',
    defaultSets: 3,
    reps: '10-12 per side',
    muscles: ['Abs', 'Core'],
    notes: ['Keep lower back pressed to floor', 'Move slowly and controlled'],
  },
  {
    name: 'Cable Woodchops',
    category: 'core',
    defaultSets: 3,
    reps: '12-15 per side',
    muscles: ['Obliques', 'Core'],
    notes: ['Rotate through core', 'Keep arms relatively straight'],
  },
  {
    name: 'Hanging Knee Raises',
    category: 'core',
    defaultSets: 3,
    reps: '10-15',
    muscles: ['Lower abs', 'Hip flexors'],
    notes: ['Avoid swinging', 'Control the movement'],
  },
]

export function getExercisesByCategory(category: ExerciseCategory): ExercisePreset[] {
  return EXERCISE_PRESETS.filter((ex) => ex.category === category)
}

export function searchExercises(query: string): ExercisePreset[] {
  const lowerQuery = query.toLowerCase().trim()
  if (!lowerQuery) return EXERCISE_PRESETS

  return EXERCISE_PRESETS.filter((ex) => {
    const inName = ex.name.toLowerCase().includes(lowerQuery)
    const inMuscles = ex.muscles.some((m) => m.toLowerCase().includes(lowerQuery))
    const inCategory = ex.category.toLowerCase().includes(lowerQuery)
    return inName || inMuscles || inCategory
  })
}

export function createExerciseFromPreset(
  preset: ExercisePreset,
  sets?: number,
): ProgramExercise {
  return {
    name: preset.name,
    sets: sets ?? preset.defaultSets,
    reps: preset.reps,
    duration: preset.duration,
    seconds: preset.seconds,
    muscles: [...preset.muscles],
    notes: [...preset.notes],
    refVideo: preset.refVideo,
  }
}

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  arms: 'Arms',
  legs: 'Legs',
  core: 'Core',
  cardio: 'Cardio',
}

export const CATEGORY_ICONS: Record<ExerciseCategory, string> = {
  chest: '💪',
  back: '🔙',
  shoulders: '🏋️',
  arms: '💪',
  legs: '🦵',
  core: '⚡',
  cardio: '🏃',
}
