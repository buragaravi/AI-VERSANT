// Service Worker for Pure Web Push Notifications
// This handles incoming push notifications and displays them

self.addEventListener('install', function(event) {
  console.log('Service Worker: Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker: Activating...');
  event.waitUntil(self.clients.claim());
});

// Handle push events
self.addEventListener('push', function(event) {
  console.log('Service Worker: Push received');
  
  let data = {};
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'Push Notification',
        body: event.data.text() || 'You have a new notification'
      };
    }
  } else {
    data = {
      title: 'Push Notification',
      body: 'You have a new notification'
    };
  }

  const title = data.title || 'Stay Sync Notification';
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/icon.svg',
    badge: data.badge || '/icon.svg',
    image: data.image || null,
    data: data.data || null,
    tag: data.tag || `notification-${Date.now()}`, // Use unique tag to prevent conflicts
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
    vibrate: data.vibrate || [200, 100, 200],
    timestamp: Date.now(),
    renotify: true, // Allow re-notification even with same tag
    silent: false
  };

  console.log('Service Worker: Showing notification:', title, options);

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        console.log('Service Worker: Notification displayed successfully');
      })
      .catch(error => {
        console.error('Service Worker: Error showing notification:', error);
      })
  );
});

// Handle notification click events
self.addEventListener('notificationclick', function(event) {
  console.log('Service Worker: Notification clicked');
  
  event.notification.close();

  const data = event.notification.data || {};
  const url = data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      // Check if there's already a window/tab open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no existing window, open a new one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Handle notification close events
self.addEventListener('notificationclose', function(event) {
  console.log('Service Worker: Notification closed');
  
  // You can track notification dismissal here if needed
  const data = event.notification.data || {};
  if (data.trackDismissal) {
    // Send analytics or tracking data
    console.log('Notification dismissed:', data);
  }
});

// Handle background sync (if needed)
self.addEventListener('sync', function(event) {
  console.log('Service Worker: Background sync');
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Implement background sync logic here
  return Promise.resolve();
}

// Handle push subscription changes
self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('Service Worker: Push subscription changed');
  
  event.waitUntil(
    // Re-subscribe to push notifications
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
    }).then(function(subscription) {
      // Send new subscription to server
      return fetch('/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscription),
        headers: {
          'Content-Type': 'application/json'
        }
      });
    })
  );
});

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
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
}
