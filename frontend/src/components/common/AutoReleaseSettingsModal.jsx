import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Calendar, Settings, Save, AlertCircle, CheckCircle } from 'lucide-react';

const AutoReleaseSettingsModal = ({ isOpen, onClose, onSave, initialSettings = null }) => {
  const [settings, setSettings] = useState({
    enabled: false,
    rules: {
      immediate_release: false,
      days_after_creation: null,
      days_after_end_date: null,
      specific_time: null,
      timezone: 'UTC'
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRuleChange = (rule, value) => {
    setSettings(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        [rule]: value
      }
    }));
  };

  const handleTimeChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        specific_time: {
          ...prev.rules.specific_time,
          [field]: parseInt(value)
        }
      }
    }));
  };

  const validateSettings = () => {
    if (!settings.enabled) return true;

    const { rules } = settings;
    
    // At least one rule must be enabled
    const hasRule = rules.immediate_release || 
                   rules.days_after_creation !== null || 
                   rules.days_after_end_date !== null || 
                   rules.specific_time !== null;
    
    if (!hasRule) {
      setError('At least one release rule must be configured');
      return false;
    }

    // Validate numeric values
    if (rules.days_after_creation !== null && rules.days_after_creation < 0) {
      setError('Days after creation must be non-negative');
      return false;
    }

    if (rules.days_after_end_date !== null && rules.days_after_end_date < 0) {
      setError('Days after end date must be non-negative');
      return false;
    }

    // Validate specific time
    if (rules.specific_time) {
      const { hour, minute } = rules.specific_time;
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        setError('Invalid time format');
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    if (!validateSettings()) {
      return;
    }

    setLoading(true);
    try {
      await onSave(settings);
      setSuccess('Settings saved successfully!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const resetToDefaults = () => {
    setSettings({
      enabled: false,
      rules: {
        immediate_release: false,
        days_after_creation: null,
        days_after_end_date: null,
        specific_time: null,
        timezone: 'UTC'
      }
    });
    setError('');
    setSuccess('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Settings className="w-6 h-6 text-white" />
              <h2 className="text-xl font-bold text-white">Auto Release Settings</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
            {/* Enable/Disable Toggle */}
            <div className="mb-6">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Enable Auto Release</h3>
                  <p className="text-sm text-gray-600">Automatically release test results based on configured rules</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => handleInputChange('enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {settings.enabled && (
              <div className="space-y-6">
                {/* Release Rules */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-blue-600" />
                    Release Rules
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Immediate Release */}
                    <div className="p-4 border border-gray-200 rounded-xl">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.rules.immediate_release}
                          onChange={(e) => handleRuleChange('immediate_release', e.target.checked)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div>
                          <span className="font-medium text-gray-900">Immediate Release</span>
                          <p className="text-sm text-gray-600">Release results immediately when student submits</p>
                        </div>
                      </label>
                    </div>

                    {/* Days After Creation */}
                    <div className="p-4 border border-gray-200 rounded-xl">
                      <label className="flex items-center space-x-3 mb-3">
                        <input
                          type="checkbox"
                          checked={settings.rules.days_after_creation !== null}
                          onChange={(e) => handleRuleChange('days_after_creation', e.target.checked ? 1 : null)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div>
                          <span className="font-medium text-gray-900">Days After Creation</span>
                          <p className="text-sm text-gray-600">Release results X days after test creation</p>
                        </div>
                      </label>
                      {settings.rules.days_after_creation !== null && (
                        <div className="ml-7">
                          <input
                            type="number"
                            min="0"
                            value={settings.rules.days_after_creation || ''}
                            onChange={(e) => handleRuleChange('days_after_creation', parseInt(e.target.value) || 0)}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Days"
                          />
                          <span className="ml-2 text-sm text-gray-600">days after creation</span>
                        </div>
                      )}
                    </div>

                    {/* Days After End Date */}
                    <div className="p-4 border border-gray-200 rounded-xl">
                      <label className="flex items-center space-x-3 mb-3">
                        <input
                          type="checkbox"
                          checked={settings.rules.days_after_end_date !== null}
                          onChange={(e) => handleRuleChange('days_after_end_date', e.target.checked ? 1 : null)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div>
                          <span className="font-medium text-gray-900">Days After End Date</span>
                          <p className="text-sm text-gray-600">Release results X days after test end date</p>
                        </div>
                      </label>
                      {settings.rules.days_after_end_date !== null && (
                        <div className="ml-7">
                          <input
                            type="number"
                            min="0"
                            value={settings.rules.days_after_end_date || ''}
                            onChange={(e) => handleRuleChange('days_after_end_date', parseInt(e.target.value) || 0)}
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Days"
                          />
                          <span className="ml-2 text-sm text-gray-600">days after end date</span>
                        </div>
                      )}
                    </div>

                    {/* Specific Time */}
                    <div className="p-4 border border-gray-200 rounded-xl">
                      <label className="flex items-center space-x-3 mb-3">
                        <input
                          type="checkbox"
                          checked={settings.rules.specific_time !== null}
                          onChange={(e) => handleRuleChange('specific_time', e.target.checked ? { hour: 9, minute: 0 } : null)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div>
                          <span className="font-medium text-gray-900">Specific Time</span>
                          <p className="text-sm text-gray-600">Release results at a specific time of day</p>
                        </div>
                      </label>
                      {settings.rules.specific_time && (
                        <div className="ml-7 flex items-center space-x-2">
                          <input
                            type="number"
                            min="0"
                            max="23"
                            value={settings.rules.specific_time.hour || ''}
                            onChange={(e) => handleTimeChange('hour', e.target.value)}
                            className="w-16 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="HH"
                          />
                          <span className="text-gray-500">:</span>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            value={settings.rules.specific_time.minute || ''}
                            onChange={(e) => handleTimeChange('minute', e.target.value)}
                            className="w-16 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="MM"
                          />
                          <span className="text-sm text-gray-600">UTC</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Timezone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone
                  </label>
                  <select
                    value={settings.rules.timezone}
                    onChange={(e) => handleRuleChange('timezone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="UTC">UTC</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Error/Success Messages */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2"
              >
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-700 text-sm">{error}</span>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2"
              >
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-green-700 text-sm">{success}</span>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 flex items-center justify-between">
            <button
              onClick={resetToDefaults}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Reset to Defaults
            </button>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Settings</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AutoReleaseSettingsModal;
