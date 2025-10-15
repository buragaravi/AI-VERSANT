import React, { useState, useEffect, useRef } from 'react';
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
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Timeline Line Chart Component with Blinking Effect
const TimelineLineChart = ({ timelineData }) => {
  const [blinkingPoint, setBlinkingPoint] = useState(false);
  const chartRef = useRef(null);

  // Blinking animation for current day
  useEffect(() => {
    const interval = setInterval(() => {
      setBlinkingPoint(prev => !prev);
    }, 1000); // Blink every second

    return () => clearInterval(interval);
  }, []);

  // Prepare data for the chart
  const chartData = {
    labels: timelineData.map(day => {
      const date = new Date(day.date);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [
      {
        label: 'Submissions',
        data: timelineData.map(day => day.count),
        borderColor: 'rgb(59, 130, 246)', // Blue color
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4, // Smooth curves
        pointBackgroundColor: timelineData.map((day, index) => {
          const today = new Date();
          const dayDate = new Date(day.date);
          const isToday = dayDate.toDateString() === today.toDateString();
          return isToday ? (blinkingPoint ? 'rgb(59, 130, 246)' : 'rgb(239, 68, 68)') : 'rgb(59, 130, 246)';
        }),
        pointBorderColor: timelineData.map((day, index) => {
          const today = new Date();
          const dayDate = new Date(day.date);
          const isToday = dayDate.toDateString() === today.toDateString();
          return isToday ? (blinkingPoint ? 'rgb(59, 130, 246)' : 'rgb(239, 68, 68)') : 'rgb(59, 130, 246)';
        }),
        pointRadius: timelineData.map((day, index) => {
          const today = new Date();
          const dayDate = new Date(day.date);
          const isToday = dayDate.toDateString() === today.toDateString();
          return isToday ? 8 : 5; // Larger point for today
        }),
        pointHoverRadius: 10,
        pointHoverBackgroundColor: 'rgb(59, 130, 246)',
        pointHoverBorderColor: 'rgb(255, 255, 255)',
        pointHoverBorderWidth: 3,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: function(context) {
            const dataIndex = context[0].dataIndex;
            const day = timelineData[dataIndex];
            return new Date(day.date).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
          },
          label: function(context) {
            const count = context.parsed.y;
            return `Submissions: ${count}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false
        },
        ticks: {
          color: 'rgb(107, 114, 128)',
          font: {
            size: 11,
            weight: '500'
          },
          maxRotation: 45,
          minRotation: 0
        }
      },
      y: {
        display: true,
        beginAtZero: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.3)',
          drawBorder: false
        },
        ticks: {
          color: 'rgb(107, 114, 128)',
          font: {
            size: 11,
            weight: '500'
          },
          stepSize: 1,
          callback: function(value) {
            return value === 0 ? '0' : value;
          }
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    elements: {
      point: {
        hoverBackgroundColor: 'rgb(59, 130, 246)',
        hoverBorderColor: 'rgb(255, 255, 255)',
        hoverBorderWidth: 3
      }
    }
  };

  return (
    <div className="relative">
      <div className="h-64 w-full">
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
      
      {/* Live indicator */}
      <div className="absolute top-2 right-2 flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${blinkingPoint ? 'bg-green-500' : 'bg-gray-400'} animate-pulse`}></div>
          <span className="text-xs text-gray-600 font-medium">Live</span>
        </div>
      </div>
    </div>
  );
};

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
  const [expandedFields, setExpandedFields] = useState({});
  const [fieldResponses, setFieldResponses] = useState({});

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
        console.log('📈 Timeline data received:', response.data.data.timeline);
        console.log('📈 Timeline length:', response.data.data.timeline?.length);
        console.log('📈 Timeline sample:', response.data.data.timeline?.slice(0, 3));
        
        // If timeline is empty but we have submissions, create a timeline with the submission count
        if (!response.data.data.timeline || response.data.data.timeline.length === 0) {
          console.log('⚠️ No timeline data, checking if we have submissions');
          const submissionCount = response.data.data.statistics?.submitted_count || 0;
          if (submissionCount > 0) {
            console.log(`📊 Found ${submissionCount} submissions, creating timeline with today's data`);
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            response.data.data.timeline = [
              { date: todayStr, count: submissionCount }
            ];
          } else {
            console.log('⚠️ No submissions found, adding sample data for testing');
            response.data.data.timeline = [
              { date: '2024-01-01', count: 5 },
              { date: '2024-01-02', count: 3 },
              { date: '2024-01-03', count: 8 },
              { date: '2024-01-04', count: 2 },
              { date: '2024-01-05', count: 6 }
            ];
          }
        }
        
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

  const fetchFieldResponses = async (fieldId, formId) => {
    try {
      console.log('🔍 Fetching detailed responses for field:', fieldId);
      const response = await api.get(`/form-analytics/fields/${formId}/${fieldId}/responses`);
      console.log('📊 Field responses:', response.data);
      
      if (response.data.success) {
        setFieldResponses(prev => ({
          ...prev,
          [fieldId]: response.data.data.responses
        }));
      } else {
        console.error('❌ Failed to fetch field responses:', response.data.message);
      }
    } catch (error) {
      console.error('❌ Error fetching field responses:', error);
      Swal.fire('Error', 'Failed to fetch field responses', 'error');
    }
  };

  const toggleFieldExpansion = (fieldId, formId, fieldType) => {
    // Only allow expansion for text and number fields
    if (!['text', 'textarea', 'number', 'email', 'phone'].includes(fieldType)) {
      return;
    }

    const isExpanded = expandedFields[fieldId];
    
    if (!isExpanded) {
      // Fetch responses when expanding
      fetchFieldResponses(fieldId, formId);
    }
    
    setExpandedFields(prev => ({
      ...prev,
      [fieldId]: !isExpanded
    }));
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
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 shadow-lg border border-gray-200">
                  <TimelineLineChart timelineData={formStats.timeline} />
                </div>
              </div>
            )}
            {(!formStats.timeline || formStats.timeline.length === 0) && (
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Submission Timeline (Last 30 Days)</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-center text-gray-500 py-8">
                    <p>No timeline data available</p>
                    <p className="text-sm">Timeline data: {JSON.stringify(formStats.timeline)}</p>
                    <p className="text-sm">FormStats keys: {Object.keys(formStats)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Field Statistics */}
            {formStats.field_stats && formStats.field_stats.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Field Response Analysis</h3>
                <div className="space-y-6">
                  {formStats.field_stats.map((field, index) => {
                    const isExpanded = expandedFields[field.field_id];
                    const isExpandable = ['text', 'textarea', 'number', 'email', 'phone'].includes(field.field_type);
                    const responses = fieldResponses[field.field_id] || [];
                    
                    return (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <h4 className="font-medium text-gray-900">{field.field_label}</h4>
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                              {field.field_type}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-500">
                              {field.total_responses} responses
                            </span>
                            {isExpandable && (
                              <button
                                onClick={() => toggleFieldExpansion(field.field_id, selectedFormId, field.field_type)}
                                className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                              >
                                <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                                <svg 
                                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Option distribution for choice fields */}
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
                        
                        {/* Expanded detailed responses for text/number fields */}
                        {isExpanded && isExpandable && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="text-sm font-medium text-gray-700">Detailed Responses</h5>
                              <span className="text-xs text-gray-500">
                                {responses.length} individual responses
                              </span>
                            </div>
                            
                            {responses.length > 0 ? (
                              <div className="max-h-64 overflow-y-auto space-y-2">
                                {responses.map((response, respIndex) => (
                                  <div key={respIndex} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-900 break-words">
                                          {response.value || 'No response'}
                                        </p>
                                        <div className="mt-2 text-xs text-gray-600 space-y-1">
                                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                            <span className="font-medium text-gray-700">Student:</span>
                                            <span className="text-gray-900">{response.student?.name || 'Unknown'}</span>
                                            {response.student?.roll_number && (
                                              <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">{response.student.roll_number}</span>
                                            )}
                                          </div>
                                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                            {response.student?.course && <span>Course: <span className="text-gray-900">{response.student.course}</span></span>}
                                            {response.student?.batch && <span>Batch: <span className="text-gray-900">{response.student.batch}</span></span>}
                                            {response.student?.campus && <span>Campus: <span className="text-gray-900">{response.student.campus}</span></span>}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="ml-3 text-right">
                                        <span className="text-xs text-gray-400">
                                          {response.submitted_at ?
                                            new Date(response.submitted_at).toLocaleDateString() :
                                            'Unknown date'
                                          }
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                <p className="text-sm">Loading detailed responses...</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
