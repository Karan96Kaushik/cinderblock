import type { AppSettings } from '@/lib/settings'
import { readSettings } from '@/lib/settings'
import {
  readDefaultRunningPlan,
  writeDefaultRunningPlan,
  type RunningPlan,
} from '@/lib/running'
import { fetchRemoteSettings, upsertRemoteSettings } from './settings-sync'
import { fetchRemoteActivePlan, upsertRemoteActivePlan } from './plan-sync'

export const ACTIVE_PLAN_EVENT = 'cinderblock:active-plan'

export function notifyActivePlanChanged(plan: RunningPlan) {
  writeDefaultRunningPlan(plan)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ACTIVE_PLAN_EVENT, { detail: plan }))
  }
}

export type CloudConfigPull = {
  settings: AppSettings | null
  plan: RunningPlan | null
}

/** Pull configuration and active plan from Supabase; seed remote if empty. */
export async function pullAndMergeCloudConfig(userId: string): Promise<CloudConfigPull> {
  const localSettings = readSettings()
  const localPlan = readDefaultRunningPlan()

  const [remoteSettings, remotePlan] = await Promise.all([
    fetchRemoteSettings(userId),
    fetchRemoteActivePlan(userId),
  ])

  let settings: AppSettings | null = null
  let plan: RunningPlan | null = null

  if (remoteSettings) {
    settings = remoteSettings.settings
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('cinderblock:hydrate-settings', { detail: { settings } }),
      )
    }
  } else {
    await upsertRemoteSettings(userId, localSettings)
  }

  if (remotePlan) {
    plan = remotePlan.plan
    notifyActivePlanChanged(plan)
  } else {
    await upsertRemoteActivePlan(userId, localPlan)
  }

  return { settings, plan }
}

export async function pushCloudSettings(userId: string, settings: AppSettings): Promise<void> {
  await upsertRemoteSettings(userId, settings)
}

export async function pushCloudActivePlan(userId: string, plan: RunningPlan): Promise<void> {
  await upsertRemoteActivePlan(userId, plan)
}
