import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { useFormPortal } from '../../contexts/FormPortalContext';
import FormSubmission from '../../pages/student/FormSubmission';

const FormPortalPopup = () => {
  const {
    availableForms,
    getIncompleteRequiredForms,
    getIncompleteForms, // NEW: Get all incomplete forms
    hasIncompleteRequiredForms,
    hasIncompleteForms, // NEW: Check if any forms are incomplete
    getFormCompletionPercentage,
    loading,
    refreshForms
  } = useFormPortal();

  const [formQueue, setFormQueue] = useState([]);
  const [currentFormIndex, setCurrentFormIndex] = useState(0);
  const [selectedForm, setSelectedForm] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize form queue when forms are loaded
  useEffect(() => {
    if (!loading && availableForms.length > 0) {
      const incompleteForms = getIncompleteForms(); // Use ALL incomplete forms
      setFormQueue(incompleteForms);
      setCurrentFormIndex(0);
      
      // Show first form if there are incomplete forms
      if (incompleteForms.length > 0) {
        setSelectedForm(incompleteForms[0]);
        setShowFormModal(true);
      } else {
        // No incomplete forms, close modal
        setShowFormModal(false);
        setSelectedForm(null);
      }
    }
  }, [loading, availableForms, getIncompleteForms]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-center text-gray-600 mt-4">Loading forms...</p>
        </div>
      </div>
    );
  }

  // Don't show popup if no incomplete forms (required or optional)
  if (!hasIncompleteForms() || formQueue.length === 0) {
    return null;
  }

  const handleFormClick = (form) => {
    setSelectedForm(form);
    setShowFormModal(true);
  };

  const handleFormComplete = async () => {
    setIsProcessing(true);
    
    // Get updated incomplete forms immediately (using updated context state)
    const updatedIncompleteForms = getIncompleteForms(); // Use ALL incomplete forms
    
    // Update form queue with fresh data
    setFormQueue(updatedIncompleteForms);
    
    // Move to next form in queue
    const nextIndex = currentFormIndex + 1;
    
    if (nextIndex < updatedIncompleteForms.length) {
      // Show next form
      setCurrentFormIndex(nextIndex);
      setSelectedForm(updatedIncompleteForms[nextIndex]);
      setShowFormModal(true);
    } else {
      // All forms completed
      setShowFormModal(false);
      setSelectedForm(null);
      setFormQueue([]);
      setCurrentFormIndex(0);
    }
    
    // Refresh forms in background for next time
    refreshForms();
    
    setIsProcessing(false);
  };

  const getCurrentForm = () => {
    return formQueue[currentFormIndex] || null;
  };

  const getProgressInfo = () => {
    return {
      current: currentFormIndex + 1,
      total: formQueue.length,
      percentage: Math.round(((currentFormIndex + 1) / formQueue.length) * 100)
    };
  };

  const currentForm = getCurrentForm();
  const progress = getProgressInfo();

  if (!currentForm) {
    return null;
  }

  return (
    <>
      {/* Backdrop - No close button */}
      <div className="fixed inset-0 bg-black bg-opacity-75 z-40" />
      
      {/* Form Submission Modal - No close button */}
      {showFormModal && currentForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header with Progress */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <FileText className="w-6 h-6 text-blue-600 mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Form {progress.current} of {progress.total}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Please complete this form to continue
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {progress.current} / {progress.total}
                  </div>
                  <div className="text-xs text-gray-500">
                    {progress.percentage}% Complete
                  </div>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>

            {/* Form Content */}
            <div className="p-6">
              <FormSubmission
                formId={currentForm._id}
                onComplete={handleFormComplete}
                isProcessing={isProcessing}
                showProgress={false} // We handle progress in header
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FormPortalPopup;
