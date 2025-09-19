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
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
        <FileText className="h-6 w-6 text-blue-600 mr-3" />
        Form Progress
      </h2>
      
      {/* Progress Overview */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">Overall Progress</span>
          <span className="text-sm font-bold text-gray-900">
            {formStats.completedForms} / {formStats.totalForms} forms
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${formStats.completionPercentage}%` }}
          />
        </div>
        <div className="text-right mt-2">
          <span className="text-sm font-medium text-blue-600">{formStats.completionPercentage}% complete</span>
        </div>
      </div>

      {/* Form List */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Forms</h3>
        {availableForms.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No forms available</p>
            <p className="text-sm text-gray-400 mt-1">Forms will appear here when available</p>
          </div>
        ) : (
          availableForms.map((form) => (
            <div
              key={form._id}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:border-gray-300 transition-all duration-300"
            >
              <div className="flex items-center">
                {form.isSubmitted ? (
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                ) : (
                  <Clock className="h-5 w-5 text-yellow-500 mr-3" />
                )}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">{form.title}</h4>
                  <p className="text-xs text-gray-600">
                    {form.isRequired ? 'Required' : 'Optional'} • {form.isSubmitted ? 'Completed' : 'Pending'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                  form.isSubmitted 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 text-blue-600 mr-3" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            {formStats.recentSubmissions.map((submission, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
                  <span className="text-sm font-medium text-gray-900">
                    {submission.form_title || 'Form'}
                  </span>
                </div>
                <span className="text-sm text-gray-600">
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
