/**
 * Lightweight in-memory per-user rate limit for Amplify Lambdas.
 * Resets on cold start; intended as a beta cost guard, not a hard quota.
 */

type Bucket = {
  windowStartedAt: number
  count: number
}

const buckets = new Map<string, Bucket>()

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number }

export function checkRateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || now - existing.windowStartedAt >= opts.windowMs) {
    buckets.set(key, { windowStartedAt: now, count: 1 })
    return { allowed: true, remaining: opts.limit - 1 }
  }

  if (existing.count >= opts.limit) {
    const retryAfterSeconds = Math.ceil(
      (opts.windowMs - (now - existing.windowStartedAt)) / 1000,
    )
    return { allowed: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) }
  }

  existing.count += 1
  return { allowed: true, remaining: opts.limit - existing.count }
}
