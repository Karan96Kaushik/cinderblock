import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { SettingsProvider } from '@/hooks/use-settings'
import { HapticInit } from '@/components/haptic-init'
import { SupabaseCloudBridge } from '@/components/supabase-cloud-bridge'
import { HomePage } from '@/components/home-page'
import { GymTracker } from '@/components/gym/gym-tracker'
import { MetricsTracker } from '@/components/metrics/metrics-tracker'
import { RunningTracker } from '@/components/running/running-tracker'
import { SettingsPage } from '@/components/settings/settings-page'
import { LoginScreen, hasSkippedLogin } from '@/components/auth/login-screen'
import { paths } from '@/lib/routes'

function OptionalLoginRedirect() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, isSupabaseEnabled, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return
    if (!isSupabaseEnabled || isAuthenticated || hasSkippedLogin()) return
    if (location.pathname === paths.login()) return
    navigate(paths.login(), { replace: true })
  }, [isAuthenticated, isSupabaseEnabled, isLoading, navigate, location.pathname])

  return null
}

function AppRoutes() {
  const navigate = useNavigate()

  return (
    <>
      <OptionalLoginRedirect />
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route
          path="/"
          element={
            <HomePage
              onStartTraining={() => navigate(paths.gym())}
              onExploreWorkout={(workoutKey) =>
                navigate(
                  workoutKey
                    ? paths.gym({ view: 'explore', exploreWorkoutKey: workoutKey })
                    : paths.gym({ view: 'explore' }),
                )
              }
              onContinueWorkout={(date) => navigate(paths.gym({ date, view: 'workout' }))}
              onStartRunning={() => navigate(paths.running())}
              onContinueRun={() => navigate(paths.running('session'))}
              onOpenMetrics={() => navigate(paths.metrics())}
              onOpenSettings={() => navigate(paths.settings())}
            />
          }
        />
        <Route path="/gym/*" element={<GymTracker onBack={() => navigate(paths.home())} />} />
        <Route path="/running/*" element={<RunningTracker onBack={() => navigate(paths.home())} />} />
        <Route path="/metrics" element={<MetricsTracker onBack={() => navigate(paths.home())} />} />
        <Route path="/settings" element={<SettingsPage onBack={() => navigate(paths.home())} />} />
        <Route path="*" element={<Navigate to={paths.home()} replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <HapticInit>
      <SettingsProvider>
        <AuthProvider>
          <SupabaseCloudBridge />
          <AppRoutes />
        </AuthProvider>
      </SettingsProvider>
    </HapticInit>
  )
}
