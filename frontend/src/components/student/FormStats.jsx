import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, BarChart3 } from 'lucide-react';
import { useFormPortal } from '../../contexts/FormPortalContext';
import api from '../../services/api';

const FormStats = () => {
  const { availableForms, getFormCompletionPercentage } = useFormPortal();
  const [formStats, setFormStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFormStats();
  }, [availableForms]);

  const fetchFormStats = async () => {
    try {
      setLoading(true);
      
      // Get form completion stats
      const completionPercentage = getFormCompletionPercentage();
      
      // Get recent submissions
      const response = await api.get('/form-submissions/student/recent-submissions');
      const recentSubmissions = response.data.success ? response.data.data.submissions : [];
      
      setFormStats({
        totalForms: availableForms.length,
        completedForms: availableForms.filter(form => form.isSubmitted).length,
        completionPercentage,
        recentSubmissions: recentSubmissions.slice(0, 5) // Last 5 submissions
      });
    } catch (error) {
      console.error('Error fetching form stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!formStats) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
        <FileText className="h-6 w-6 text-blue-600 mr-2" />
        Form Progress
      </h2>
      
      {/* Progress Overview */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm font-medium text-gray-900">
            {formStats.completedForms} / {formStats.totalForms} forms
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${formStats.completionPercentage}%` }}
          />
        </div>
        <div className="text-right mt-1">
          <span className="text-sm text-gray-600">{formStats.completionPercentage}% complete</span>
        </div>
      </div>

      {/* Form List */}
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Your Forms</h3>
        {availableForms.length === 0 ? (
          <p className="text-gray-500 text-sm">No forms available at the moment.</p>
        ) : (
          availableForms.map((form) => (
            <div
              key={form._id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center">
                {form.isSubmitted ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                ) : (
                  <Clock className="h-5 w-5 text-yellow-500 mr-3" />
                )}
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{form.title}</h4>
                  <p className="text-xs text-gray-500">
                    {form.isRequired ? 'Required' : 'Optional'} • {form.isSubmitted ? 'Completed' : 'Pending'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  form.isSubmitted 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {form.isSubmitted ? 'Done' : 'Pending'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Recent Submissions */}
      {formStats.recentSubmissions.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
            <BarChart3 className="h-5 w-5 text-gray-600 mr-2" />
            Recent Activity
          </h3>
          <div className="space-y-2">
            {formStats.recentSubmissions.map((submission, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  Submitted: {submission.form_title || 'Form'}
                </span>
                <span className="text-gray-500">
                  {new Date(submission.submitted_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FormStats;
