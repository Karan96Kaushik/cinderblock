import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { AuthProvider } from '@/hooks/use-auth'
import { SettingsProvider } from '@/hooks/use-settings'
import { HapticInit } from '@/components/haptic-init'
import { HomePage } from '@/components/home-page'
import { GymTracker } from '@/components/gym/gym-tracker'
import { MetricsTracker } from '@/components/metrics/metrics-tracker'
import { RunningTracker } from '@/components/running/running-tracker'
import { SettingsPage } from '@/components/settings/settings-page'
import { paths } from '@/lib/routes'

function AppRoutes() {
  const navigate = useNavigate()

  return (
    <Routes>
      <Route
        path="/"
        element={
          <HomePage
            onStartTraining={() => navigate(paths.gym())}
            onContinueWorkout={(date) => navigate(paths.gym({ date, view: 'workout' }))}
            onStartRunning={() => navigate(paths.running())}
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
  )
}

export default function App() {
  return (
    <HapticInit>
      <SettingsProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </SettingsProvider>
    </HapticInit>
  )
}
