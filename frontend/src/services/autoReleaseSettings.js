import api from './api';

export const autoReleaseSettingsAPI = {
  // Get global release settings
  getSettings: async () => {
    try {
      const response = await api.get('/auto-release-settings/settings');
      return response.data;
    } catch (error) {
      console.error('Error fetching auto-release settings:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch settings');
    }
  },

  // Update global release settings
  updateSettings: async (settings) => {
    try {
      const response = await api.post('/auto-release-settings/settings', settings);
      return response.data;
    } catch (error) {
      console.error('Error updating auto-release settings:', error);
      throw new Error(error.response?.data?.error || 'Failed to update settings');
    }
  },

  // Get test schedule
  getTestSchedule: async (testId) => {
    try {
      const response = await api.get(`/auto-release-settings/test-schedule/${testId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching test schedule:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch test schedule');
    }
  },

  // Cancel test schedule
  cancelTestSchedule: async (testId) => {
    try {
      const response = await api.delete(`/auto-release-settings/test-schedule/${testId}`);
      return response.data;
    } catch (error) {
      console.error('Error cancelling test schedule:', error);
      throw new Error(error.response?.data?.error || 'Failed to cancel test schedule');
    }
  },

  // Get release history
  getReleaseHistory: async (testId = null, limit = 50) => {
    try {
      const params = { limit };
      if (testId) params.test_id = testId;
      
      const response = await api.get('/auto-release-settings/history', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching release history:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch release history');
    }
  },

  // Create test schedule manually
  createTestSchedule: async (testId, testType, createdAt, endDate = null) => {
    try {
      const response = await api.post('/auto-release-settings/test-schedule', {
        test_id: testId,
        test_type: testType,
        created_at: createdAt,
        end_date: endDate
      });
      return response.data;
    } catch (error) {
      console.error('Error creating test schedule:', error);
      throw new Error(error.response?.data?.error || 'Failed to create test schedule');
    }
  },

  // Get pending jobs (admin only)
  getPendingJobs: async () => {
    try {
      const response = await api.get('/auto-release-settings/pending-jobs');
      return response.data;
    } catch (error) {
      console.error('Error fetching pending jobs:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch pending jobs');
    }
  }
};
