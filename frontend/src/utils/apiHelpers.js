/**
 * API Response Helper Utilities
 * Provides robust error handling and data validation for API responses
 */

/**
 * Safely extracts data from API response with fallbacks
 * @param {Object} response - API response object
 * @param {string} dataPath - Dot notation path to data (e.g., 'data.submissions')
 * @param {*} fallback - Fallback value if data is not found
 * @returns {*} Extracted data or fallback value
 */
export const safeGet = (response, dataPath, fallback = null) => {
  try {
    if (!response || typeof response !== 'object') {
      return fallback;
    }

    const keys = dataPath.split('.');
    let current = response;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return fallback;
      }
    }

    return current !== undefined ? current : fallback;
  } catch (error) {
    console.warn('Error in safeGet:', error);
    return fallback;
  }
};

/**
 * Validates and sanitizes form submission data
 * @param {Object} submission - Raw submission data
 * @returns {Object} Validated and sanitized submission
 */
export const validateFormSubmission = (submission) => {
  if (!submission || typeof submission !== 'object') {
    return {
      _id: `temp-${Math.random()}`,
      form_title: 'Unknown Form',
      form_description: '',
      submitted_at: new Date().toISOString(),
      form_responses: []
    };
  }

  return {
    _id: submission._id || `temp-${Math.random()}`,
    form_title: submission.form_title || 'Untitled Form',
    form_description: submission.form_description || '',
    submitted_at: submission.submitted_at || new Date().toISOString(),
    form_responses: Array.isArray(submission.form_responses) 
      ? submission.form_responses.filter(response => 
          response && 
          typeof response === 'object' && 
          (response.field_label || response.display_value || response.value)
        )
      : []
  };
};

/**
 * Validates and sanitizes form response data
 * @param {Object} response - Raw response data
 * @returns {Object} Validated and sanitized response
 */
export const validateFormResponse = (response) => {
  if (!response || typeof response !== 'object') {
    return {
      field_label: 'Unknown Field',
      display_value: 'No response provided',
      field_type: 'text'
    };
  }

  return {
    field_label: String(response.field_label || 'Unknown Field'),
    display_value: String(response.display_value || response.value || 'No response provided'),
    field_type: String(response.field_type || 'text')
  };
};

/**
 * Handles API errors with user-friendly messages
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (error, context = 'operation') => {
  if (!error) return 'An unknown error occurred';

  // Network errors
  if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
    return 'Network error. Please check your internet connection and try again.';
  }

  // HTTP status errors
  if (error.response) {
    const status = error.response.status;
    switch (status) {
      case 401:
        return 'Session expired. Please log in again.';
      case 403:
        return 'You do not have permission to access this resource.';
      case 404:
        return 'The requested resource was not found.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return `Error ${status}: ${error.response.data?.message || 'Something went wrong'}`;
    }
  }

  // Request timeout
  if (error.code === 'ECONNABORTED') {
    return 'Request timed out. Please try again.';
  }

  // Default error message
  return error.message || `Failed to ${context}. Please try again.`;
};

/**
 * Retry mechanism for API calls
 * @param {Function} apiCall - Function that returns a Promise
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries in milliseconds
 * @returns {Promise} Promise that resolves with API response
 */
export const retryApiCall = async (apiCall, maxRetries = 3, delay = 1000) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain errors
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw error;
      }

      if (attempt < maxRetries) {
        console.warn(`API call failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }

  throw lastError;
};

/**
 * Debounce function for API calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function for API calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};
