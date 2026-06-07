import { useEffect } from 'react'
import { Haptic, initGlobalHaptics, type HapticType } from '@/lib/haptics'

export function useHapticsInit() {
  useEffect(() => initGlobalHaptics(), [])
}

export function useHaptics() {
  return Haptic
}

export type { HapticType }
