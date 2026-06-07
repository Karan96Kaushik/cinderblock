import type { GymStore } from '@/components/gym/gym-tracker'
import type { MetricsStore } from '@/components/metrics/metrics-tracker'
import { mergeBodyMetrics, mergeGymLogs, withGymTimestamps, withMetricsTimestamps } from './merge'
import type { AuthUser, SyncPayload } from './types'

const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''

function getApiUrl(): string | null {
  return API_URL || null
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const base = getApiUrl()
  if (!base) {
    throw new Error('VITE_API_URL is not configured')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`
  }

  const response = await fetch(`${base}${path}`, {
    ...options,
    headers,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error((data as { error?: string }).error ?? `Request failed (${response.status})`)
  }

  return data as T
}

export function isSyncAvailable(): boolean {
  return Boolean(getApiUrl())
}

export async function registerUser(email: string, password: string) {
  return request<{ token: string; user: AuthUser }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function loginUser(email: string, password: string) {
  return request<{ token: string; user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function fetchRemoteSync(token: string): Promise<SyncPayload> {
  return request<SyncPayload>('/sync', { method: 'GET', token })
}

export async function pushRemoteSync(
  token: string,
  gymLog: GymStore,
  bodyMetrics: MetricsStore,
): Promise<SyncPayload> {
  return request<SyncPayload>('/sync', {
    method: 'PUT',
    token,
    body: JSON.stringify({ gymLog, bodyMetrics }),
  })
}

export function mergeLocalAndRemote(
  localGym: GymStore,
  localMetrics: MetricsStore,
  remoteGym: Record<string, unknown>,
  remoteMetrics: unknown[],
): { gymLog: GymStore; bodyMetrics: MetricsStore } {
  const stampedLocalGym = withGymTimestamps(localGym as Record<string, Record<string, unknown>>)
  const stampedLocalMetrics = withMetricsTimestamps(
    localMetrics as Record<string, unknown>[],
  )

  const mergedGym = mergeGymLogs(stampedLocalGym, remoteGym as Record<string, { updatedAt?: number }>)
  const mergedMetrics = mergeBodyMetrics(
    stampedLocalMetrics as Array<{ updatedAt?: number; date?: string }>,
    remoteMetrics as Array<{ updatedAt?: number; date?: string }>,
  )

  return {
    gymLog: mergedGym as GymStore,
    bodyMetrics: mergedMetrics as unknown as MetricsStore,
  }
}
