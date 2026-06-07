'use client';

import { usePushNotifications, SWState } from '@/hooks/use-push-notifications';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

export function NotificationPanel() {
  const { 
    permission, 
    swState,
    isEnabled, 
    isSupported,
    isReady,
    error, 
    enableNotifications, 
    sendTestNotification,
    checkSWStatus,
  } = usePushNotifications();
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Periodically check SW status
  useEffect(() => {
    const interval = setInterval(() => {
      checkSWStatus();
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, [checkSWStatus]);

  const handleEnable = async () => {
    setIsLoading(true);
    setMessage('');
    
    // First check if SW is ready
    const currentState = await checkSWStatus();
    if (currentState !== 'active') {
      setMessage(`SW_STATE: ${currentState.toUpperCase()} - Waiting for activation...`);
      setIsLoading(false);
      return;
    }
    
    const success = await enableNotifications();
    setIsLoading(false);
    if (success) {
      setMessage('NEURAL_LINK ESTABLISHED');
    }
  };

  const handleTest = async () => {
    const sent = await sendTestNotification(
      'CINDERBLOCK ALERT',
      'System notification test successful. Neural link established.'
    );
    if (sent) {
      setMessage('TEST SIGNAL TRANSMITTED');
    } else {
      setMessage('TRANSMISSION_FAILED');
    }
  };

  const getSWStateDisplay = (state: SWState): { text: string; color: string } => {
    switch (state) {
      case 'loading':
        return { text: 'INITIALIZING', color: 'text-neon-yellow' };
      case 'installing':
        return { text: 'INSTALLING', color: 'text-neon-yellow' };
      case 'waiting':
        return { text: 'PENDING', color: 'text-neon-yellow' };
      case 'active':
        return { text: 'ACTIVE', color: 'text-neon-orange' };
      case 'redundant':
        return { text: 'REDUNDANT', color: 'text-neon-red' };
      case 'error':
        return { text: 'ERROR', color: 'text-destructive' };
      case 'unsupported':
        return { text: 'UNSUPPORTED', color: 'text-destructive' };
      default:
        return { text: 'UNKNOWN', color: 'text-muted-foreground' };
    }
  };

  const getStatusColor = () => {
    if (!isSupported) return 'text-destructive';
    if (isEnabled) return 'text-neon-yellow';
    if (permission === 'denied') return 'text-destructive';
    if (isReady) return 'text-neon-orange';
    return 'text-muted-foreground';
  };

  const getStatusText = () => {
    if (permission === 'loading' || swState === 'loading') return 'INITIALIZING...';
    if (!isSupported) return 'NOT_SUPPORTED';
    if (permission === 'denied') return 'ACCESS_DENIED';
    if (isEnabled) return 'ONLINE';
    if (isReady) return 'READY';
    return 'OFFLINE';
  };

  const swDisplay = getSWStateDisplay(swState);

  return (
    <div className="relative p-6 md:p-8 bg-card/80 backdrop-blur-sm border border-neon-orange/50 rounded-lg neon-border-orange">
      {/* Status indicator */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            isEnabled ? 'bg-neon-yellow animate-pulse' : 
            isReady ? 'bg-neon-orange animate-fire' :
            swState === 'loading' || swState === 'installing' ? 'bg-neon-yellow animate-pulse' :
            'bg-muted'
          }`} />
          <span className={`font-mono text-sm uppercase tracking-wider ${getStatusColor()}`}>
            STATUS: {getStatusText()}
          </span>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          [PUSH_PROTOCOL_v2.1]
        </span>
      </div>

      {/* Main content */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-mono uppercase tracking-widest fire-gradient-text mb-2">
            Neural Link Interface
          </h3>
          <p className="text-sm text-muted-foreground font-mono">
            Enable push notifications to receive real-time data streams directly to your neural cortex.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          {!isEnabled && isSupported && (
            <Button
              onClick={handleEnable}
              disabled={isLoading || permission === 'denied' || !isReady}
              className="font-mono uppercase tracking-wider fire-gradient text-primary-foreground border-0 hover:opacity-90 neon-border-orange disabled:opacity-50"
            >
              {isLoading ? '> CONNECTING...' : 
               !isReady ? `> SW_${swState.toUpperCase()}...` :
               '> ENABLE_NOTIFICATIONS'}
            </Button>
          )}
          
          {isEnabled && (
            <Button
              onClick={handleTest}
              variant="outline"
              className="font-mono uppercase tracking-wider border-neon-red text-neon-red hover:bg-neon-red/10"
            >
              {'>'} SEND_TEST_SIGNAL
            </Button>
          )}
        </div>

        {/* Error/Success messages */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/50 rounded">
            <p className="font-mono text-sm text-destructive">
              ERROR: {error}
            </p>
          </div>
        )}
        
        {message && (
          <div className="p-3 bg-neon-yellow/10 border border-neon-yellow/50 rounded">
            <p className="font-mono text-sm text-neon-yellow">
              {'>>'} {message}
            </p>
          </div>
        )}

        {/* Technical info */}
        <div className="pt-4 border-t border-border">
          <div className="grid grid-cols-2 gap-4 font-mono text-xs">
            <div>
              <span className="text-primary">SERVICE_WORKER:</span>
              <span className={`ml-2 ${swDisplay.color}`}>{swDisplay.text}</span>
            </div>
            <div>
              <span className="text-primary">PERMISSION:</span>
              <span className={`ml-2 uppercase ${
                permission === 'granted' ? 'text-neon-orange' :
                permission === 'denied' ? 'text-destructive' :
                'text-muted-foreground'
              }`}>{permission}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative corners - Orange top, Red bottom */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-neon-orange" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-neon-yellow" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-neon-red" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-neon-red" />
    </div>
  );
}
