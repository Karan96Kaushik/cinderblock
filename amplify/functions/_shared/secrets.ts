/** Amplify Gen 2 placeholder until SSM secret resolution succeeds. */
export const AMPLIFY_SSM_PLACEHOLDER = '<value will be resolved during runtime>'

/**
 * Returns a trimmed env value, or null if missing / still the Amplify SSM placeholder.
 */
export function readResolvedSecret(name: string): string | null {
  const value = process.env[name]?.trim()
  if (!value || value === AMPLIFY_SSM_PLACEHOLDER) return null
  return value
}
