export const TRAINING_LOG_EVENT = 'cinderblock:training-log'
export const SETTINGS_EVENT = 'cinderblock:settings'

/** Notify listeners that local training logs changed (debounced cloud upsert). */
export function notifyTrainingLogChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(TRAINING_LOG_EVENT))
}

/** Notify listeners that local app settings changed (debounced cloud upsert). */
export function notifySettingsChanged(settings: unknown) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: settings }))
}
