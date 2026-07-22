import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useSettings } from '@/hooks/use-settings'
import {
  ACTIVE_PLAN_EVENT,
  pushCloudActivePlan,
  pushCloudSettings,
} from '@/lib/supabase/cloud-sync'
import type { RunningPlan } from '@/lib/running'
import type { AppSettings } from '@/lib/settings'

/**
 * Keeps local settings + active running plan in sync with Supabase when signed in.
 * Mount inside both AuthProvider and SettingsProvider.
 */
export function SupabaseCloudBridge() {
  const { user, authBackend, isAuthenticated, isSyncing } = useAuth()
  const { settings, replaceSettings } = useSettings()
  const skipSettingsPush = useRef(false)
  const readyToPush = useRef(false)
  const settingsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const planTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastUserId = useRef<string | null>(null)

  // After login sync settles, allow pushes
  useEffect(() => {
    if (!isAuthenticated || authBackend !== 'supabase' || !user) {
      readyToPush.current = false
      lastUserId.current = null
      return
    }

    if (lastUserId.current !== user.id) {
      lastUserId.current = user.id
      readyToPush.current = false
    }

    if (!isSyncing) {
      // Small delay so hydrate event from pull can apply first
      const t = setTimeout(() => {
        readyToPush.current = true
      }, 100)
      return () => clearTimeout(t)
    }
  }, [isAuthenticated, authBackend, user, isSyncing])

  // Apply remote settings from auth pull
  useEffect(() => {
    const onHydrate = (event: Event) => {
      const detail = (event as CustomEvent<{ settings?: AppSettings }>).detail
      if (detail?.settings) {
        skipSettingsPush.current = true
        replaceSettings(detail.settings)
      }
    }
    window.addEventListener('cinderblock:hydrate-settings', onHydrate)
    return () => window.removeEventListener('cinderblock:hydrate-settings', onHydrate)
  }, [replaceSettings])

  // Push settings changes (debounced)
  useEffect(() => {
    if (skipSettingsPush.current) {
      skipSettingsPush.current = false
      return
    }
    if (!readyToPush.current) return
    if (!isAuthenticated || authBackend !== 'supabase' || !user) return

    if (settingsTimer.current) clearTimeout(settingsTimer.current)
    settingsTimer.current = setTimeout(() => {
      pushCloudSettings(user.id, settings).catch((err) => {
        console.error('Supabase settings push failed:', err)
      })
    }, 600)

    return () => {
      if (settingsTimer.current) clearTimeout(settingsTimer.current)
    }
  }, [settings, isAuthenticated, authBackend, user])

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

  return null
}
