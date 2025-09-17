import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Eye, 
  Calendar,
  User,
  Mail,
  Phone,
  CheckCircle,
  Clock
} from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../../services/api';
import { useParams, useNavigate } from 'react-router-dom';

const SubmissionViewer = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [selectedSubmissions, setSelectedSubmissions] = useState([]);

  useEffect(() => {
    if (formId) {
      fetchForm();
      fetchSubmissions();
    }
  }, [formId, currentPage, searchTerm, statusFilter]);

  const fetchForm = async () => {
    try {
      const response = await api.get(`/forms/${formId}`);
      if (response.data.success) {
        setForm(response.data.data.form);
      }
    } catch (error) {
      console.error('Error fetching form:', error);
    }
  };

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        form_id: formId,
        page: currentPage.toString(),
        limit: '10'
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get(`/form-submissions/admin/submissions?${params}`);
      if (response.data.success) {
        console.log('📊 Admin Submissions Response:', response.data.data);
        console.log('📝 Submissions Data:', response.data.data.submissions);
        if (response.data.data.submissions.length > 0) {
          console.log('🔍 First Submission Structure:', response.data.data.submissions[0]);
          console.log('📋 Form Responses:', response.data.data.submissions[0].form_responses);
        }
        setSubmissions(response.data.data.submissions);
        setTotalPages(response.data.data.pagination.pages);
        setTotalSubmissions(response.data.data.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
      Swal.fire('Error', 'Failed to fetch submissions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubmission = async (submissionId, studentName) => {
    const result = await Swal.fire({
      title: 'Delete Submission',
      text: `Are you sure you want to delete the submission from ${studentName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const response = await api.delete(`/form-submissions/admin/submissions/${submissionId}`);
        if (response.data.success) {
          Swal.fire('Deleted!', 'Submission has been deleted.', 'success');
          fetchSubmissions();
        }
      } catch (error) {
        console.error('Error deleting submission:', error);
        Swal.fire('Error', 'Failed to delete submission', 'error');
      }
    }
  };

  const handleExportSubmissions = () => {
    try {
      if (submissions.length === 0) {
        Swal.fire('Info', 'No submissions found for this form', 'info');
        return;
      }

      // Define the exact column order as requested
      const orderedColumns = [
        'Student Roll Number',
        'Student Name',
        'Student Campus',
        'Student Course',
        'Student Batch',
        'Student Mobile',
        'Student Email'
      ];

      // Get form field columns (dynamic based on form fields)
      const formFieldColumns = form?.fields?.map(field => field.label) || [];

      // Combine all columns in the correct order
      const allColumns = [...orderedColumns, ...formFieldColumns];

      // Create CSV data with proper column order
      const csvData = submissions.map(submission => {
        const row = {};
        
        // Add student details in the correct order
        row['Student Roll Number'] = submission.student_roll_number || '';
        row['Student Name'] = submission.student_name || '';
        row['Student Campus'] = submission.student_campus || '';
        row['Student Course'] = submission.student_course || '';
        row['Student Batch'] = submission.student_batch || '';
        row['Student Mobile'] = submission.student_mobile || '';
        row['Student Email'] = submission.student_email || '';

        // Add form field responses
        if (submission.form_responses && submission.form_responses.length > 0) {
          submission.form_responses.forEach(response => {
            const fieldLabel = response.field_label || response.field_id;
            row[fieldLabel] = response.value || response.display_value || '';
          });
        }

        return row;
      });

      // Create CSV content with proper escaping
      const csvContent = [
        allColumns.join(','),
        ...csvData.map(row => 
          allColumns.map(column => {
            const value = row[column] || '';
            // Escape quotes and wrap in quotes
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');

      // Create and download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${form?.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'form'}_submissions.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      Swal.fire('Success', `Exported ${submissions.length} submissions successfully`, 'success');
    } catch (error) {
      console.error('Error exporting submissions:', error);
      Swal.fire('Error', 'Failed to export submissions', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSubmissions.length === 0) {
      Swal.fire('Info', 'Please select submissions to delete', 'info');
      return;
    }

    const result = await Swal.fire({
      title: 'Delete Multiple Submissions',
      text: `Are you sure you want to delete ${selectedSubmissions.length} submission(s)?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete them!'
    });

    if (result.isConfirmed) {
      try {
        const deletePromises = selectedSubmissions.map(submissionId => 
          api.delete(`/form-submissions/admin/submissions/${submissionId}`)
        );
        await Promise.all(deletePromises);
        
        Swal.fire('Deleted!', 'Selected submissions have been deleted.', 'success');
        setSelectedSubmissions([]);
        fetchSubmissions();
      } catch (error) {
        console.error('Error deleting submissions:', error);
        Swal.fire('Error', 'Failed to delete some submissions', 'error');
      }
    }
  };

  const handleToggleRelease = async (submissionId, studentName, currentStatus) => {
    const action = currentStatus ? 'withdraw from' : 'release to';
    const result = await Swal.fire({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Submission`,
      text: `Are you sure you want to ${action} students the submission from ${studentName}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: currentStatus ? '#f59e0b' : '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Yes, ${action}!`
    });

    if (result.isConfirmed) {
      try {
        const response = await api.patch(`/form-submissions/admin/submissions/${submissionId}/toggle-release`);
        if (response.data.success) {
          const newStatus = response.data.data.is_released_to_student;
          Swal.fire(
            'Success!', 
            `Submission ${newStatus ? 'released to' : 'withdrawn from'} students.`, 
            'success'
          );
          fetchSubmissions();
        }
      } catch (error) {
        console.error('Error toggling release status:', error);
        Swal.fire('Error', 'Failed to update release status', 'error');
      }
    }
  };

  const handleUniversalRelease = async () => {
    const result = await Swal.fire({
      title: 'Release All Submissions',
      text: `Are you sure you want to release ALL ${submissions.length} submissions to students? This action will make all submissions visible to their respective students.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, release all!'
    });

    if (result.isConfirmed) {
      try {
        const unreleasedSubmissions = submissions.filter(sub => !sub.is_released_to_student);
        const promises = unreleasedSubmissions.map(submission => 
          api.patch(`/form-submissions/admin/submissions/${submission._id}/toggle-release`)
        );
        
        await Promise.all(promises);
        
        Swal.fire(
          'Success!', 
          `All ${unreleasedSubmissions.length} submissions have been released to students.`, 
          'success'
        );
        fetchSubmissions();
      } catch (error) {
        console.error('Error releasing all submissions:', error);
        Swal.fire('Error', 'Failed to release all submissions', 'error');
      }
    }
  };

  const handleUniversalWithdraw = async () => {
    const result = await Swal.fire({
      title: 'Withdraw All Submissions',
      text: `Are you sure you want to withdraw ALL ${submissions.length} submissions from students? This action will hide all submissions from their respective students.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, withdraw all!'
    });

    if (result.isConfirmed) {
      try {
        const releasedSubmissions = submissions.filter(sub => sub.is_released_to_student);
        const promises = releasedSubmissions.map(submission => 
          api.patch(`/form-submissions/admin/submissions/${submission._id}/toggle-release`)
        );
        
        await Promise.all(promises);
        
        Swal.fire(
          'Success!', 
          `All ${releasedSubmissions.length} submissions have been withdrawn from students.`, 
          'success'
        );
        fetchSubmissions();
      } catch (error) {
        console.error('Error withdrawing all submissions:', error);
        Swal.fire('Error', 'Failed to withdraw all submissions', 'error');
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    return status === 'submitted' ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Submitted
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <Clock className="w-3 h-3 mr-1" />
        Draft
      </span>
    );
  };

  const getFieldValue = (submission, fieldId) => {
    // First try the enhanced form_responses structure
    if (submission.form_responses && submission.form_responses.length > 0) {
      const response = submission.form_responses.find(r => r.field_id === fieldId);
      if (response) {
        return response.display_value || response.value || 'N/A';
      }
    }
    
    // Fallback to old responses structure
    if (submission.responses && submission.responses.length > 0) {
      const response = submission.responses.find(r => r.field_id === fieldId);
      if (response) {
        const value = response.value;
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return value.toString();
      }
    }
    
    return 'N/A';
  };

  if (loading && !form) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/superadmin/form-management')}
              className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Form Submissions</h1>
              <p className="text-gray-600 mt-2">{form?.title}</p>
            </div>
          </div>
          <button
            onClick={handleExportSubmissions}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Students
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by student name or email..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="submitted">Submitted</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedSubmissions.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-red-800">
              {selectedSubmissions.length} submission(s) selected
            </span>
            <button
              onClick={handleBulkDelete}
              className="flex items-center px-3 py-1 text-sm text-red-700 bg-red-100 rounded-md hover:bg-red-200"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Submissions Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <User className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions found</h3>
            <p className="text-gray-500">No students have submitted this form yet.</p>
          </div>
        ) : (
          <>
            {/* Universal Release Button */}
            <div className="mb-4 flex justify-between items-center px-6 py-4 bg-gray-50 border-b">
              <div className="text-sm text-gray-600">
                {submissions.length} submission{submissions.length !== 1 ? 's' : ''} found
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleUniversalRelease}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  title="Release all submissions to students"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Release All to Students
                </button>
                <button
                  onClick={handleUniversalWithdraw}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  title="Withdraw all submissions from students"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Withdraw All from Students
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedSubmissions.length === submissions.length && submissions.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSubmissions(submissions.map(sub => sub._id));
                        } else {
                          setSelectedSubmissions([]);
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Released
                  </th>
                  {form?.fields?.slice(0, 3).map(field => (
                    <th key={field.field_id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {field.label}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {submissions.map((submission) => (
                  <tr key={submission._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedSubmissions.includes(submission._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSubmissions([...selectedSubmissions, submission._id]);
                          } else {
                            setSelectedSubmissions(selectedSubmissions.filter(id => id !== submission._id));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {submission.student_name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {submission.student_email || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-400">
                          Roll: {submission.student_roll_number || 'N/A'} | 
                          Course: {submission.student_course || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(submission.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {submission.submitted_at ? formatDate(submission.submitted_at) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {submission.is_released_to_student ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Released
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          <Clock className="w-3 h-3 mr-1" />
                          Not Released
                        </span>
                      )}
                    </td>
                    {form?.fields?.slice(0, 3).map(field => (
                      <td key={field.field_id} className="px-6 py-4 text-sm text-gray-900">
                        <div className="max-w-xs truncate">
                          {getFieldValue(submission, field.field_id)}
                        </div>
                      </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleToggleRelease(submission._id, submission.student_name, submission.is_released_to_student)}
                          className={`${
                            submission.is_released_to_student 
                              ? 'text-orange-600 hover:text-orange-900' 
                              : 'text-green-600 hover:text-green-900'
                          }`}
                          title={submission.is_released_to_student ? 'Withdraw from Students' : 'Release to Students'}
                        >
                          {submission.is_released_to_student ? (
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              Withdraw
                            </span>
                          ) : (
                            <span className="flex items-center">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Release
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => navigate(`/superadmin/submission-detail/${submission._id}`)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSubmission(submission._id, submission.student_name)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Submission"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(currentPage - 1) * 10 + 1}</span> to{' '}
                <span className="font-medium">{Math.min(currentPage * 10, totalSubmissions)}</span> of{' '}
                <span className="font-medium">{totalSubmissions}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      page === currentPage
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmissionViewer;
