import type { ActivePlanPayload } from '@/lib/active-plan'
import { normalizeActivePlanPayload } from '@/lib/active-plan'
import { DEFAULT_RUNNING_PLAN } from '@/lib/running'
import { supabase } from '@/utils/supabase'

function isLegacyRunningOnlyPlan(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return true
  const record = raw as Record<string, unknown>
  return !('program' in record) && !('programId' in record)
}

export async function fetchRemoteActivePlan(userId: string): Promise<{
  plan: ActivePlanPayload
  updatedAt: string
  /** True when the stored row was a pre-program RunningPlan and should be re-saved. */
  needsUpgrade: boolean
} | null> {
  const { data, error } = await supabase
    .from('user_active_plan')
    .select('plan, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  return {
    plan: normalizeActivePlanPayload(data.plan, DEFAULT_RUNNING_PLAN),
    updatedAt: data.updated_at,
    needsUpgrade: isLegacyRunningOnlyPlan(data.plan),
  }
}

export async function upsertRemoteActivePlan(
  userId: string,
  plan: ActivePlanPayload,
): Promise<void> {
  const { error } = await supabase.from('user_active_plan').upsert(
    {
      user_id: userId,
      plan,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (error) throw new Error(error.message)
}
