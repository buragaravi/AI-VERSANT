import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  FileText, 
  TrendingUp, 
  Download,
  Calendar,
  CheckCircle,
  Clock,
  PieChart
} from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../../services/api';

const FormAnalytics = ({ selectedForm = null, onBack = null }) => {
  const [overview, setOverview] = useState(null);
  const [completionRates, setCompletionRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formStats, setFormStats] = useState(null);
  const [selectedFormId, setSelectedFormId] = useState(null);
  const [dateRange, setDateRange] = useState({
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    fetchOverview();
    fetchCompletionRates();
    
    if (selectedForm) {
      fetchFormStats(selectedForm._id);
    }
  }, [selectedForm]);

  const fetchOverview = async () => {
    try {
      console.log('🔍 Fetching analytics overview...');
      const response = await api.get('/form-analytics/overview');
      console.log('📊 Overview response:', response.data);
      if (response.data.success) {
        setOverview(response.data.data.overview);
      } else {
        console.error('❌ Overview API returned error:', response.data.message);
      }
    } catch (error) {
      console.error('❌ Error fetching overview:', error);
    }
  };

  const fetchCompletionRates = async () => {
    try {
      console.log('🔍 Fetching completion rates...');
      const response = await api.get('/form-analytics/completion-rates');
      console.log('📈 Completion rates response:', response.data);
      if (response.data.success) {
        setCompletionRates(response.data.data.completion_rates);
      } else {
        console.error('❌ Completion rates API returned error:', response.data.message);
      }
    } catch (error) {
      console.error('❌ Error fetching completion rates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFormStats = async (formId) => {
    try {
      console.log('🔍 Fetching form stats for:', formId);
      const response = await api.get(`/form-analytics/forms/${formId}/stats`);
      console.log('📊 Form stats response:', response.data);
      if (response.data.success) {
        setFormStats(response.data.data);
        setSelectedFormId(formId);
      } else {
        console.error('❌ Form stats API returned error:', response.data.message);
      }
    } catch (error) {
      console.error('❌ Error fetching form stats:', error);
      Swal.fire('Error', 'Failed to fetch form statistics', 'error');
    }
  };

  const handleExportAnalytics = async () => {
    try {
      const params = new URLSearchParams();
      if (dateRange.start_date) params.append('start_date', dateRange.start_date);
      if (dateRange.end_date) params.append('end_date', dateRange.end_date);

      const response = await api.get(`/form-analytics/export/analytics?${params}`);
      if (response.data.success) {
        const data = response.data.data.submissions;
        if (data.length === 0) {
          Swal.fire('Info', 'No data found for the selected date range', 'info');
          return;
        }

        // Create and download CSV file
        const headers = Object.keys(data[0]);
        const csvContent = [
          headers.join(','),
          ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `form_analytics_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        Swal.fire('Success', 'Analytics data exported successfully', 'success');
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
      Swal.fire('Error', 'Failed to export analytics data', 'error');
    }
  };

  const StatCard = ({ title, value, icon: Icon, color = 'blue', subtitle = '' }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg bg-${color}-100`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  const ProgressBar = ({ percentage, color = 'blue' }) => (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`bg-${color}-600 h-2 rounded-full transition-all duration-300`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <p className="text-center text-gray-600 mt-4">Loading analytics data...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {selectedForm ? `Analytics - ${selectedForm.title}` : 'Form Analytics'}
            </h1>
            <p className="text-gray-600 mt-2">
              {selectedForm ? 'Detailed analytics for this form' : 'Track form performance and student engagement'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={dateRange.start_date}
                onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Start Date"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.end_date}
                onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="End Date"
              />
            </div>
            <button
              onClick={handleExportAnalytics}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </button>
          </div>
        </div>
      </div>


      {/* Overview Stats - Only show when no specific form is selected */}
      {!selectedForm && overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Forms"
            value={overview.total_forms}
            icon={FileText}
            color="blue"
          />
          <StatCard
            title="Active Forms"
            value={overview.active_forms}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title="Total Submissions"
            value={overview.total_submissions}
            icon={BarChart3}
            color="purple"
          />
          <StatCard
            title="Unique Students"
            value={overview.unique_students}
            icon={Users}
            color="indigo"
            subtitle={`${overview.recent_submissions} in last 30 days`}
          />
        </div>
      )}

      {/* Completion Rates and Form Selection - Only show when no specific form is selected */}
      {!selectedForm && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Completion Rates */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Form Completion Rates</h2>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {completionRates.slice(0, 5).map((form, index) => (
              <div key={form.form_id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {form.form_title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {form.unique_students} / {form.total_students} students
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {form.completion_rate}%
                    </p>
                  </div>
                </div>
                <ProgressBar 
                  percentage={form.completion_rate} 
                  color={form.completion_rate >= 80 ? 'green' : form.completion_rate >= 60 ? 'yellow' : 'red'}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Form Selection */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Form Details</h2>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-3">
            {completionRates.map((form) => (
              <button
                key={form.form_id}
                onClick={() => fetchFormStats(form.form_id)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  selectedFormId === form.form_id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{form.form_title}</p>
                    <p className="text-sm text-gray-500">
                      {form.template_type.replace('_', ' ').toUpperCase()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {form.completion_rate}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {form.total_submissions} submissions
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Form Statistics */}
      {formStats && (
        <div className="mt-8 space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {formStats.form_title} - Detailed Statistics
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Submissions"
                value={formStats.statistics.total_submissions}
                icon={FileText}
                color="blue"
              />
              <StatCard
                title="Submitted"
                value={formStats.statistics.submitted_count}
                icon={CheckCircle}
                color="green"
              />
              <StatCard
                title="Drafts"
                value={formStats.statistics.draft_count}
                icon={Clock}
                color="yellow"
              />
              <StatCard
                title="Completion Rate"
                value={`${formStats.statistics.completion_rate}%`}
                icon={TrendingUp}
                color="purple"
              />
            </div>

            {/* Timeline Chart */}
            {formStats.timeline && formStats.timeline.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Submission Timeline (Last 30 Days)</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-end space-x-2 h-32">
                    {formStats.timeline.map((day, index) => (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-blue-500 rounded-t"
                          style={{ 
                            height: `${Math.max((day.count / Math.max(...formStats.timeline.map(d => d.count))) * 100, 5)}%` 
                          }}
                        />
                        <span className="text-xs text-gray-500 mt-2">
                          {new Date(day.date).getDate()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Field Statistics */}
            {formStats.field_stats && formStats.field_stats.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Field Response Analysis</h3>
                <div className="space-y-6">
                  {formStats.field_stats.map((field, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">{field.field_label}</h4>
                        <span className="text-sm text-gray-500">
                          {field.total_responses} responses
                        </span>
                      </div>
                      
                      {field.option_distribution && field.option_distribution.length > 0 && (
                        <div className="space-y-2">
                          {field.option_distribution.map((option, optIndex) => (
                            <div key={optIndex} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">{option.option}</span>
                                <span className="text-sm font-medium text-gray-900">
                                  {option.count} ({option.percentage}%)
                                </span>
                              </div>
                              <ProgressBar percentage={option.percentage} color="blue" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FormAnalytics;
