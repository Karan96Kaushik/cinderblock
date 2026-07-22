import type { RunningPlan } from '@/lib/running'
import { supabase } from '@/utils/supabase'

export async function fetchRemoteActivePlan(userId: string): Promise<{
  plan: RunningPlan
  updatedAt: string
} | null> {
  const { data, error } = await supabase
    .from('user_active_plan')
    .select('plan, updated_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  return {
    plan: data.plan as RunningPlan,
    updatedAt: data.updated_at,
  }
}

export async function upsertRemoteActivePlan(userId: string, plan: RunningPlan): Promise<void> {
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
