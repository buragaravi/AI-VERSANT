import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Users, 
  Shield, 
  Book, 
  ToggleLeft, 
  ToggleRight,
  RotateCcw,
  Save,
  CheckCircle,
  AlertCircle,
  Clock,
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';
import api from '../../services/api';
import AutoReleaseSettingsModal from '../../components/common/AutoReleaseSettingsModal';
import { autoReleaseSettingsAPI } from '../../services/autoReleaseSettings';

// Auto Release Settings Section Component
const AutoReleaseSettingsSection = () => {
  const [autoReleaseSettings, setAutoReleaseSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchAutoReleaseSettings();
  }, []);

  const fetchAutoReleaseSettings = async () => {
    try {
      setLoading(true);
      const response = await autoReleaseSettingsAPI.getSettings();
      setAutoReleaseSettings(response.settings);
    } catch (error) {
      console.error('Error fetching auto-release settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (settings) => {
    try {
      await autoReleaseSettingsAPI.updateSettings(settings);
      setAutoReleaseSettings(settings);
    } catch (error) {
      throw error;
    }
  };

  const getStatusText = () => {
    if (!autoReleaseSettings) return 'Loading...';
    if (!autoReleaseSettings.enabled) return 'Disabled';
    
    const { rules } = autoReleaseSettings;
    if (rules.immediate_release) return 'Immediate Release';
    if (rules.days_after_creation !== null) return `${rules.days_after_creation} days after creation`;
    if (rules.days_after_end_date !== null) return `${rules.days_after_end_date} days after end date`;
    if (rules.specific_time) return `Daily at ${rules.specific_time.hour}:${rules.specific_time.minute.toString().padStart(2, '0')} UTC`;
    
    return 'Configured';
  };

  const getStatusColor = () => {
    if (!autoReleaseSettings) return 'text-gray-500';
    if (!autoReleaseSettings.enabled) return 'text-gray-500';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Clock className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Auto Release Settings</h2>
              <p className="text-sm text-gray-600">Configure automatic release of test results</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Settings className="w-4 h-4" />
            <span>Configure</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Current Status</h3>
            <p className={`text-sm ${getStatusColor()}`}>
              {getStatusText()}
            </p>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Last Updated</h3>
            <p className="text-sm text-gray-600">
              {autoReleaseSettings?.updated_at ? 
                new Date(autoReleaseSettings.updated_at).toLocaleString() : 
                'Never'
              }
            </p>
          </div>
        </div>

        {autoReleaseSettings?.enabled && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Active Rules</h4>
                <ul className="mt-2 text-sm text-blue-800 space-y-1">
                  {autoReleaseSettings.rules.immediate_release && (
                    <li>• Release immediately when student submits</li>
                  )}
                  {autoReleaseSettings.rules.days_after_creation !== null && (
                    <li>• Release {autoReleaseSettings.rules.days_after_creation} days after test creation</li>
                  )}
                  {autoReleaseSettings.rules.days_after_end_date !== null && (
                    <li>• Release {autoReleaseSettings.rules.days_after_end_date} days after test end date</li>
                  )}
                  {autoReleaseSettings.rules.specific_time && (
                    <li>• Release daily at {autoReleaseSettings.rules.specific_time.hour}:{autoReleaseSettings.rules.specific_time.minute.toString().padStart(2, '0')} UTC</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <AutoReleaseSettingsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveSettings}
        initialSettings={autoReleaseSettings}
      />
    </>
  );
};

const GlobalSettings = () => {
  const [selectedRole, setSelectedRole] = useState('student');
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Role configurations
  const roles = [
    { key: 'student', name: 'Student', icon: Users, color: 'blue' },
    { key: 'campus_admin', name: 'Campus Admin', icon: Shield, color: 'green' },
    { key: 'course_admin', name: 'Course Admin', icon: Book, color: 'purple' }
  ];

  // Feature definitions for each role
  const roleFeatures = {
    student: [
      { 
        key: 'online_tests', 
        name: 'Online Tests', 
        description: 'Allow students to take online exams and tests',
        category: 'Testing'
      },
      { 
        key: 'practice_tests', 
        name: 'Practice Tests', 
        description: 'Allow students to practice with Versant modules',
        category: 'Testing'
      },
      { 
        key: 'crt_modules', 
        name: 'CRT Modules', 
        description: 'Allow students to access CRT aptitude and technical modules',
        category: 'Modules'
      },
      { 
        category: 'Testing'
      },
      { 
        key: 'progress_tracking', 
        name: 'Progress Tracking', 
        description: 'Show student progress analytics and statistics',
        category: 'Analytics'
      },
      { 
        key: 'test_history', 
        name: 'Test History', 
        description: 'Allow students to view past test attempts and results',
        category: 'Analytics'
      },
      { 
        key: 'profile', 
        name: 'Profile', 
        description: 'Allow students to manage their profile and settings',
        category: 'Account'
      }
    ],
    campus_admin: [
      { 
        key: 'student_management', 
        name: 'Student Management', 
        description: 'Manage students in campus',
        category: 'Management'
      },
      { 
        key: 'test_management', 
        name: 'Test Management', 
        description: 'Create and manage tests',
        category: 'Management'
      },
      { 
        category: 'Management'
      },
      { 
        key: 'batch_management', 
        name: 'Batch Management', 
        description: 'Manage course batches',
        category: 'Management'
      },
      { 
        key: 'reports', 
        name: 'Reports', 
        description: 'View campus reports and analytics',
        category: 'Analytics'
      },
      { 
        key: 'profile', 
        name: 'Profile', 
        description: 'Manage admin profile and settings',
        category: 'Account'
      }
    ],
    course_admin: [
      { 
        key: 'batch_management', 
        name: 'Batch Management', 
        description: 'Manage course batches',
        category: 'Management'
      },
      { 
        key: 'student_management', 
        name: 'Student Management', 
        description: 'Manage students in course',
        category: 'Management'
      },
      { 
        key: 'test_management', 
        name: 'Test Management', 
        description: 'Create and manage tests',
        category: 'Management'
      },
      { 
        category: 'Management'
      },
      { 
        key: 'reports', 
        name: 'Reports', 
        description: 'View course reports and analytics',
        category: 'Analytics'
      },
      { 
        key: 'profile', 
        name: 'Profile', 
        description: 'Manage admin profile and settings',
        category: 'Account'
      }
    ]
  };

  // Fetch settings for all roles
  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/global-settings/features');
      
      if (response.data.success) {
        setSettings(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch settings');
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError(err.response?.data?.message || 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  // Update feature setting
  const updateFeature = async (role, featureKey, enabled) => {
    try {
      setSaving(true);
      
      const currentFeatures = settings[role] || {};
      const updatedFeatures = {
        ...currentFeatures,
        [featureKey]: {
          ...currentFeatures[featureKey],
          enabled
        }
      };

      const response = await api.put(`/global-settings/features/${role}`, {
        features: updatedFeatures
      });

      if (response.data.success) {
        setSettings(prev => ({
          ...prev,
          [role]: updatedFeatures
        }));
        
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: `${role.replace('_', ' ')} feature settings updated successfully`,
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        throw new Error(response.data.message || 'Failed to update settings');
      }
    } catch (err) {
      console.error('Error updating feature:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.message || 'Failed to update feature setting'
      });
    } finally {
      setSaving(false);
    }
  };

  // Reset settings to default
  const resetSettings = async (role) => {
    const result = await Swal.fire({
      title: 'Reset Settings',
      text: `Are you sure you want to reset ${role.replace('_', ' ')} settings to default?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, reset!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        setSaving(true);
        
        const response = await api.post(`/global-settings/features/${role}/reset`);
        
        if (response.data.success) {
          setSettings(prev => ({
            ...prev,
            [role]: response.data.data.features
          }));
          
          Swal.fire({
            icon: 'success',
            title: 'Reset Complete!',
            text: `${role.replace('_', ' ')} settings have been reset to default`,
            timer: 2000,
            showConfirmButton: false
          });
        } else {
          throw new Error(response.data.message || 'Failed to reset settings');
        }
      } catch (err) {
        console.error('Error resetting settings:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.response?.data?.message || 'Failed to reset settings'
        });
      } finally {
        setSaving(false);
      }
    }
  };

  // Group features by category
  const groupFeaturesByCategory = (features) => {
    const grouped = {};
    features.forEach(feature => {
      if (!grouped[feature.category]) {
        grouped[feature.category] = [];
      }
      grouped[feature.category].push(feature);
    });
    return grouped;
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchSettings}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const currentRole = roles.find(r => r.key === selectedRole);
  const currentFeatures = roleFeatures[selectedRole] || [];
  const currentSettings = settings[selectedRole] || {};
  const groupedFeatures = groupFeaturesByCategory(currentFeatures);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Settings className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Global Settings</h1>
          </div>
          <p className="text-gray-600">
            Control which features are available to different user roles
          </p>
        </div>

        {/* Role Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Role</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {roles.map((role) => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.key;
              
              return (
                <motion.button
                  key={role.key}
                  onClick={() => setSelectedRole(role.key)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    isSelected
                      ? `border-${role.color}-500 bg-${role.color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-6 w-6 ${
                      isSelected ? `text-${role.color}-600` : 'text-gray-500'
                    }`} />
                    <div className="text-left">
                      <p className={`font-medium ${
                        isSelected ? `text-${role.color}-900` : 'text-gray-900'
                      }`}>
                        {role.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {role.key.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Feature Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <currentRole.icon className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                {currentRole.name} Features
              </h2>
            </div>
            <button
              onClick={() => resetSettings(selectedRole)}
              disabled={saving}
              className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset to Default</span>
            </button>
          </div>

          {/* Features by Category */}
          {Object.entries(groupedFeatures).map(([category, features]) => (
            <div key={category} className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4 border-b border-gray-200 pb-2">
                {category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {features.map((feature) => {
                  const isEnabled = currentSettings[feature.key]?.enabled ?? true;
                  const isRequired = currentSettings[feature.key]?.required ?? false;
                  
                  return (
                    <motion.div
                      key={feature.key}
                      className={`p-4 rounded-lg border transition-all duration-200 ${
                        isEnabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                      }`}
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium text-gray-900">
                              {feature.name}
                            </h4>
                            {isRequired && (
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                Required
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            {feature.description}
                          </p>
                        </div>
                        <div className="ml-4">
                          <button
                            onClick={() => updateFeature(selectedRole, feature.key, !isEnabled)}
                            disabled={isRequired || saving}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                              isEnabled ? 'bg-green-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                isEnabled ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Auto Release Settings */}
        <AutoReleaseSettingsSection />
      </div>
    </div>
  );
};

export default GlobalSettings;
