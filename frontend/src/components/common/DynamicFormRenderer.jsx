import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, FileText } from 'lucide-react';

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

    const baseInputClasses = `w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all duration-300 text-sm ${
      hasError 
        ? 'border-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50' 
        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-400 hover:border-gray-400 bg-white'
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
              rows={2}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {field.options.map((option, index) => (
                <label key={index} className="group/radio flex items-center p-2 rounded-lg border border-gray-200 hover:border-blue-300 cursor-pointer transition-all duration-200 hover:bg-blue-50">
                  <input
                    type="radio"
                    name={field.field_id}
                    value={option}
                    checked={value === option}
                    onChange={(e) => handleFieldChange(field.field_id, e.target.value)}
                    onBlur={() => handleFieldBlur(field.field_id)}
                    className="w-3 h-3 text-blue-600 focus:ring-blue-500 focus:ring-1 mr-2"
                    disabled={isSubmitting}
                  />
                  <span className="text-xs font-medium text-gray-700 group-hover/radio:text-blue-700 transition-colors truncate">{option}</span>
                </label>
              ))}
            </div>
          );

        case 'checkbox':
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {field.options.map((option, index) => (
                <label key={index} className="group/checkbox flex items-center p-2 rounded-lg border border-gray-200 hover:border-blue-300 cursor-pointer transition-all duration-200 hover:bg-blue-50">
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
                    className="w-3 h-3 text-blue-600 focus:ring-blue-500 focus:ring-1 mr-2 rounded"
                    disabled={isSubmitting}
                  />
                  <span className="text-xs font-medium text-gray-700 group-hover/checkbox:text-blue-700 transition-colors truncate">{option}</span>
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
      <div key={field.field_id} className="group">
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 border border-gray-100 hover:border-blue-200 transition-all duration-300 hover:shadow-sm h-full">
          <label className="block text-sm font-semibold text-gray-800 mb-2 group-hover:text-blue-700 transition-colors duration-200">
            {field.label}
            {field.required && <span className="text-red-500 ml-1 text-sm">*</span>}
          </label>
          
          <div className="relative">
            {renderFieldInput()}
          </div>
          
          {hasError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center text-red-600 text-xs mt-2 p-2 bg-red-50 rounded-md border border-red-200"
            >
              <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="font-medium">{fieldErrors[0]}</span>
            </motion.div>
          )}
        </div>
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
    <div className="w-full max-w-7xl mx-auto">
      {/* Form Header with Soft Design */}
      <div className="mb-6 text-left">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{form.title}</h2>
        {form.description && (
          <p className="text-gray-600 text-base leading-relaxed">{form.description}</p>
        )}
      </div>

      {/* Progress Bar with Soft Styling */}
      {showProgress && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Form Progress</span>
            <span className="text-sm font-bold text-blue-600">{getProgressPercentage()}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 shadow-inner">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500 ease-out shadow-sm"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>
      )}

      {/* Form Fields with Responsive Grid */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <form className="p-6">
          {/* Responsive Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {form.fields.map((field, index) => (
              <div key={field.field_id} className="group">
                {renderField(field)}
              </div>
            ))}
          </div>

          {/* Action Buttons with Soft Design */}
          <div className="pt-6 mt-6 border-t border-gray-100">
            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={() => handleSubmit('submitted')}
                disabled={isSubmitting || isProcessing}
                className="group relative px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 overflow-hidden"
              >
                {/* Animated background */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                {/* Button content */}
                <div className="relative flex items-center justify-center">
                  {isSubmitting || isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      <span className="text-base">
                        {isProcessing ? 'Processing...' : 'Submitting...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-200" />
                      <span className="text-base">Submit Form</span>
                    </>
                  )}
                </div>
                
                {/* Shine effect */}
                <div className="absolute inset-0 -top-1 -left-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 group-hover:animate-pulse"></div>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DynamicFormRenderer;
