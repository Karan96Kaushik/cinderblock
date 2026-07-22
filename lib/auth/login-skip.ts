const SKIP_KEY = 'cinderblock_login_skipped'

export function hasSkippedLogin(): boolean {
  try {
    return sessionStorage.getItem(SKIP_KEY) === '1'
  } catch {
    return false
  }
}

export function markLoginSkipped() {
  try {
    sessionStorage.setItem(SKIP_KEY, '1')
  } catch {
    // ignore
  }
}

/** Clear skip so intentional visits to /login are not treated as dismissed. */
export function clearLoginSkipped() {
  try {
    sessionStorage.removeItem(SKIP_KEY)
  } catch {
    // ignore
  }
}
