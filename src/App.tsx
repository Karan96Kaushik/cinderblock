import { useState } from 'react'
import { AuthProvider } from '@/hooks/use-auth'
import { SettingsProvider } from '@/hooks/use-settings'
import { HapticInit } from '@/components/haptic-init'
import { HomePage } from '@/components/home-page'
import { GymTracker } from '@/components/gym/gym-tracker'
import { MetricsTracker } from '@/components/metrics/metrics-tracker'
import { RunningTracker } from '@/components/running/running-tracker'
import { SettingsPage } from '@/components/settings/settings-page'

type AppView = 'home' | 'gym' | 'running' | 'metrics' | 'settings'

type GymEntry = {
  date: string
  view: 'flow'
}

function AppRoutes() {
  const [currentView, setCurrentView] = useState<AppView>('home')
  const [gymEntry, setGymEntry] = useState<GymEntry>()

  const openGym = (entry?: GymEntry) => {
    setGymEntry(entry)
    setCurrentView('gym')
  }

  if (currentView === 'gym') {
    return (
      <GymTracker
        onBack={() => {
          setGymEntry(undefined)
          setCurrentView('home')
        }}
        initialDate={gymEntry?.date}
        initialView={gymEntry?.view}
      />
    )
  }

  if (currentView === 'running') {
    return <RunningTracker onBack={() => setCurrentView('home')} />
  }

  if (currentView === 'metrics') {
    return <MetricsTracker onBack={() => setCurrentView('home')} />
  }

  if (currentView === 'settings') {
    return <SettingsPage onBack={() => setCurrentView('home')} />
  }

  return (
    <HomePage
      onStartTraining={() => openGym()}
      onContinueWorkout={(date) => openGym({ date, view: 'flow' })}
      onStartRunning={() => setCurrentView('running')}
      onOpenMetrics={() => setCurrentView('metrics')}
      onOpenSettings={() => setCurrentView('settings')}
    />
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
