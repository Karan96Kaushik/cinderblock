import { useEffect } from 'react'
import { Sound } from '@/lib/sounds'
import { useSettings } from '@/hooks/use-settings'

export function useSoundsInit() {
  const { settings } = useSettings()

  useEffect(() => {
    Sound.configure({
      enabled: settings.soundEnabled,
      volume: settings.soundVolume,
    })
  }, [settings.soundEnabled, settings.soundVolume])
}
