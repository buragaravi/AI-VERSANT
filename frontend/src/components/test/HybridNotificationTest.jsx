import React, { useState } from 'react';
import { usePushNotifications } from '../common/PushNotificationManager';
import { useOneSignal } from '../common/OneSignalIntegration';

const HybridNotificationTest = () => {
  // VAPID hooks
  const {
    isSupported: vapidSupported,
    isSubscribed: vapidSubscribed,
    isLoading: vapidLoading,
    error: vapidError,
    toggleSubscription: toggleVAPID
  } = usePushNotifications();

  // OneSignal hooks
  const {
    isSupported: oneSignalSupported,
    isInitialized: oneSignalInitialized,
    isSubscribed: oneSignalSubscribed,
    isLoading: oneSignalLoading,
    error: oneSignalError,
    playerId,
    initializeOneSignal,
    subscribe: subscribeOneSignal
  } = useOneSignal();

  const [testMessage, setTestMessage] = useState('This is a test notification');
  const [sendingTest, setSendingTest] = useState(false);

  const sendVAPIDTest = async () => {
    setSendingTest(true);
    try {
      const response = await fetch('/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: testMessage,
          type: 'vapid'
        })
      });

      if (response.ok) {
        alert('VAPID test notification sent!');
      } else {
        alert('Failed to send VAPID test notification');
      }
    } catch (error) {
      console.error('Error sending VAPID test:', error);
      alert('Error sending VAPID test notification');
    } finally {
      setSendingTest(false);
    }
  };

  const sendOneSignalTest = async () => {
    setSendingTest(true);
    try {
      const response = await fetch('/onesignal/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: testMessage,
          type: 'onesignal'
        })
      });

      if (response.ok) {
        alert('OneSignal test notification sent!');
      } else {
        alert('Failed to send OneSignal test notification');
      }
    } catch (error) {
      console.error('Error sending OneSignal test:', error);
      alert('Error sending OneSignal test notification');
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Hybrid Push Notifications Test</h1>
      <p className="text-gray-600 mb-8">Test both VAPID and OneSignal push notification systems</p>
      
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* VAPID Status */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-blue-900">VAPID System</h2>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className={`w-3 h-3 rounded-full ${vapidSupported ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span>Supported: {vapidSupported ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`w-3 h-3 rounded-full ${vapidSubscribed ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span>Subscribed: {vapidSubscribed ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`w-3 h-3 rounded-full ${vapidLoading ? 'bg-yellow-500' : 'bg-gray-500'}`}></span>
              <span>Loading: {vapidLoading ? 'Yes' : 'No'}</span>
            </div>
          </div>
          {vapidError && (
            <div className="mt-2 p-2 bg-red-100 rounded text-sm text-red-600">
              Error: {vapidError}
            </div>
          )}
        </div>

        {/* OneSignal Status */}
        <div className="p-4 bg-green-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-green-900">OneSignal System</h2>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className={`w-3 h-3 rounded-full ${oneSignalSupported ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span>Supported: {oneSignalSupported ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`w-3 h-3 rounded-full ${oneSignalInitialized ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              <span>Initialized: {oneSignalInitialized ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`w-3 h-3 rounded-full ${oneSignalSubscribed ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span>Subscribed: {oneSignalSubscribed ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`w-3 h-3 rounded-full ${oneSignalLoading ? 'bg-yellow-500' : 'bg-gray-500'}`}></span>
              <span>Loading: {oneSignalLoading ? 'Yes' : 'No'}</span>
            </div>
          </div>
          {playerId && (
            <div className="mt-2 p-2 bg-green-100 rounded text-sm">
              <span className="font-medium">Player ID: </span>
              <span className="font-mono text-green-600">{playerId}</span>
            </div>
          )}
          {oneSignalError && (
            <div className="mt-2 p-2 bg-red-100 rounded text-sm text-red-600">
              Error: {oneSignalError}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* VAPID Actions */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-blue-900">VAPID Actions</h3>
          <div className="space-y-3">
            <button
              onClick={toggleVAPID}
              disabled={!vapidSupported || vapidLoading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {vapidSubscribed ? 'Unsubscribe from VAPID' : 'Subscribe to VAPID'}
            </button>
            <button
              onClick={sendVAPIDTest}
              disabled={!vapidSubscribed || sendingTest}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingTest ? 'Sending...' : 'Send VAPID Test'}
            </button>
          </div>
        </div>

        {/* OneSignal Actions */}
        <div className="p-4 bg-green-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-green-900">OneSignal Actions</h3>
          <div className="space-y-3">
            {!oneSignalInitialized && (
              <button
                onClick={initializeOneSignal}
                disabled={!oneSignalSupported || oneSignalLoading}
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Initialize OneSignal
              </button>
            )}
            {oneSignalInitialized && !oneSignalSubscribed && (
              <button
                onClick={subscribeOneSignal}
                disabled={oneSignalLoading}
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Subscribe to OneSignal
              </button>
            )}
            <button
              onClick={sendOneSignalTest}
              disabled={!oneSignalSubscribed || sendingTest}
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendingTest ? 'Sending...' : 'Send OneSignal Test'}
            </button>
          </div>
        </div>
      </div>

      {/* Test Message */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Test Message</h3>
        <div className="flex space-x-4">
          <input
            type="text"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter test message"
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="p-4 bg-yellow-50 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">Instructions</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-800">
          <li>Make sure you have both VAPID and OneSignal App ID configured in your environment</li>
          <li>Subscribe to both systems using the buttons above</li>
          <li>Send test notifications to verify both systems work</li>
          <li>Check browser console for detailed logs</li>
          <li>Check browser notification settings if notifications don't appear</li>
        </ol>
      </div>
    </div>
  );
};

export default HybridNotificationTest;
