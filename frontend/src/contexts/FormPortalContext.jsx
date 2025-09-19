import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const FormPortalContext = createContext();

export const FormPortalProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [availableForms, setAvailableForms] = useState([]);
  const [formCompletionStatus, setFormCompletionStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authLoading && user && user.role === 'student') {
      fetchAvailableForms();
    } else if (!authLoading && !user) {
      // Clear all form data when user logs out
      setAvailableForms([]);
      setFormCompletionStatus({});
      setLoading(false);
      setError(null);
    }
  }, [user, authLoading]);

  const fetchAvailableForms = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/form-submissions/student/forms');
      
      if (response.data.success) {
        const forms = response.data.data.forms;
        setAvailableForms(forms);
        
        // Create completion status map
        const statusMap = {};
        forms.forEach(form => {
          statusMap[form._id] = {
            isSubmitted: form.isSubmitted || false,
            canSubmit: form.canSubmit || false,
            isRequired: form.isRequired || false
          };
        });
        setFormCompletionStatus(statusMap);
      } else {
        setError(response.data.message || 'Failed to fetch forms');
      }
    } catch (err) {
      console.error('❌ Error fetching available forms:', err);
      setError('Failed to fetch forms');
    } finally {
      setLoading(false);
    }
  };

  const updateFormStatus = (formId, status) => {
    setFormCompletionStatus(prev => ({
      ...prev,
      [formId]: {
        ...prev[formId],
        ...status
      }
    }));
  };

  const getRequiredForms = () => {
    return availableForms.filter(form => form.isRequired);
  };

  const getIncompleteRequiredForms = () => {
    return availableForms.filter(form => {
      const isRequired = form.isRequired;
      const isSubmitted = formCompletionStatus[form._id]?.isSubmitted || form.isSubmitted;
      return isRequired && !isSubmitted;
    });
  };

  // NEW: Get ALL incomplete forms (both required and optional)
  const getIncompleteForms = () => {
    return availableForms.filter(form => {
      const isSubmitted = formCompletionStatus[form._id]?.isSubmitted || form.isSubmitted;
      return !isSubmitted; // All forms that are not submitted yet
    });
  };

  const hasIncompleteRequiredForms = () => {
    return getIncompleteRequiredForms().length > 0;
  };

  // NEW: Check if there are any incomplete forms (required or optional)
  const hasIncompleteForms = () => {
    return getIncompleteForms().length > 0;
  };

  const getFormCompletionPercentage = () => {
    const requiredForms = getRequiredForms();
    if (requiredForms.length === 0) return 100;
    
    const completedForms = requiredForms.filter(form => 
      formCompletionStatus[form._id]?.isSubmitted
    );
    
    return Math.round((completedForms.length / requiredForms.length) * 100);
  };

  const refreshForms = () => {
    if (user && user.role === 'student') {
      fetchAvailableForms();
    }
  };

  const markFormAsSubmitted = (formId) => {
    setFormCompletionStatus(prev => ({
      ...prev,
      [formId]: {
        ...prev[formId],
        isSubmitted: true,
        canSubmit: false
      }
    }));
  };

  return (
    <FormPortalContext.Provider value={{
      availableForms,
      formCompletionStatus,
      loading,
      error,
      getRequiredForms,
      getIncompleteRequiredForms,
      getIncompleteForms, // NEW: Export function to get all incomplete forms
      hasIncompleteRequiredForms,
      hasIncompleteForms, // NEW: Export function to check if any forms are incomplete
      getFormCompletionPercentage,
      updateFormStatus,
      refreshForms
    }}>
      {children}
    </FormPortalContext.Provider>
  );
};

export const useFormPortal = () => {
  const context = useContext(FormPortalContext);
  if (!context) {
    throw new Error('useFormPortal must be used within a FormPortalProvider');
  }
  return context;
};
