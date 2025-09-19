import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

const OneSignalContext = createContext();

export const useOneSignal = () => {
  const context = useContext(OneSignalContext);
  if (!context) {
    throw new Error('useOneSignal must be used within a OneSignalProvider');
  }
  return context;
};

export const OneSignalProvider = ({ children }) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [playerId, setPlayerId] = useState(null);

  // Check if OneSignal is supported
  useEffect(() => {
    const checkSupport = () => {
      if (!('serviceWorker' in navigator)) {
        console.warn('⚠️ Service Worker not supported');
        return false;
      }
      
      if (!('Notification' in window)) {
        console.warn('⚠️ Notifications not supported');
        return false;
      }
      
      console.log('✅ OneSignal notifications are supported');
      return true;
    };

    const supported = checkSupport();
    setIsSupported(supported);
  }, []);

  // Initialize OneSignal
  const initializeOneSignal = useCallback(async () => {
    if (!isSupported || isInitialized) {
      console.log('ℹ️ OneSignal already initialized or not supported');
      return false;
    }

    if (isLoading) {
      console.log('ℹ️ OneSignal initialization already in progress');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
      
      if (!appId) {
        throw new Error('OneSignal App ID not configured. Please set VITE_ONESIGNAL_APP_ID in your .env file');
      }

      console.log('🔧 Initializing OneSignal with App ID:', appId);

      // Wait for OneSignal to be available
      const waitForOneSignal = () => {
        return new Promise((resolve, reject) => {
          if (window.OneSignal) {
            resolve();
            return;
          }

          let attempts = 0;
          const maxAttempts = 50; // 5 seconds max wait
          
          const checkOneSignal = () => {
            attempts++;
            if (window.OneSignal) {
              resolve();
            } else if (attempts >= maxAttempts) {
              reject(new Error('OneSignal SDK failed to load'));
            } else {
              setTimeout(checkOneSignal, 100);
            }
          };
          
          checkOneSignal();
        });
      };

      await waitForOneSignal();
      console.log('✅ OneSignal SDK loaded');

      // Initialize OneSignal
      window.OneSignal = window.OneSignal || [];
      
      await new Promise((resolve) => {
        window.OneSignal.push(function() {
          window.OneSignal.init({
            appId: appId,
            notifyButton: {
              enable: false, // We'll handle this manually
            },
            allowLocalhostAsSecureOrigin: true,
            autoRegister: false, // We'll handle registration manually
          });

          setTimeout(() => {
            resolve();
          }, 1000);
        });
      });

      // Get player ID
      try {
        const userId = await new Promise((resolve) => {
          window.OneSignal.push(function() {
            window.OneSignal.getUserId().then(function(userId) {
              resolve(userId);
            });
          });
        });
        
        if (userId) {
          setPlayerId(userId);
          console.log('✅ OneSignal Player ID:', userId);
        }
      } catch (error) {
        console.warn('⚠️ Could not get OneSignal Player ID:', error);
      }

      // Check subscription status
      try {
        const isEnabled = await new Promise((resolve) => {
          window.OneSignal.push(function() {
            window.OneSignal.isPushNotificationsEnabled().then(function(isEnabled) {
              resolve(isEnabled);
            });
          });
        });
        
        setIsSubscribed(isEnabled);
        console.log('📱 Push notifications enabled:', isEnabled);
      } catch (error) {
        console.warn('⚠️ Could not check subscription status:', error);
      }

      setIsInitialized(true);
      setIsLoading(false);
      console.log('✅ OneSignal initialized successfully');
      return true;

    } catch (error) {
      console.error('❌ Error initializing OneSignal:', error);
      setError(`Failed to initialize OneSignal: ${error.message}`);
      setIsLoading(false);
      return false;
    }
  }, [isSupported, isInitialized, isLoading]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported || !isInitialized) {
      setError('OneSignal not initialized');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request permission first
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Subscribe to push notifications
      window.OneSignal.push(function() {
        window.OneSignal.showNativePrompt().then(function() {
          console.log('✅ OneSignal native prompt shown');
        });
      });

      // Check subscription status
      window.OneSignal.push(function() {
        window.OneSignal.isPushNotificationsEnabled().then(function(isEnabled) {
          setIsSubscribed(isEnabled);
          if (isEnabled) {
            // Get player ID and send to backend
            window.OneSignal.getUserId().then(function(userId) {
              if (userId) {
                setPlayerId(userId);
                sendPlayerIdToBackend(userId);
              }
            });
            toast.success('OneSignal notifications enabled!');
          }
        });
      });

      setIsLoading(false);
      return true;

    } catch (error) {
      console.error('❌ Error subscribing to OneSignal:', error);
      setError(`Failed to subscribe to push notifications: ${error.message}`);
      toast.error('Failed to enable OneSignal notifications');
      setIsLoading(false);
      return false;
    }
  }, [isSupported, isInitialized]);

  // Send player ID to backend
  const sendPlayerIdToBackend = async (playerId) => {
    try {
      const response = await fetch('/onesignal/user/identify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          onesignal_player_id: playerId
        })
      });

      if (response.ok) {
        console.log('✅ Player ID sent to backend');
      } else {
        console.warn('⚠️ Failed to send player ID to backend');
      }
    } catch (error) {
      console.error('❌ Error sending player ID to backend:', error);
    }
  };

  // Auto-initialize OneSignal when supported
  useEffect(() => {
    if (isSupported && !isInitialized && !isLoading) {
      console.log('🔔 Auto-initializing OneSignal...');
      initializeOneSignal();
    }
  }, [isSupported, isInitialized, isLoading, initializeOneSignal]);

  const value = {
    isSupported,
    isInitialized,
    isSubscribed,
    isLoading,
    error,
    playerId,
    initializeOneSignal,
    subscribe
  };

  return (
    <OneSignalContext.Provider value={value}>
      {children}
    </OneSignalContext.Provider>
  );
};

export default OneSignalProvider;
