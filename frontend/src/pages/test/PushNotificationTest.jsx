import React, { useState, useEffect } from 'react';
import { usePushNotifications } from '../../components/common/PushNotificationManager';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

const PushNotificationTest = () => {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    requestPermission,
    subscribe,
    unsubscribe,
    toggleSubscription
  } = usePushNotifications();

  const [testMessage, setTestMessage] = useState('This is a test notification from VERSANT!');

  const handleTestNotification = async () => {
    try {
      const response = await api.post('/notifications/test', {
        message: testMessage
      });

      if (response.data.success) {
        toast.success('Test notification sent!');
      } else {
        toast.error(response.data.message || 'Failed to send test notification');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error(error.response?.data?.message || 'Failed to send test notification');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🔔 Push Notification Test
          </h1>

          {/* Support Status */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Browser Support</h2>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isSupported ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {isSupported ? '✅ Supported' : '❌ Not Supported'}
              </span>
              <span className="text-gray-600">
                {isSupported ? 'Your browser supports push notifications' : 'Your browser does not support push notifications'}
              </span>
            </div>
          </div>

          {/* Permission Status */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Permission Status</h2>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                permission === 'granted' ? 'bg-green-100 text-green-800' :
                permission === 'denied' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {permission === 'granted' ? '✅ Granted' :
                 permission === 'denied' ? '❌ Denied' : '⚠️ Default'}
              </span>
              <span className="text-gray-600">
                {permission === 'granted' ? 'Notifications are allowed' :
                 permission === 'denied' ? 'Notifications are blocked' : 'Permission not requested yet'}
              </span>
            </div>
          </div>

          {/* Subscription Status */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Subscription Status</h2>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isSubscribed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {isSubscribed ? '✅ Subscribed' : '❌ Not Subscribed'}
              </span>
              <span className="text-gray-600">
                {isSubscribed ? 'You are subscribed to push notifications' : 'You are not subscribed to push notifications'}
              </span>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6">
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-red-400">❌</span>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      {error}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Actions</h2>
            <div className="space-y-4">
              {!isSupported && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <p className="text-yellow-800">
                    Push notifications are not supported in this browser. Please use a modern browser like Chrome, Firefox, or Edge.
                  </p>
                </div>
              )}

              {isSupported && permission !== 'granted' && (
                <button
                  onClick={requestPermission}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  {isLoading ? 'Requesting...' : 'Request Permission'}
                </button>
              )}

              {isSupported && permission === 'granted' && (
                <button
                  onClick={toggleSubscription}
                  disabled={isLoading}
                  className={`font-medium py-2 px-4 rounded-md transition-colors ${
                    isSubscribed
                      ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white'
                      : 'bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white'
                  }`}
                >
                  {isLoading ? 'Processing...' : 
                   isSubscribed ? 'Unsubscribe' : 'Subscribe to Notifications'}
                </button>
              )}

              {isSubscribed && (
                <div className="mt-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Test Notification</h3>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter test message..."
                    />
                    <button
                      onClick={handleTestNotification}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                    >
                      Send Test
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h3 className="text-lg font-medium text-blue-800 mb-2">How to Test</h3>
            <ol className="list-decimal list-inside text-blue-700 space-y-1">
              <li>Make sure you're logged in to the application</li>
              <li>Click "Request Permission" to allow notifications</li>
              <li>Click "Subscribe to Notifications" to enable push notifications</li>
              <li>Click "Send Test" to receive a test notification</li>
              <li>Check your browser's notification area for the test notification</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PushNotificationTest;
