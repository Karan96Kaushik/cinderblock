import { useHapticsInit } from '@/hooks/use-haptics'

export function HapticInit({ children }: { children: React.ReactNode }) {
  useHapticsInit()
  return <>{children}</>
}
