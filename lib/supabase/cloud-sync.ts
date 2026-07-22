import type { AppSettings } from '@/lib/settings'
import { DEFAULT_SETTINGS, readSettings, writeSettings } from '@/lib/settings'
import {
  DEFAULT_RUNNING_PLAN,
  readDefaultRunningPlan,
  writeDefaultRunningPlan,
  type RunningPlan,
} from '@/lib/running'
import {
  bindLocalDataToAccount,
  localDataBelongsToAccount,
  readBoundAccountId,
} from './account-scope'
import { fetchRemoteSettings, upsertRemoteSettings } from './settings-sync'
import { fetchRemoteActivePlan, upsertRemoteActivePlan } from './plan-sync'
import { writeBodyMetrics, writeGymLog } from '@/lib/sync/storage'
import { notifyTrainingLogChanged } from '@/lib/sync/events'
import { clearActiveRunSession, writeRunLog } from '@/lib/running'
import { pullAndMergeTrainingLog } from './training-log-sync'
import { migrateLegacyDeviceIdIfNeeded } from '@/lib/device-id'

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

/** Drop local training logs so they cannot leak into another account's backups. */
function clearForeignTrainingLogs() {
  writeGymLog({}, { silent: true })
  writeBodyMetrics([], { silent: true })
  writeRunLog([], { silent: true })
  clearActiveRunSession()
  notifyTrainingLogChanged()
}

/** Reset appearance + default plan so a prior account's config cannot leak. */
function clearForeignSettingsAndPlan() {
  writeSettings(DEFAULT_SETTINGS, { silent: true })
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('cinderblock:hydrate-settings', {
        detail: { settings: DEFAULT_SETTINGS },
      }),
    )
  }
  notifyActivePlanChanged(DEFAULT_RUNNING_PLAN)
}

/**
 * Pull configuration, active plan, and training logs from Supabase.
 * Never seeds another account's remote from this device's local data.
 */
export async function pullAndMergeCloudConfig(userId: string): Promise<CloudConfigPull> {
  const previousAccount = readBoundAccountId()
  const canUseLocal = localDataBelongsToAccount(userId)
  const switchingAccount = Boolean(previousAccount && previousAccount !== userId)

  if (switchingAccount) {
    clearForeignTrainingLogs()
    clearForeignSettingsAndPlan()
  }

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
  } else if (canUseLocal) {
    await upsertRemoteSettings(userId, localSettings)
  }

  if (remotePlan) {
    plan = remotePlan.plan
    notifyActivePlanChanged(plan)
  } else if (canUseLocal) {
    await upsertRemoteActivePlan(userId, localPlan)
  }

  // Bind before training-log merge so upserts are allowed for this account
  bindLocalDataToAccount(userId)

  try {
    await migrateLegacyDeviceIdIfNeeded(userId)
  } catch (err) {
    console.error('Device id migration failed:', err)
  }

  try {
    await pullAndMergeTrainingLog(userId)
  } catch (err) {
    console.error('Training log sync failed:', err)
  }

  return { settings, plan }
}

export async function pushCloudSettings(userId: string, settings: AppSettings): Promise<void> {
  if (!localDataBelongsToAccount(userId)) return
  await upsertRemoteSettings(userId, settings)
  bindLocalDataToAccount(userId)
}

export async function pushCloudActivePlan(userId: string, plan: RunningPlan): Promise<void> {
  if (!localDataBelongsToAccount(userId)) return
  await upsertRemoteActivePlan(userId, plan)
  bindLocalDataToAccount(userId)
}
