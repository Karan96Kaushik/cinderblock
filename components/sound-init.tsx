import { useSoundsInit } from '@/hooks/use-sounds'

export function SoundInit({ children }: { children: React.ReactNode }) {
  useSoundsInit()
  return <>{children}</>
}
