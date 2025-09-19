import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../services/api'; // Use the configured API instance

const PushNotificationContext = createContext();

export const usePushNotifications = () => {
  const context = useContext(PushNotificationContext);
  if (!context) {
    throw new Error('usePushNotifications must be used within a PushNotificationProvider');
  }
  return context;
};

export const PushNotificationProvider = ({ children }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Convert VAPID key to Uint8Array
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  };

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission === 'granted') {
        console.log('✅ Notification permission granted');
        toast.success('Notification permission granted!');
        return true;
      } else {
        console.warn('⚠️ Notification permission denied');
        toast.error('Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting permission:', error);
      setError('Failed to request notification permission');
      toast.error('Failed to request notification permission');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  // Check if push notifications are supported and auto-request permission
  useEffect(() => {
    const checkSupport = () => {
      if (!('serviceWorker' in navigator)) {
        console.warn('⚠️ Service Worker not supported');
        return false;
      }
      
      if (!('PushManager' in window)) {
        console.warn('⚠️ Push Manager not supported');
        return false;
      }
      
      if (!('Notification' in window)) {
        console.warn('⚠️ Notifications not supported');
        return false;
      }
      
      console.log('✅ Push notifications are supported');
      return true;
    };

    const isSupported = checkSupport();
    setIsSupported(isSupported);

    // Auto-request permission if supported and not already granted/denied
    if (isSupported && Notification.permission === 'default') {
      console.log('🔔 Auto-requesting push notification permission...');
      requestPermission();
    }
  }, [requestPermission]);

  // Check current permission status
  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission);
    }
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported || permission !== 'granted') {
      setError('Push notifications not supported or permission not granted');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if service worker is already registered
      let registration = await navigator.serviceWorker.getRegistration('/');
      
      if (!registration) {
        // Register service worker with proper scope and error handling
        registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        console.log('✅ Service Worker registered:', registration);
      } else {
        console.log('✅ Service Worker already registered:', registration);
      }

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('✅ Service Worker ready');

      // Get existing subscription
      let pushSubscription = await registration.pushManager.getSubscription();
      
      if (!pushSubscription) {
        // Create new subscription
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BGSDSV-nFQgxb060QUDjogGfL6sUEQCnzNO4x4ozffRY3kgmbGUv4e8nB1o72qP9veRl3sfmNclC5l--L--_WK4';
        if (!vapidPublicKey) {
          throw new Error('VAPID public key not configured');
        }

        pushSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });
        
        console.log('✅ Push subscription created:', pushSubscription);
      } else {
        console.log('✅ Using existing push subscription');
      }

      setSubscription(pushSubscription);
      
      // Send subscription to backend
      await sendSubscriptionToBackend(pushSubscription);
      
      toast.success('Push notifications enabled!');
      return pushSubscription;
    } catch (error) {
      console.error('❌ Error subscribing to push notifications:', error);
      
      // Check if it's a MIME type error
      if (error.message.includes('unsupported MIME type') || error.message.includes('text/html')) {
        setError('Service Worker configuration issue. Please try refreshing the page or contact support.');
        console.error('🔧 MIME type error detected. Check Vercel configuration.');
        toast.error('Service Worker configuration issue. Please refresh the page.');
      } else {
        setError('Failed to subscribe to push notifications');
        toast.error('Failed to enable push notifications');
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, permission]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!subscription) {
      console.log('ℹ️ No subscription to unsubscribe from');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await subscription.unsubscribe();
      setSubscription(null);
      
      // Remove subscription from backend
      await removeSubscriptionFromBackend();
      
      console.log('✅ Unsubscribed from push notifications');
      toast.success('Push notifications disabled');
    } catch (error) {
      console.error('❌ Error unsubscribing:', error);
      setError('Failed to unsubscribe from push notifications');
      toast.error('Failed to disable push notifications');
    } finally {
      setIsLoading(false);
    }
  }, [subscription]);

  // Send subscription to backend
  const sendSubscriptionToBackend = async (pushSubscription) => {
    try {
      const response = await api.post('/notifications/subscribe', {
        subscription: pushSubscription,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      });

      console.log('✅ Subscription sent to backend:', response.data);
    } catch (error) {
      console.error('❌ Error sending subscription to backend:', error);
      throw error;
    }
  };

  // Remove subscription from backend
  const removeSubscriptionFromBackend = async () => {
    try {
      const response = await api.post('/notifications/unsubscribe', {
        endpoint: subscription.endpoint
      });

      console.log('✅ Subscription removed from backend:', response.data);
    } catch (error) {
      console.error('❌ Error removing subscription from backend:', error);
      throw error;
    }
  };

  // Check if user is subscribed
  const isSubscribed = subscription !== null;

  // Toggle subscription
  const toggleSubscription = useCallback(async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      if (permission !== 'granted') {
        const granted = await requestPermission();
        if (granted) {
          await subscribe();
        }
      } else {
        await subscribe();
      }
    }
  }, [isSubscribed, permission, requestPermission, subscribe, unsubscribe]);

  const value = {
    isSupported,
    permission,
    subscription,
    isLoading,
    error,
    isSubscribed,
    requestPermission,
    subscribe,
    unsubscribe,
    toggleSubscription
  };

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  );
};

export default PushNotificationProvider;
