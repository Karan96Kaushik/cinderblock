const BOUND_ACCOUNT_KEY = 'cinderblock_bound_account_id'

/** Account that currently owns local training data for cloud ops. */
export function readBoundAccountId(): string | null {
  try {
    return localStorage.getItem(BOUND_ACCOUNT_KEY)
  } catch {
    return null
  }
}

export function bindLocalDataToAccount(userId: string): void {
  try {
    localStorage.setItem(BOUND_ACCOUNT_KEY, userId)
  } catch {
    // ignore
  }
}

export function clearBoundAccountId(): void {
  try {
    localStorage.removeItem(BOUND_ACCOUNT_KEY)
  } catch {
    // ignore
  }
}

/**
 * True when local data is safe to associate with this account.
 * False if another account previously owned this device's local data.
 */
export function localDataBelongsToAccount(userId: string): boolean {
  const bound = readBoundAccountId()
  return bound === null || bound === userId
}
