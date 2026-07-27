import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useSettings } from '@/hooks/use-settings'
import {
  ACTIVE_PLAN_EVENT,
  pushCloudActivePlan,
} from '@/lib/supabase/cloud-sync'
import { scheduleSettingsBackup } from '@/lib/supabase/settings-sync'
import {
  TRAINING_LOG_EVENT,
  scheduleTrainingLogBackup,
} from '@/lib/supabase/training-log-sync'
import { SETTINGS_EVENT } from '@/lib/sync/events'
import type { RunningPlan } from '@/lib/running'
import type { AppSettings } from '@/lib/settings'

/**
 * Keeps local settings, active plan (foundation program + running), and training
 * logs in sync with Supabase when signed in.
 * Mount inside both AuthProvider and SettingsProvider.
 */
export function SupabaseCloudBridge() {
  const { user, authBackend, isAuthenticated, isSyncing } = useAuth()
  const { replaceSettings } = useSettings()
  const readyToPush = useRef(false)
  const pendingSettings = useRef<AppSettings | null>(null)
  const planTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastUserId = useRef<string | null>(null)

  // After login sync settles, allow pushes and flush any queued settings
  useEffect(() => {
    if (!isAuthenticated || authBackend !== 'supabase' || !user) {
      readyToPush.current = false
      pendingSettings.current = null
      lastUserId.current = null
      return
    }

    if (lastUserId.current !== user.id) {
      lastUserId.current = user.id
      readyToPush.current = false
      pendingSettings.current = null
    }

    if (!isSyncing) {
      const t = setTimeout(() => {
        readyToPush.current = true
        if (pendingSettings.current) {
          scheduleSettingsBackup(user.id, pendingSettings.current)
          pendingSettings.current = null
        }
      }, 100)
      return () => clearTimeout(t)
    }
  }, [isAuthenticated, authBackend, user, isSyncing])

  // Apply remote settings from auth pull
  useEffect(() => {
    const onHydrate = (event: Event) => {
      const detail = (event as CustomEvent<{ settings?: AppSettings }>).detail
      if (detail?.settings) {
        replaceSettings(detail.settings)
      }
    }
    window.addEventListener('cinderblock:hydrate-settings', onHydrate)
    return () => window.removeEventListener('cinderblock:hydrate-settings', onHydrate)
  }, [replaceSettings])

  // Push settings whenever local settings change
  useEffect(() => {
    if (!isAuthenticated || authBackend !== 'supabase' || !user) return

    const onSettings = (event: Event) => {
      const next = (event as CustomEvent<AppSettings>).detail
      if (!next) return
      if (!readyToPush.current) {
        pendingSettings.current = next
        return
      }
      scheduleSettingsBackup(user.id, next)
    }

    window.addEventListener(SETTINGS_EVENT, onSettings)
    return () => window.removeEventListener(SETTINGS_EVENT, onSettings)
  }, [isAuthenticated, authBackend, user])

  // Push active plan changes from RunningPlanBuilder / restore
  useEffect(() => {
    if (!isAuthenticated || authBackend !== 'supabase' || !user) return

    const onPlan = (event: Event) => {
      if (!readyToPush.current) return
      const plan = (event as CustomEvent<RunningPlan>).detail
      if (!plan) return
      if (planTimer.current) clearTimeout(planTimer.current)
      planTimer.current = setTimeout(() => {
        pushCloudActivePlan(user.id, plan).catch((err) => {
          console.error('Supabase plan push failed:', err)
        })
      }, 600)
    }

    window.addEventListener(ACTIVE_PLAN_EVENT, onPlan)
    return () => {
      window.removeEventListener(ACTIVE_PLAN_EVENT, onPlan)
      if (planTimer.current) clearTimeout(planTimer.current)
    }
  }, [isAuthenticated, authBackend, user])

  // Backup gym / run / metrics training logs whenever they change
  useEffect(() => {
    if (!isAuthenticated || authBackend !== 'supabase' || !user) return

    const onTrainingLog = () => {
      if (!readyToPush.current) return
      scheduleTrainingLogBackup(user.id)
    }

    window.addEventListener(TRAINING_LOG_EVENT, onTrainingLog)
    return () => window.removeEventListener(TRAINING_LOG_EVENT, onTrainingLog)
  }, [isAuthenticated, authBackend, user])

  return null
}
