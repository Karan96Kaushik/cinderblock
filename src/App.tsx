import { useState } from 'react'
import { AuthProvider } from '@/hooks/use-auth'
import { HapticInit } from '@/components/haptic-init'
import { HomePage } from '@/components/home-page'
import { GymTracker } from '@/components/gym/gym-tracker'
import { MetricsTracker } from '@/components/metrics/metrics-tracker'

type AppView = 'home' | 'gym' | 'metrics'

function AppRoutes() {
  const [currentView, setCurrentView] = useState<AppView>('home')

  if (currentView === 'gym') {
    return <GymTracker onBack={() => setCurrentView('home')} />
  }

  if (currentView === 'metrics') {
    return <MetricsTracker onBack={() => setCurrentView('home')} />
  }

  return (
    <HomePage
      onStartTraining={() => setCurrentView('gym')}
      onOpenMetrics={() => setCurrentView('metrics')}
    />
  )
}

export default function App() {
  return (
    <HapticInit>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HapticInit>
  )
}
