import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Calendar, 
  CheckCircle, 
  Clock,
  User,
  Mail,
  Phone,
  GraduationCap
} from 'lucide-react';
import api from '../../services/api';
import { safeGet, validateFormSubmission, validateFormResponse, getErrorMessage, retryApiCall } from '../../utils/apiHelpers';

const ReleasedFormData = () => {
  const [releasedSubmissions, setReleasedSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReleasedSubmissions();
  }, []);

  const fetchReleasedSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use retry mechanism for better reliability
      const response = await retryApiCall(
        () => api.get('/form-submissions/student/released-submissions'),
        3, // max retries
        1000 // initial delay
      );
      
      // Use safeGet to extract data with fallbacks
      const submissions = safeGet(response, 'data.data.submissions', []);
      
      // Validate and sanitize each submission
      const validatedSubmissions = Array.isArray(submissions) 
        ? submissions.map(validateFormSubmission)
        : [];
      
      setReleasedSubmissions(validatedSubmissions);
      
      if (validatedSubmissions.length === 0) {
        console.info('No released submissions found');
      }
      
    } catch (error) {
      console.error('Error fetching released submissions:', error);
      const errorMessage = getErrorMessage(error, 'load form data');
      setError(errorMessage);
      setReleasedSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'Unknown date';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.warn('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const getFieldIcon = (fieldType) => {
    switch (fieldType) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'text':
        return <User className="w-4 h-4" />;
      case 'phone':
        return <Phone className="w-4 h-4" />;
      case 'dropdown':
        return <GraduationCap className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <p className="text-center text-gray-600 mt-4">Loading released form data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Form Data</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={fetchReleasedSubmissions}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!releasedSubmissions || releasedSubmissions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Released Form Data</h3>
          <p className="text-gray-500">
            Your form submissions haven't been released to your profile yet. 
            Contact your administrator if you expect to see form data here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-6">
        <FileText className="w-6 h-6 text-blue-600 mr-3" />
        <h2 className="text-xl font-semibold text-gray-900">Released Form Data</h2>
        <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {releasedSubmissions.length} {releasedSubmissions.length === 1 ? 'Form' : 'Forms'}
        </span>
      </div>

      <div className="space-y-6">
        {releasedSubmissions.map((submission) => {
          // Add safety checks for submission data
          if (!submission || !submission._id) {
            console.warn('Invalid submission data:', submission);
            return null;
          }
          
          return (
            <div key={submission._id} className="border border-gray-200 rounded-lg p-6">
            {/* Form Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  {submission.form_title || 'Untitled Form'}
                </h3>
                {submission.form_description && (
                  <p className="text-sm text-gray-600 mb-2">
                    {submission.form_description}
                  </p>
                )}
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-1" />
                  Submitted on {formatDate(submission.submitted_at)}
                </div>
              </div>
              <div className="flex items-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Released
                </span>
              </div>
            </div>

            {/* Form Responses - Ultra Precise Dynamic Layout */}
            <div className="flex flex-wrap gap-4">
              {(submission.form_responses || [])
                .filter(response => response && typeof response === 'object')
                .map((response, index) => {
                try {
                  // Use validateFormResponse for consistent data handling
                  const validatedResponse = validateFormResponse(response);
                  const value = validatedResponse.display_value || 'No response';
                  const valueLength = String(value).length;
                  const labelLength = String(validatedResponse.field_label || 'Unknown Field').length;
                
                // Ultra precise width calculation with dramatic differences
                const charWidth = 9; // Character width
                const iconSpace = 50; // Icon + spacing
                const cardPadding = 40; // Card padding
                
                // Calculate width for both label and value
                const labelWidth = labelLength * charWidth;
                const valueWidth = valueLength * charWidth;
                
                // Use very different widths based on content length
                let textWidth;
                if (valueLength <= 3) {
                  // Very short like "sfd" - extremely compact
                  textWidth = Math.max(labelWidth, 60);
                } else if (valueLength <= 6) {
                  // Short like "Weekly" - very compact
                  textWidth = Math.max(labelWidth, valueWidth, 80);
                } else if (valueLength <= 12) {
                  // Medium-short like "Very Satisfied" - compact
                  textWidth = Math.max(labelWidth, valueWidth, 120);
                } else if (valueLength <= 20) {
                  // Medium like "ravi@gmail.com" - medium
                  textWidth = Math.max(labelWidth, valueWidth, 160);
                } else if (valueLength <= 30) {
                  // Medium-long - large
                  textWidth = Math.max(labelWidth, valueWidth, 200);
                } else {
                  // Long values - very large
                  textWidth = Math.max(labelWidth, valueWidth, 250);
                }
                
                // Calculate total width needed
                const totalWidth = textWidth + iconSpace + cardPadding;
                
                // Determine if this should be full width
                const fieldType = validatedResponse.field_type;
                const fieldLabel = validatedResponse.field_label.toLowerCase();
                const shouldBeFullWidth = fieldType === 'textarea' || 
                                        fieldLabel.includes('message') ||
                                        fieldLabel.includes('description') ||
                                        fieldLabel.includes('comment') ||
                                        valueLength > 40 ||
                                        totalWidth > 400;
                
                // Calculate optimal width with more dramatic differences
                let finalWidth;
                let flexBasis;
                
                if (shouldBeFullWidth) {
                  finalWidth = '100%';
                  flexBasis = '100%';
                } else {
                  // Use calculated width with more dramatic bounds
                  const calculatedWidth = Math.max(100, Math.min(totalWidth, 350));
                  finalWidth = calculatedWidth + 'px';
                  flexBasis = calculatedWidth + 'px';
                }
                
                  return (
                    <div 
                      key={index} 
                      className="bg-gray-50 rounded-lg p-4 transition-all duration-200 hover:shadow-md"
                      style={{
                        width: finalWidth,
                        minWidth: '100px',
                        maxWidth: shouldBeFullWidth ? '100%' : '350px',
                        flexBasis: flexBasis,
                        flexShrink: 0,
                        flexGrow: shouldBeFullWidth ? 1 : 0
                      }}
                    >
                      <div className="flex items-start space-x-3 h-full">
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            {getFieldIcon(fieldType)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col">
                          <h4 className="text-sm font-medium text-gray-700 mb-1 truncate">
                            {validatedResponse.field_label}
                          </h4>
                          <p className="text-base text-gray-900 font-medium break-words flex-1">
                            {value}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                } catch (error) {
                  console.warn('Error processing form response:', error, response);
                  // Return a fallback component for invalid responses
                  return (
                    <div 
                      key={index} 
                      className="bg-red-50 rounded-lg p-4 border border-red-200"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-4 h-4 text-red-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-red-700 mb-1">
                            Invalid Response
                          </h4>
                          <p className="text-sm text-red-600">
                            Unable to display this form response
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReleasedFormData;
