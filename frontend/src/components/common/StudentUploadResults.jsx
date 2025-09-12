import React, { useState, useEffect } from 'react';
import { 
  FaCheck, FaTimes, FaEnvelope, FaSms, FaDatabase, FaExclamationTriangle, 
  FaEye, FaEyeSlash, FaDownload, FaFilter, FaChartBar, FaUsers, 
  FaCheckCircle, FaExclamationCircle, FaTimesCircle, FaInfoCircle 
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

const StudentUploadResults = ({ results, onClose, batchId }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // all, success, error, partial
  const [sortBy, setSortBy] = useState('name'); // name, status, email, sms
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [isSendingSMS, setIsSendingSMS] = useState(false);

  // Debug state changes
  useEffect(() => {
    console.log('isSendingEmails changed to:', isSendingEmails);
  }, [isSendingEmails]);

  useEffect(() => {
    console.log('isSendingSMS changed to:', isSendingSMS);
  }, [isSendingSMS]);

  // Force re-render when state changes
  const [renderKey, setRenderKey] = useState(0);
  useEffect(() => {
    setRenderKey(prev => prev + 1);
  }, [isSendingEmails, isSendingSMS]);

  if (!results || !results.detailed_results) {
    return null;
  }

  const { detailed_results, summary, status_breakdown } = results;

  const getStatusIcon = (student) => {
    if (student.database_registered && student.email_sent && student.sms_sent) {
      return <FaCheck className="text-green-500" />;
    } else if (student.database_registered && (student.email_sent || student.sms_sent)) {
      return <FaExclamationTriangle className="text-yellow-500" />;
    } else if (student.database_registered) {
      return <FaDatabase className="text-blue-500" />;
    } else {
      return <FaTimes className="text-red-500" />;
    }
  };

  const getStatusText = (student) => {
    if (student.database_registered && student.email_sent && student.sms_sent) {
      return 'Complete Success';
    } else if (student.database_registered && (student.email_sent || student.sms_sent)) {
      return 'Partial Success';
    } else if (student.database_registered) {
      return 'Database Only';
    } else {
      return 'Failed';
    }
  };

  const getStatusColor = (student) => {
    if (student.database_registered && student.email_sent && student.sms_sent) {
      return 'bg-green-50 border-green-200';
    } else if (student.database_registered && (student.email_sent || student.sms_sent)) {
      return 'bg-yellow-50 border-yellow-200';
    } else if (student.database_registered) {
      return 'bg-blue-50 border-blue-200';
    } else {
      return 'bg-red-50 border-red-200';
    }
  };

  const filteredResults = detailed_results.filter(student => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'success') return student.database_registered && student.email_sent && student.sms_sent;
    if (filterStatus === 'partial') return student.database_registered && (student.email_sent || student.sms_sent);
    if (filterStatus === 'database_only') return student.database_registered && !student.email_sent && !student.sms_sent;
    if (filterStatus === 'error') return !student.database_registered;
    return true;
  });

  const sortedResults = [...filteredResults].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.student_name.localeCompare(b.student_name);
      case 'status':
        const statusA = getStatusText(a);
        const statusB = getStatusText(b);
        return statusA.localeCompare(statusB);
      case 'email':
        return (b.email_sent ? 1 : 0) - (a.email_sent ? 1 : 0);
      case 'sms':
        return (b.sms_sent ? 1 : 0) - (a.sms_sent ? 1 : 0);
      default:
        return 0;
    }
  });

  const exportToCSV = () => {
    const csvContent = [
      ['Student Name', 'Roll Number', 'Email', 'Mobile', 'Database', 'Email Sent', 'SMS Sent', 'Status', 'Errors'],
      ...sortedResults.map(student => [
        student.student_name,
        student.roll_number,
        student.email || 'N/A',
        student.mobile_number || 'N/A',
        student.database_registered ? 'Yes' : 'No',
        student.email_sent ? 'Yes' : 'No',
        student.sms_sent ? 'Yes' : 'No',
        getStatusText(student),
        student.errors.join('; ') || 'None'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student_upload_results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSendEmails = async () => {
    if (!batchId) {
      toast.error('No batch ID available for sending emails');
      return;
    }

    console.log('Starting email sending...');
    setIsSendingEmails(true);
    
    try {
      console.log('Making API call for emails...');
      const response = await api.post(`/batch-management/batch/${batchId}/send-emails`);
      console.log('Email API response:', response.data);
      
      if (response.data.success) {
        toast.success(response.data.message);
      } else {
        toast.error(response.data.message || 'Failed to send emails');
      }
    } catch (error) {
      console.error('Error sending emails:', error);
      toast.error('Failed to send emails. Please try again.');
    } finally {
      console.log('Setting isSendingEmails to false');
      // Use a callback to ensure state update
      setIsSendingEmails(prev => {
        console.log('Previous state was:', prev);
        return false;
      });
    }
  };

  const handleSendSMS = async () => {
    if (!batchId) {
      toast.error('No batch ID available for sending SMS');
      return;
    }

    console.log('Starting SMS sending...');
    setIsSendingSMS(true);
    
    try {
      console.log('Making API call for SMS...');
      const response = await api.post(`/batch-management/batch/${batchId}/send-sms`);
      console.log('SMS API response:', response.data);
      
      if (response.data.success) {
        toast.success(response.data.message);
      } else {
        toast.error(response.data.message || 'Failed to send SMS');
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      toast.error('Failed to send SMS. Please try again.');
    } finally {
      console.log('Setting isSendingSMS to false');
      // Use a callback to ensure state update
      setIsSendingSMS(prev => {
        console.log('Previous SMS state was:', prev);
        return false;
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div key={renderKey} className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">Student Upload Results</h3>
              <p className="text-blue-100 mt-1">
                {summary.total_students} students processed • {summary.database_registered} registered • {summary.emails_sent} emails • {summary.sms_sent} SMS
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={exportToCSV}
                className="px-3 py-1 bg-white bg-opacity-20 text-white text-sm rounded hover:bg-opacity-30 flex items-center"
              >
                <FaDownload className="mr-1" />
                Export CSV
              </button>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="px-3 py-1 bg-white bg-opacity-20 text-white text-sm rounded hover:bg-opacity-30 flex items-center"
              >
                {showDetails ? <FaEyeSlash className="mr-1" /> : <FaEye className="mr-1" />}
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 p-1"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Database Registration KPI */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 mb-1">Database Registration</p>
                  <p className="text-3xl font-bold text-blue-900">
                    {summary.database_registered}
                  </p>
                  <p className="text-sm text-blue-600">
                    of {summary.total_students} students
                  </p>
                  <div className="mt-2">
                    <div className="flex items-center">
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${summary.success_rate}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-xs font-medium text-blue-700">
                        {summary.success_rate}%
                      </span>
                    </div>
                  </div>
                </div>
                <FaDatabase className="h-12 w-12 text-blue-500 opacity-80" />
              </div>
            </div>

            {/* Email Success KPI */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 mb-1">Emails Sent</p>
                  <p className="text-3xl font-bold text-green-900">
                    {summary.emails_sent}
                  </p>
                  <p className="text-sm text-green-600">
                    {summary.email_success_rate}% success rate
                  </p>
                  <div className="mt-2">
                    <div className="flex items-center">
                      <div className="w-full bg-green-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${summary.email_success_rate}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-xs font-medium text-green-700">
                        {summary.email_success_rate}%
                      </span>
                    </div>
                  </div>
                </div>
                <FaEnvelope className="h-12 w-12 text-green-500 opacity-80" />
              </div>
            </div>

            {/* SMS Success KPI */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700 mb-1">SMS Sent</p>
                  <p className="text-3xl font-bold text-purple-900">
                    {summary.sms_sent}
                  </p>
                  <p className="text-sm text-purple-600">
                    {summary.sms_success_rate}% success rate
                  </p>
                  <div className="mt-2">
                    <div className="flex items-center">
                      <div className="w-full bg-purple-200 rounded-full h-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full" 
                          style={{ width: `${summary.sms_success_rate}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-xs font-medium text-purple-700">
                        {summary.sms_success_rate}%
                      </span>
                    </div>
                  </div>
                </div>
                <FaSms className="h-12 w-12 text-purple-500 opacity-80" />
              </div>
            </div>

            {/* Errors KPI */}
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700 mb-1">Total Errors</p>
                  <p className="text-3xl font-bold text-red-900">
                    {summary.total_errors}
                  </p>
                  <p className="text-sm text-red-600">
                    {summary.complete_failures} complete failures
                  </p>
                  <div className="mt-2">
                    <div className="flex items-center">
                      <div className="w-full bg-red-200 rounded-full h-2">
                        <div 
                          className="bg-red-600 h-2 rounded-full" 
                          style={{ width: `${(summary.total_errors / (summary.total_students * 3)) * 100}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-xs font-medium text-red-700">
                        {Math.round((summary.total_errors / (summary.total_students * 3)) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
                <FaExclamationTriangle className="h-12 w-12 text-red-500 opacity-80" />
              </div>
            </div>
          </div>

          {/* Status Breakdown */}
          {status_breakdown && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center">
                  <FaCheckCircle className="h-6 w-6 text-green-500 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Complete Success</p>
                    <p className="text-xl font-bold text-green-700">{status_breakdown.complete_success}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-center">
                  <FaExclamationCircle className="h-6 w-6 text-yellow-500 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Partial Success</p>
                    <p className="text-xl font-bold text-yellow-700">{status_breakdown.partial_success}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center">
                  <FaInfoCircle className="h-6 w-6 text-blue-500 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Database Only</p>
                    <p className="text-xl font-bold text-blue-700">{status_breakdown.database_only}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="flex items-center">
                  <FaTimesCircle className="h-6 w-6 text-red-500 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-red-900">Complete Failures</p>
                    <p className="text-xl font-bold text-red-700">{status_breakdown.complete_failures}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filters and Controls */}
        {showDetails && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <FaFilter className="text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filter by status:</span>
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All ({detailed_results.length})</option>
                  <option value="success">Complete Success ({status_breakdown?.complete_success || 0})</option>
                  <option value="partial">Partial Success ({status_breakdown?.partial_success || 0})</option>
                  <option value="database_only">Database Only ({status_breakdown?.database_only || 0})</option>
                  <option value="error">Failed ({status_breakdown?.complete_failures || 0})</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <FaChartBar className="text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Sort by:</span>
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="name">Name</option>
                  <option value="status">Status</option>
                  <option value="email">Email Status</option>
                  <option value="sms">SMS Status</option>
                </select>
              </div>
              
              <div className="text-sm text-gray-600">
                Showing {sortedResults.length} of {detailed_results.length} students
              </div>
            </div>
          </div>
        )}

        {/* Detailed Results */}
        {showDetails && (
          <div className="p-6 max-h-96 overflow-y-auto">
            <div className="space-y-3">
              {sortedResults.map((student, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getStatusColor(student)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getStatusIcon(student)}
                        <div>
                          <h4 className="font-medium text-gray-900">{student.student_name}</h4>
                          <p className="text-sm text-gray-600">
                            {student.roll_number} • {student.email || 'No email'} • {student.mobile_number || 'No mobile'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6 text-sm">
                        <div className="flex items-center">
                          <FaDatabase className={`mr-2 ${student.database_registered ? 'text-green-500' : 'text-red-500'}`} />
                          <span className={`font-medium ${student.database_registered ? 'text-green-700' : 'text-red-700'}`}>
                            Database: {student.database_registered ? 'Success' : 'Failed'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <FaEnvelope className={`mr-2 ${student.email_sent ? 'text-green-500' : 'text-gray-400'}`} />
                          <span className={`font-medium ${student.email_sent ? 'text-green-700' : 'text-gray-500'}`}>
                            Email: {student.email_sent ? 'Sent' : 'Not Sent'}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <FaSms className={`mr-2 ${student.sms_sent ? 'text-green-500' : 'text-gray-400'}`} />
                          <span className={`font-medium ${student.sms_sent ? 'text-green-700' : 'text-gray-500'}`}>
                            SMS: {student.sms_sent ? 'Sent' : 'Not Sent'}
                          </span>
                        </div>
                        {student.username && (
                          <div className="text-xs text-gray-600">
                            Username: {student.username}
                          </div>
                        )}
                      </div>
                      
                      {student.errors && student.errors.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-red-600 font-medium">Errors:</p>
                          <ul className="text-sm text-red-600 list-disc list-inside">
                            {student.errors.map((error, errorIndex) => (
                              <li key={errorIndex}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    <div className="ml-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        getStatusText(student) === 'Complete Success' ? 'bg-green-100 text-green-800' :
                        getStatusText(student) === 'Partial Success' ? 'bg-yellow-100 text-yellow-800' :
                        getStatusText(student) === 'Database Only' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {getStatusText(student)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <FaUsers className="inline mr-1" />
              Upload completed at {new Date().toLocaleString()}
            </div>
            <div className="flex space-x-3">
              {batchId && (
                <>
                  <button
                    onClick={handleSendEmails}
                    disabled={isSendingEmails}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-md flex items-center transition-colors"
                  >
                    <FaEnvelope className="mr-2" />
                    {isSendingEmails ? 'Sending...' : 'Send Emails'}
                  </button>
                  <button
                    onClick={handleSendSMS}
                    disabled={isSendingSMS}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-md flex items-center transition-colors"
                  >
                    <FaSms className="mr-2" />
                    {isSendingSMS ? 'Sending...' : 'Send SMS'}
                  </button>
                </>
              )}
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center"
              >
                <FaDownload className="mr-2" />
                Export Results
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentUploadResults;
