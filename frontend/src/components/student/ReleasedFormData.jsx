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

const ReleasedFormData = () => {
  const [releasedSubmissions, setReleasedSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReleasedSubmissions();
  }, []);

  const fetchReleasedSubmissions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/form-submissions/student/released-submissions');
      if (response.data.success) {
        setReleasedSubmissions(response.data.data.submissions);
      }
    } catch (error) {
      console.error('Error fetching released submissions:', error);
    } finally {
      setLoading(false);
    }
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

  if (releasedSubmissions.length === 0) {
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
        {releasedSubmissions.map((submission) => (
          <div key={submission._id} className="border border-gray-200 rounded-lg p-6">
            {/* Form Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  {submission.form_title}
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

            {/* Form Responses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {submission.form_responses.map((response, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mr-3 mt-1">
                      {getFieldIcon(response.field_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {response.field_label}
                        </h4>
                        {response.field_required && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            Required
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mb-1">
                        Type: {response.field_type}
                      </div>
                      <div className="text-base font-medium text-gray-900">
                        {response.display_value || 'No response'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReleasedFormData;
