export const STORAGE_KEYS = {
  gymLog: 'cinderblock_gym_log',
  bodyMetrics: 'cinderblock_body_metrics',
  authToken: 'cinderblock_auth_token',
  authUser: 'cinderblock_auth_user',
} as const

export type AuthUser = {
  id: string
  email: string
}

export type SyncPayload = {
  gymLog: Record<string, unknown>
  bodyMetrics: unknown[]
  updatedAt: string | null
}

export type Timestamped = { updatedAt?: number; date?: string }
