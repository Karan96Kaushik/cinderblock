import type { AppSettings } from '@/lib/settings'
import { DEFAULT_SETTINGS, readSettings, writeSettings } from '@/lib/settings'
import {
  DEFAULT_RUNNING_PLAN,
  readDefaultRunningPlan,
  writeDefaultRunningPlan,
  type RunningPlan,
} from '@/lib/running'
import {
  applyActivePlanProgram,
  buildActivePlanPayload,
  createDefaultActivePlan,
  type ActivePlanPayload,
} from '@/lib/active-plan'
import type { ProgramVersionSource } from '@/lib/program-version'
import {
  bindLocalDataToAccount,
  localDataBelongsToAccount,
  readBoundAccountId,
} from './account-scope'
import { fetchRemoteSettings, upsertRemoteSettings } from './settings-sync'
import { fetchRemoteActivePlan, upsertRemoteActivePlan } from './plan-sync'
import { insertProgramVersion } from './program-version-sync'
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
  plan: ActivePlanPayload | null
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
  const defaults = createDefaultActivePlan(DEFAULT_RUNNING_PLAN)
  applyActivePlanProgram(defaults)
  notifyActivePlanChanged(defaults.running)
}

/**
 * Pull configuration, active plan (foundation program + running), and training logs.
 * New users with no remote row are seeded with the foundation-7-june plan.
 * Never seeds another account's remote from this device's local data when switching.
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
  const localRunning = readDefaultRunningPlan()
  const localPlan = canUseLocal
    ? buildActivePlanPayload(localRunning)
    : createDefaultActivePlan(DEFAULT_RUNNING_PLAN)

  const [remoteSettings, remotePlan] = await Promise.all([
    fetchRemoteSettings(userId),
    fetchRemoteActivePlan(userId),
  ])

  let settings: AppSettings | null = null
  let plan: ActivePlanPayload | null = null

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
    applyActivePlanProgram(plan)
    notifyActivePlanChanged(plan.running)
    if (remotePlan.needsUpgrade) {
      await upsertRemoteActivePlan(userId, plan)
      await recordProgramVersionSafe(userId, plan, 'seed')
    }
  } else {
    // Always seed new accounts with foundation-7-june (+ running defaults / local).
    plan = localPlan
    applyActivePlanProgram(plan)
    notifyActivePlanChanged(plan.running)
    await upsertRemoteActivePlan(userId, plan)
    await recordProgramVersionSafe(userId, plan, 'seed')
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

export async function pushCloudActivePlan(userId: string, running: RunningPlan): Promise<void> {
  if (!localDataBelongsToAccount(userId)) return
  const plan = buildActivePlanPayload(running)
  await upsertRemoteActivePlan(userId, plan)
  bindLocalDataToAccount(userId)
}

export async function pushCloudActiveProgramPlan(
  userId: string,
  plan: ActivePlanPayload,
  opts?: { source?: ProgramVersionSource; note?: string | null },
): Promise<void> {
  if (!localDataBelongsToAccount(userId)) return
  await upsertRemoteActivePlan(userId, plan)
  await recordProgramVersionSafe(userId, plan, opts?.source ?? 'cloud-sync', opts?.note)
  bindLocalDataToAccount(userId)
}

async function recordProgramVersionSafe(
  userId: string,
  plan: ActivePlanPayload,
  source: ProgramVersionSource,
  note?: string | null,
): Promise<void> {
  try {
    await insertProgramVersion(userId, {
      programId: plan.programId,
      version: plan.program.version,
      program: plan.program,
      source,
      note,
    })
  } catch (err) {
    console.error('Failed to record program version:', err)
  }
}
