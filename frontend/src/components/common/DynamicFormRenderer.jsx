import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

const DynamicFormRenderer = ({ 
  form, 
  initialData = {}, 
  onSubmit, 
  onSaveDraft, 
  isSubmitting = false,
  showProgress = true,
  isProcessing = false
}) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  useEffect(() => {
    // Initialize form data with initial values
    const initialFormData = {};
    form.fields.forEach(field => {
      if (initialData[field.field_id] !== undefined) {
        initialFormData[field.field_id] = initialData[field.field_id];
      } else if (field.type === 'checkbox') {
        initialFormData[field.field_id] = [];
      } else {
        initialFormData[field.field_id] = '';
      }
    });
    setFormData(initialFormData);
  }, [form, initialData]);

  const validateField = (field, value) => {
    const fieldErrors = [];

    // Required validation
    if (field.required) {
      if (!value || (Array.isArray(value) && value.length === 0)) {
        fieldErrors.push(`${field.label} is required`);
        return fieldErrors;
      }
    }

    if (!value || (Array.isArray(value) && value.length === 0)) {
      return fieldErrors; // No validation for empty optional fields
    }

    // Type-specific validation
    switch (field.type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          fieldErrors.push('Please enter a valid email address');
        }
        break;
      
      case 'phone':
        // Remove any non-digit characters for validation
        const cleanPhone = value.replace(/\D/g, '');
        if (cleanPhone.length < 7) {
          fieldErrors.push('Phone number must be at least 7 digits');
        } else if (cleanPhone.length > 20) {
          fieldErrors.push('Phone number must be no more than 20 digits');
        }
        break;
      
      case 'number':
        if (isNaN(value) || value === '') {
          fieldErrors.push('Please enter a valid number');
        } else {
          const numValue = parseFloat(value);
          if (field.validation?.min !== undefined && numValue < field.validation.min) {
            fieldErrors.push(`Value must be at least ${field.validation.min}`);
          }
          if (field.validation?.max !== undefined && numValue > field.validation.max) {
            fieldErrors.push(`Value must be no more than ${field.validation.max}`);
          }
        }
        break;
      
      case 'text':
      case 'textarea':
        if (field.validation?.minLength && value.length < field.validation.minLength) {
          fieldErrors.push(`Must be at least ${field.validation.minLength} characters`);
        }
        if (field.validation?.maxLength && value.length > field.validation.maxLength) {
          fieldErrors.push(`Must be no more than ${field.validation.maxLength} characters`);
        }
        break;
      
      case 'dropdown':
      case 'radio':
        if (!field.options.includes(value)) {
          fieldErrors.push('Please select a valid option');
        }
        break;
      
      case 'checkbox':
        if (!Array.isArray(value)) {
          fieldErrors.push('Invalid selection');
        } else {
          const invalidOptions = value.filter(option => !field.options.includes(option));
          if (invalidOptions.length > 0) {
            fieldErrors.push('Please select valid options');
          }
        }
        break;
      
      case 'date':
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(value)) {
          fieldErrors.push('Please enter a valid date (YYYY-MM-DD)');
        }
        break;
    }

    return fieldErrors;
  };

  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));

    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => ({
        ...prev,
        [fieldId]: []
      }));
    }
  };

  const handleFieldBlur = (fieldId) => {
    setTouched(prev => ({
      ...prev,
      [fieldId]: true
    }));

    const field = form.fields.find(f => f.field_id === fieldId);
    if (field) {
      const fieldErrors = validateField(field, formData[fieldId]);
      setErrors(prev => ({
        ...prev,
        [fieldId]: fieldErrors
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    form.fields.forEach(field => {
      const fieldErrors = validateField(field, formData[field.field_id]);
      if (fieldErrors.length > 0) {
        newErrors[field.field_id] = fieldErrors;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (status = 'submitted') => {
    if (status === 'submitted' && !validateForm()) {
      return;
    }

    const responses = form.fields.map(field => ({
      field_id: field.field_id,
      value: formData[field.field_id]
    }));

    if (status === 'submitted') {
      onSubmit(responses);
    } else {
      onSaveDraft(responses);
    }
  };

  const renderField = (field) => {
    const value = formData[field.field_id] || '';
    const fieldErrors = errors[field.field_id] || [];
    const isTouched = touched[field.field_id];
    const hasError = fieldErrors.length > 0 && isTouched;

    const baseInputClasses = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      hasError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
    }`;

    const renderFieldInput = () => {
      switch (field.type) {
        case 'text':
        case 'email':
        case 'number':
          return (
            <input
              type={field.type}
              value={value}
              onChange={(e) => handleFieldChange(field.field_id, e.target.value)}
              onBlur={() => handleFieldBlur(field.field_id)}
              placeholder={field.placeholder}
              className={baseInputClasses}
              disabled={isSubmitting}
            />
          );

        case 'phone':
          return (
            <input
              type="tel"
              value={value}
              onChange={(e) => handleFieldChange(field.field_id, e.target.value)}
              onBlur={() => handleFieldBlur(field.field_id)}
              placeholder={field.placeholder || "Enter phone number"}
              className={baseInputClasses}
              disabled={isSubmitting}
              maxLength={20}
            />
          );

        case 'textarea':
          return (
            <textarea
              value={value}
              onChange={(e) => handleFieldChange(field.field_id, e.target.value)}
              onBlur={() => handleFieldBlur(field.field_id)}
              placeholder={field.placeholder}
              rows={3}
              className={baseInputClasses}
              disabled={isSubmitting}
            />
          );

        case 'dropdown':
          return (
            <select
              value={value}
              onChange={(e) => handleFieldChange(field.field_id, e.target.value)}
              onBlur={() => handleFieldBlur(field.field_id)}
              className={baseInputClasses}
              disabled={isSubmitting}
            >
              <option value="">Select an option</option>
              {field.options.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
          );

        case 'radio':
          return (
            <div className="space-y-2">
              {field.options.map((option, index) => (
                <label key={index} className="flex items-center">
                  <input
                    type="radio"
                    name={field.field_id}
                    value={option}
                    checked={value === option}
                    onChange={(e) => handleFieldChange(field.field_id, e.target.value)}
                    onBlur={() => handleFieldBlur(field.field_id)}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          );

        case 'checkbox':
          return (
            <div className="space-y-2">
              {field.options.map((option, index) => (
                <label key={index} className="flex items-center">
                  <input
                    type="checkbox"
                    value={option}
                    checked={Array.isArray(value) && value.includes(option)}
                    onChange={(e) => {
                      const currentValue = Array.isArray(value) ? value : [];
                      const newValue = e.target.checked
                        ? [...currentValue, option]
                        : currentValue.filter(v => v !== option);
                      handleFieldChange(field.field_id, newValue);
                    }}
                    onBlur={() => handleFieldBlur(field.field_id)}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          );

        case 'date':
          return (
            <input
              type="date"
              value={value}
              onChange={(e) => handleFieldChange(field.field_id, e.target.value)}
              onBlur={() => handleFieldBlur(field.field_id)}
              className={baseInputClasses}
              disabled={isSubmitting}
            />
          );

        default:
          return (
            <input
              type="text"
              value={value}
              onChange={(e) => handleFieldChange(field.field_id, e.target.value)}
              onBlur={() => handleFieldBlur(field.field_id)}
              placeholder={field.placeholder}
              className={baseInputClasses}
              disabled={isSubmitting}
            />
          );
      }
    };

    return (
      <div key={field.field_id} className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        {renderFieldInput()}
        
        {hasError && (
          <div className="flex items-center text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 mr-1" />
            <span>{fieldErrors[0]}</span>
          </div>
        )}
      </div>
    );
  };

  const getProgressPercentage = () => {
    const totalFields = form.fields.length;
    const filledFields = form.fields.filter(field => {
      const value = formData[field.field_id];
      return value && (Array.isArray(value) ? value.length > 0 : value.toString().trim() !== '');
    }).length;
    
    return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Form Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{form.title}</h2>
        {form.description && (
          <p className="text-gray-600 mt-2">{form.description}</p>
        )}
      </div>

      {/* Progress Bar */}
      {showProgress && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-500">{getProgressPercentage()}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>
      )}

      {/* Form Fields */}
      <form className="space-y-6">
        {form.fields.map(field => renderField(field))}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => handleSubmit('draft')}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Draft'}
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => handleSubmit('submitted')}
              disabled={isSubmitting || isProcessing}
              className="flex items-center px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isProcessing ? 'Processing...' : 'Submitting...'}
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Submit Form
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default DynamicFormRenderer;
