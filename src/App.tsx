import { useState } from 'react'
import { HomePage } from '@/components/home-page'
import { GymTracker } from '@/components/gym/gym-tracker'

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'gym'>('home')

  if (currentView === 'gym') {
    return <GymTracker onBack={() => setCurrentView('home')} />
  }

  return <HomePage onStartTraining={() => setCurrentView('gym')} />
}
