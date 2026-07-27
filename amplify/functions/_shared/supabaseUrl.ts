/**
 * Project URL must be the origin only, e.g. https://xxxx.supabase.co
 * Pasting .../rest/v1 makes auth hit rest/v1/auth/v1/* ("Invalid path...").
 */
export function normalizeSupabaseUrl(raw: string | undefined): string {
  const value = (raw ?? '').trim()
  if (!value) return ''

  try {
    const parsed = new URL(value)
    const stripped = parsed.pathname
      .replace(/\/+$/, '')
      .replace(/\/(rest|auth|storage|functions|realtime)\/v1$/i, '')
      .replace(/\/+$/, '')

    parsed.pathname = stripped || '/'
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString().replace(/\/$/, '')
  } catch {
    return value
      .replace(/\/+$/, '')
      .replace(/\/(rest|auth|storage|functions|realtime)\/v1$/i, '')
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return '(invalid-url)'
  }
}
