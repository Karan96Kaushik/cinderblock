import outputs from '@/amplify_outputs.json'
import { supabase } from '@/utils/supabase'

export type AmplifyTestResult = {
  ok: boolean
  message?: string
  userId?: string
  email?: string | null
  hasSettingsRow?: boolean
  settingsUpdatedAt?: string | null
  error?: string
}

function getTestFunctionUrl(): string {
  const url = (outputs as { custom?: { testFunctionUrl?: string } }).custom?.testFunctionUrl
  return typeof url === 'string' ? url.trim() : ''
}

export function isAmplifyTestConfigured(): boolean {
  return Boolean(getTestFunctionUrl())
}

/**
 * Invokes the Amplify `amplify-test` Function URL with the current Supabase session.
 */
export async function invokeAmplifyTest(): Promise<AmplifyTestResult> {
  const url = getTestFunctionUrl()
  if (!url) {
    throw new Error(
      'Amplify test function URL is not set. Run `npx ampx sandbox` (or deploy) so amplify_outputs.json includes custom.testFunctionUrl.',
    )
  }

  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(error.message)

  const accessToken = data.session?.access_token
  if (!accessToken) {
    throw new Error('Sign in with Supabase before calling the Amplify test function.')
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  })

  let payload: AmplifyTestResult
  try {
    payload = (await response.json()) as AmplifyTestResult
  } catch {
    throw new Error(`Amplify test returned non-JSON (HTTP ${response.status})`)
  }

  if (!response.ok && !payload.error) {
    payload = {
      ...payload,
      ok: false,
      error: payload.message ?? `Request failed (HTTP ${response.status})`,
    }
  }

  return payload
}
