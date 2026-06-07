'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type SWState = 'loading' | 'installing' | 'waiting' | 'active' | 'redundant' | 'unsupported' | 'error';

interface NotificationState {
  permission: NotificationPermission | 'unsupported' | 'loading';
  swState: SWState;
  isSubscribed: boolean;
  error: string | null;
}

export function usePushNotifications() {
  const [state, setState] = useState<NotificationState>({
    permission: 'loading',
    swState: 'loading',
    isSubscribed: false,
    error: null,
  });
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Ping the SW periodically to keep it alive and check status
  const pingSW = useCallback(async (reg: ServiceWorkerRegistration): Promise<boolean> => {
    const sw = reg.active || reg.waiting || reg.installing;
    if (!sw) return false;

    return new Promise((resolve) => {
      const channel = new MessageChannel();
      const timeout = setTimeout(() => {
        resolve(false);
      }, 3000);

      channel.port1.onmessage = (event) => {
        clearTimeout(timeout);
        if (event.data?.type === 'PONG') {
          resolve(true);
        } else {
          resolve(false);
        }
      };

      try {
        sw.postMessage({ type: 'PING' }, [channel.port2]);
      } catch {
        clearTimeout(timeout);
        resolve(false);
      }
    });
  }, []);

  // Get SW state from registration
  const getSWState = useCallback((reg: ServiceWorkerRegistration | null): SWState => {
    if (!reg) return 'unsupported';
    if (reg.active) return 'active';
    if (reg.waiting) return 'waiting';
    if (reg.installing) return 'installing';
    return 'error';
  }, []);

  // Update state based on SW registration changes
  const updateSWState = useCallback((reg: ServiceWorkerRegistration) => {
    const handleStateChange = () => {
      const newState = getSWState(reg);
      setState(prev => ({ ...prev, swState: newState }));
    };

    // Listen for state changes on all possible workers
    if (reg.installing) {
      reg.installing.addEventListener('statechange', handleStateChange);
    }
    if (reg.waiting) {
      reg.waiting.addEventListener('statechange', handleStateChange);
    }
    if (reg.active) {
      reg.active.addEventListener('statechange', handleStateChange);
    }

    // Also listen for new workers
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', handleStateChange);
      }
    });

    handleStateChange();
  }, [getSWState]);

  useEffect(() => {
    const init = async () => {
      // Check browser support
      if (!('serviceWorker' in navigator)) {
        setState({
          permission: 'unsupported',
          swState: 'unsupported',
          isSubscribed: false,
          error: 'Service Workers are not supported in this browser',
        });
        return;
      }

      if (!('Notification' in window)) {
        setState({
          permission: 'unsupported',
          swState: 'unsupported',
          isSubscribed: false,
          error: 'Notifications are not supported in this browser',
        });
        return;
      }

      try {
        // Register the service worker
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });
        
        setRegistration(reg);
        updateSWState(reg);

        // Check for updates
        reg.update().catch(console.error);

        // Set up ping interval to keep SW alive
        pingIntervalRef.current = setInterval(async () => {
          const isAlive = await pingSW(reg);
          if (!isAlive && reg.active) {
            // Try to recover by updating
            reg.update().catch(console.error);
          }
          setState(prev => ({
            ...prev,
            swState: isAlive ? 'active' : getSWState(reg),
          }));
        }, 30000); // Ping every 30 seconds

        // Set initial permission state
        setState(prev => ({
          ...prev,
          permission: Notification.permission,
          swState: getSWState(reg),
        }));

        // Check existing subscription
        const existingSubscription = await reg.pushManager.getSubscription();
        if (existingSubscription) {
          setState(prev => ({ ...prev, isSubscribed: true }));
        }

      } catch (error) {
        console.error('[v0] SW registration failed:', error);
        setState({
          permission: Notification.permission,
          swState: 'error',
          isSubscribed: false,
          error: error instanceof Error ? error.message : 'Failed to register Service Worker',
        });
      }
    };

    init();

    // Cleanup
    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, [pingSW, getSWState, updateSWState]);

  const enableNotifications = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        setState(prev => ({
          ...prev,
          permission,
          error: permission === 'denied' ? 'Notification permission denied by user' : null,
        }));
        return false;
      }

      // Make sure SW is ready
      const reg = registration || await navigator.serviceWorker.ready;
      
      if (!reg.active) {
        setState(prev => ({
          ...prev,
          permission: 'granted',
          error: 'Service Worker is not active. Please refresh the page.',
        }));
        return false;
      }

      setState({
        permission: 'granted',
        swState: 'active',
        isSubscribed: true,
        error: null,
      });
      
      return true;
    } catch (error) {
      console.error('[v0] Enable notifications failed:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to enable notifications',
      }));
      return false;
    }
  }, [registration]);

  const sendTestNotification = useCallback(async (title: string, body: string) => {
    const permission = Notification.permission;

    if (permission !== 'granted') {
      setState((prev) => ({ ...prev, permission }));
      console.warn('[v0] Cannot send notification: permission not granted');
      return false;
    }

    const options: NotificationOptions = {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: 'test-notification',
    };

    try {
      // Service worker path — required on iOS/PWA; also more reliable when SW is active.
      if ('serviceWorker' in navigator) {
        const reg = registration ?? (await navigator.serviceWorker.ready);
        if (reg.active) {
          await reg.showNotification(title, options);
          setState((prev) => ({ ...prev, permission: 'granted', swState: 'active' }));
          return true;
        }
      }

      // Desktop fallback when no active service worker.
      new Notification(title, options);
      setState((prev) => ({ ...prev, permission: 'granted' }));
      return true;
    } catch (error) {
      console.error('[v0] Failed to show notification:', error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to show notification',
      }));
      return false;
    }
  }, [registration]);

  const checkSWStatus = useCallback(async (): Promise<SWState> => {
    if (!registration) return 'unsupported';
    
    const isAlive = await pingSW(registration);
    const currentState = isAlive ? 'active' : getSWState(registration);
    
    setState(prev => ({ ...prev, swState: currentState }));
    return currentState;
  }, [registration, pingSW, getSWState]);

  return {
    ...state,
    enableNotifications,
    sendTestNotification,
    checkSWStatus,
    isSupported: state.permission !== 'unsupported' && state.swState !== 'unsupported',
    isEnabled: state.permission === 'granted' && state.swState === 'active',
    isReady: state.swState === 'active',
  };
}
