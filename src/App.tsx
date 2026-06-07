import { useState } from 'react'
import { CyberGrid } from '@/components/cyber-grid'
import { CyberHeader } from '@/components/cyber-header'
import { GlitchText } from '@/components/glitch-text'
import { NotificationPanel } from '@/components/notification-panel'
import { StatusBar } from '@/components/status-bar'
import { FeatureCard } from '@/components/feature-card'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { GymTracker } from '@/components/gym/gym-tracker'

const features = [
  {
    title: 'Real-Time Alerts',
    description: 'Receive instant notifications when critical system events occur. Stay connected to your digital infrastructure 24/7.',
  },
  {
    title: 'Encrypted Streams',
    description: 'All communications are secured with military-grade encryption protocols. Your data remains protected.',
  },
  {
    title: 'Neural Sync',
    description: 'Seamless integration with your existing systems. Connect once, receive updates everywhere.',
  },
  {
    title: 'Zero Latency',
    description: 'Push notifications delivered in milliseconds. Experience the speed of direct neural connection.',
  },
]

const stats = [
  { label: 'ACTIVE_NODES', value: '668,346' },
  { label: 'UPTIME', value: '99.99%' },
  { label: 'LATENCY', value: '<50ms' },
  { label: 'ENCRYPTED', value: '256-BIT' },
]

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'gym'>('home')
  const { swState, permission, isEnabled, isReady } = usePushNotifications()

  if (currentView === 'gym') {
    return <GymTracker onBack={() => setCurrentView('home')} />
  }

  const getStatusText = () => {
    if (swState === 'loading') return 'INITIALIZING'
    if (swState === 'installing') return 'SW_INSTALLING'
    if (swState === 'waiting') return 'SW_WAITING'
    if (swState === 'error') return 'SW_ERROR'
    if (swState === 'unsupported') return 'UNSUPPORTED'
    if (permission === 'denied') return 'PUSH_DENIED'
    if (isEnabled) return 'PUSH_ENABLED'
    if (isReady) return 'PUSH_READY'
    return 'PUSH_DISABLED'
  }

  const getStatusColor = () => {
    if (swState === 'loading' || swState === 'installing') return 'text-neon-yellow'
    if (swState === 'error' || swState === 'unsupported' || permission === 'denied') return 'text-neon-red'
    if (isEnabled) return 'text-neon-orange'
    return 'text-muted-foreground'
  }

  const getDotColor = () => {
    if (swState === 'loading' || swState === 'installing') return 'bg-neon-yellow animate-pulse'
    if (swState === 'error' || swState === 'unsupported' || permission === 'denied') return 'bg-neon-red'
    if (isEnabled) return 'bg-neon-orange animate-fire'
    return 'bg-muted-foreground'
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <CyberGrid />
      <CyberHeader onTrainingClick={() => setCurrentView('gym')} />

      <main className="relative z-10 pt-24 pb-16">
        <section className="max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="flex flex-col items-center text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-card/50 border border-neon-orange/40 rounded-full mb-8 font-mono text-sm neon-border-orange">
              <div className={`w-2 h-2 rounded-full ${getDotColor()}`} />
              <span className="text-muted-foreground">SYSTEM_{swState === 'active' ? 'ACTIVE' : swState.toUpperCase()}</span>
              <span className={getStatusColor()}>// {getStatusText()}</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-sans font-bold tracking-tight mb-6">
              <GlitchText className="fire-gradient-text">
                PUSH
              </GlitchText>
              <br />
              <span className="fire-gradient-text neon-text-orange">NOTIFICATIONS</span>
            </h1>

            <p className="max-w-2xl text-lg md:text-xl text-muted-foreground font-mono leading-relaxed mb-8">
              Connect to the neural network. Enable real-time push notifications
              and receive instant data streams directly to your device.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 w-full max-w-3xl mb-12">
              {stats.map((stat, index) => (
                <div key={stat.label} className="text-center">
                  <div className={`font-mono text-2xl md:text-3xl font-bold ${
                    index % 3 === 0 ? 'text-neon-orange neon-text-orange' :
                    index % 3 === 1 ? 'text-neon-yellow neon-text-yellow' :
                    'text-neon-red neon-text-red'
                  }`}>
                    {stat.value}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="max-w-2xl mx-auto mb-24">
            <NotificationPanel />
          </div>

          <section id="systems" className="py-16">
            <div className="flex items-center gap-4 mb-12">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neon-orange/50 to-transparent" />
              <h2 className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
                [SYSTEM_CAPABILITIES]
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neon-orange/50 to-transparent" />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <FeatureCard
                  key={feature.title}
                  title={feature.title}
                  description={feature.description}
                  index={index + 1}
                />
              ))}
            </div>
          </section>

          <section id="protocols" className="py-16">
            <div className="flex items-center gap-4 mb-12">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neon-red/50 to-transparent" />
              <h2 className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
                [DATA_PROTOCOLS]
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neon-red/50 to-transparent" />
            </div>

            <div className="bg-card/50 border border-border rounded-lg p-6 md:p-8 font-mono text-sm">
              <div className="space-y-4 text-muted-foreground">
                <div className="flex items-start gap-4">
                  <span className="text-neon-orange">01</span>
                  <div>
                    <span className="text-foreground">SERVICE_WORKER</span>
                    <span className="text-muted-foreground">{' // Handles background push events and notification display'}</span>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="text-neon-yellow">02</span>
                  <div>
                    <span className="text-foreground">PUSH_MANAGER</span>
                    <span className="text-muted-foreground">{' // Manages subscription and delivery endpoints'}</span>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="text-neon-orange">03</span>
                  <div>
                    <span className="text-foreground">VAPID_AUTH</span>
                    <span className="text-muted-foreground">{' // Voluntary Application Server Identification'}</span>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <span className="text-neon-red">04</span>
                  <div>
                    <span className="text-foreground">NOTIFICATION_API</span>
                    <span className="text-muted-foreground">{' // Native browser notification interface'}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="contact" className="py-16">
            <div className="flex items-center gap-4 mb-12">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neon-yellow/50 to-transparent" />
              <h2 className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
                [CONTACT_TERMINAL]
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neon-yellow/50 to-transparent" />
            </div>

            <div className="text-center">
              <p className="font-mono text-muted-foreground mb-6">
                Initialize connection protocol. Establish neural link.
              </p>
              <div className="inline-flex items-center gap-4 px-6 py-3 bg-card/50 border border-primary rounded neon-border-orange">
                <span className="text-neon-orange font-mono">{'>'}</span>
                <span className="font-mono text-foreground">contact@cybercore.network</span>
              </div>
            </div>
          </section>
        </section>
      </main>

      <StatusBar />
    </div>
  )
}
