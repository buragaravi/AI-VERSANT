import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Clock, FileText } from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../../services/api';
import DynamicFormRenderer from '../../components/common/DynamicFormRenderer';
import { useFormPortal } from '../../contexts/FormPortalContext';

const FormSubmission = ({ formId, onComplete, isProcessing = false, showProgress = true }) => {
  const { updateFormStatus } = useFormPortal();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (formId) {
      fetchForm();
    }
  }, [formId]);

  const fetchForm = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/form-submissions/student/forms/${formId}`);
      if (response.data.success) {
        setForm(response.data.data.form);
        setExistingSubmission(response.data.data.existingSubmission);
      } else {
        setError(response.data.message || 'Failed to fetch form');
      }
    } catch (err) {
      console.error('Error fetching form:', err);
      setError('Failed to fetch form. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (responses, status = 'submitted') => {
    try {
      setSubmitting(true);
      
      // Debug logging
      console.log('🚀 Submitting form with data:', {
        form_id: formId,
        responses: responses,
        status: status
      });
      
      const response = await api.post('/form-submissions/student/submit', {
        form_id: formId,
        responses: responses,
        status: status
      });

      if (response.data.success) {
        if (status === 'submitted') {
          // Immediately update form status in context
          updateFormStatus(formId, {
            isSubmitted: true,
            canSubmit: false
          });
          
          Swal.fire({
            title: 'Success!',
            text: 'Form submitted successfully!',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          }).then(() => {
            onComplete && onComplete();
          });
        } else {
          Swal.fire({
            title: 'Draft Saved!',
            text: 'Your progress has been saved.',
            icon: 'info',
            timer: 2000,
            showConfirmButton: false
          });
        }
      } else {
        Swal.fire('Error', response.data.message || 'Failed to submit form', 'error');
      }
    } catch (err) {
      console.error('❌ Error submitting form:', err);
      
      // Extract detailed error information
      let errorMessage = 'Failed to submit form. Please try again.';
      let errorDetails = '';
      
      if (err.response?.data) {
        const errorData = err.response.data;
        errorMessage = errorData.message || errorMessage;
        
        if (errorData.errors && Array.isArray(errorData.errors)) {
          errorDetails = errorData.errors.join('\n');
        }
      }
      
      console.log('📋 Error details:', {
        status: err.response?.status,
        message: errorMessage,
        errors: errorDetails,
        fullError: err.response?.data
      });
      
      // Show detailed error message
      if (errorDetails) {
        Swal.fire({
          title: 'Validation Error',
          text: errorMessage,
          html: `<div class="text-left">
            <p class="mb-2">${errorMessage}</p>
            <div class="bg-red-50 p-3 rounded border">
              <p class="text-sm font-medium text-red-800 mb-1">Details:</p>
              <ul class="text-sm text-red-700 list-disc list-inside">
                ${(err.response?.data?.errors || []).map(error => `<li>${error}</li>`).join('')}
              </ul>
            </div>
          </div>`,
          icon: 'error',
          confirmButtonText: 'OK'
        });
      } else {
        Swal.fire('Error', errorMessage, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = (responses) => {
    handleSubmit(responses, 'draft');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-center text-gray-600 mt-4">Loading form...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center text-red-500 mb-4">
            <AlertCircle className="w-12 h-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Error</h3>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <div className="flex justify-center">
            <button
              onClick={fetchForm}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center text-gray-400 mb-4">
            <FileText className="w-12 h-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Form Not Found</h3>
          <p className="text-gray-600 text-center mb-6">The requested form could not be found.</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Check if form is already submitted and multiple submissions not allowed
  if (existingSubmission && existingSubmission.status === 'submitted' && !form.settings.allowMultipleSubmissions) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center text-green-500 mb-4">
            <CheckCircle className="w-12 h-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Already Submitted</h3>
          <p className="text-gray-600 text-center mb-4">
            You have already submitted this form on {formatDate(existingSubmission.submitted_at)}.
          </p>
          <p className="text-sm text-gray-500 text-center mb-6">
            Multiple submissions are not allowed for this form.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Check submission deadline
  if (form.settings.submissionDeadline) {
    const deadline = new Date(form.settings.submissionDeadline);
    const now = new Date();
    if (now > deadline) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-center text-red-500 mb-4">
              <Clock className="w-12 h-12" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Submission Deadline Passed</h3>
            <p className="text-gray-600 text-center mb-4">
              The submission deadline for this form was {formatDate(form.settings.submissionDeadline)}.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="w-full">
      <div className="bg-white rounded-lg w-full">
        {/* Header - No close button */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{form.title}</h2>
            {form.description && (
              <p className="text-sm text-gray-600 mt-1">{form.description}</p>
            )}
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          {/* Existing Submission Info */}
          {existingSubmission && existingSubmission.status === 'draft' && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-yellow-600 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">Draft Found</h3>
                  <p className="text-sm text-yellow-700">
                    You have a saved draft from {formatDate(existingSubmission.submitted_at)}. 
                    You can continue editing or start fresh.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submission Deadline Warning */}
          {form.settings.submissionDeadline && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-blue-600 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-blue-800">Submission Deadline</h3>
                  <p className="text-sm text-blue-700">
                    Please submit before {formatDate(form.settings.submissionDeadline)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form Renderer */}
          <DynamicFormRenderer
            form={form}
            initialData={existingSubmission ? 
              existingSubmission.responses.reduce((acc, response) => {
                acc[response.field_id] = response.value;
                return acc;
              }, {}) : {}
            }
            onSubmit={(responses) => handleSubmit(responses, 'submitted')}
            onSaveDraft={handleSaveDraft}
            isSubmitting={submitting}
            isProcessing={isProcessing}
            showProgress={form.settings.showProgress}
          />
        </div>
      </div>
    </div>
  );
};

export default FormSubmission;
