import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Copy, 
  Eye, 
  Download,
  ToggleLeft,
  ToggleRight,
  BarChart3,
  Users,
  Calendar,
  X,
  ArrowLeft,
  FormInput,
  ClipboardList,
  TrendingUp
} from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import FormBuilder from './FormBuilder';
import FormAnalytics from './FormAnalytics';

const FormManagement = () => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [templateFilter, setTemplateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalForms, setTotalForms] = useState(0);
  const [selectedForms, setSelectedForms] = useState([]);
  const navigate = useNavigate();

  // View state management
  const [currentView, setCurrentView] = useState('management'); // 'management', 'builder', 'analytics'
  const [selectedFormForAnalytics, setSelectedFormForAnalytics] = useState(null);
  const [editingFormId, setEditingFormId] = useState(null);

  useEffect(() => {
    fetchForms();
  }, [currentPage, searchTerm, statusFilter, templateFilter]);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (templateFilter) params.append('template_type', templateFilter);

      const response = await api.get(`/forms/?${params}`);
      if (response.data.success) {
        setForms(response.data.data.forms);
        setTotalPages(response.data.data.pagination.pages);
        setTotalForms(response.data.data.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching forms:', error);
      Swal.fire('Error', 'Failed to fetch forms', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteForm = async (formId, formTitle) => {
    const result = await Swal.fire({
      title: 'Delete Form',
      text: `Are you sure you want to delete "${formTitle}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        const response = await api.delete(`/forms/${formId}`);
        if (response.data.success) {
          Swal.fire('Deleted!', 'Form has been deleted.', 'success');
          fetchForms();
        }
      } catch (error) {
        console.error('Error deleting form:', error);
        Swal.fire('Error', 'Failed to delete form', 'error');
      }
    }
  };

  const handleToggleStatus = async (formId, currentStatus) => {
    try {
      const response = await api.patch(`/forms/${formId}/toggle-status`);
      if (response.data.success) {
        Swal.fire('Success', `Form ${response.data.data.isActive ? 'activated' : 'deactivated'} successfully`, 'success');
        fetchForms();
      }
    } catch (error) {
      console.error('Error toggling form status:', error);
      Swal.fire('Error', 'Failed to toggle form status', 'error');
    }
  };

  const handleDuplicateForm = async (formId) => {
    try {
      const response = await api.post(`/forms/${formId}/duplicate`);
      if (response.data.success) {
        Swal.fire('Success', 'Form duplicated successfully', 'success');
        fetchForms();
      }
    } catch (error) {
      console.error('Error duplicating form:', error);
      Swal.fire('Error', 'Failed to duplicate form', 'error');
    }
  };

  // View management functions
  const handleCreateForm = () => {
    setEditingFormId(null);
    setCurrentView('builder');
  };

  const handleEditForm = (formId) => {
    setEditingFormId(formId);
    setCurrentView('builder');
  };

  const handleViewAnalytics = (form) => {
    setSelectedFormForAnalytics(form);
    setCurrentView('analytics');
  };

  const handleBackToManagement = () => {
    setCurrentView('management');
    setSelectedFormForAnalytics(null);
    setEditingFormId(null);
  };

  const handleFormSaved = () => {
    setCurrentView('management');
    setEditingFormId(null);
    fetchForms(); // Refresh the forms list
  };

  const handleExportSubmissions = async (formId, formTitle) => {
    try {
      const response = await api.get(`/form-submissions/admin/export/${formId}`);
      if (response.data.success) {
        // Create and download CSV file
        const data = response.data.data.submissions;
        if (data.length === 0) {
          Swal.fire('Info', 'No submissions found for this form', 'info');
          return;
        }

        const headers = Object.keys(data[0]);
        const csvContent = [
          headers.join(','),
          ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${formTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_submissions.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        Swal.fire('Success', 'Submissions exported successfully', 'success');
      }
    } catch (error) {
      console.error('Error exporting submissions:', error);
      Swal.fire('Error', 'Failed to export submissions', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedForms.length === 0) {
      Swal.fire('Info', 'Please select forms to delete', 'info');
      return;
    }

    const result = await Swal.fire({
      title: 'Delete Multiple Forms',
      text: `Are you sure you want to delete ${selectedForms.length} form(s)? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete them!'
    });

    if (result.isConfirmed) {
      try {
        const deletePromises = selectedForms.map(formId => 
          api.delete(`/forms/${formId}`)
        );
        await Promise.all(deletePromises);
        
        Swal.fire('Deleted!', 'Selected forms have been deleted.', 'success');
        setSelectedForms([]);
        fetchForms();
      } catch (error) {
        console.error('Error deleting forms:', error);
        Swal.fire('Error', 'Failed to delete some forms', 'error');
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

  const getStatusBadge = (isActive) => {
    return isActive ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Active
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Inactive
      </span>
    );
  };

  const getTemplateBadge = (templateType) => {
    const colors = {
      custom: 'bg-blue-100 text-blue-800',
      student_info: 'bg-green-100 text-green-800',
      feedback: 'bg-yellow-100 text-yellow-800',
      survey: 'bg-purple-100 text-purple-800',
      registration: 'bg-indigo-100 text-indigo-800',
      contact: 'bg-pink-100 text-pink-800'
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[templateType] || colors.custom}`}>
        {templateType.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  // Render different views based on currentView state
  if (currentView === 'builder') {
    return (
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center">
            <button
              onClick={handleBackToManagement}
              className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {editingFormId ? 'Edit Form' : 'Create Form'}
              </h1>
              <p className="text-gray-600 mt-2">
                {editingFormId ? 'Edit your form configuration' : 'Build dynamic forms for student submissions'}
              </p>
            </div>
          </div>
        </div>
        <FormBuilder 
          editingFormId={editingFormId}
          onFormSaved={handleFormSaved}
          onCancel={handleBackToManagement}
        />
      </div>
    );
  }

  if (currentView === 'analytics') {
    return (
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center">
            <button
              onClick={handleBackToManagement}
              className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Form Analytics</h1>
              <p className="text-gray-600 mt-2">
                {selectedFormForAnalytics ? `Analytics for "${selectedFormForAnalytics.title}"` : 'Form performance and insights'}
              </p>
            </div>
          </div>
        </div>
        <FormAnalytics 
          selectedForm={selectedFormForAnalytics}
          onBack={handleBackToManagement}
        />
      </div>
    );
  }

  // Default management view
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Form Management</h1>
            <p className="text-gray-600 mt-2">Manage and monitor all forms</p>
          </div>
          <button
            onClick={handleCreateForm}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Form
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Forms
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title or description..."
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Type
            </label>
            <select
              value={templateFilter}
              onChange={(e) => setTemplateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Templates</option>
              <option value="custom">Custom</option>
              <option value="student_info">Student Info</option>
              <option value="feedback">Feedback</option>
              <option value="survey">Survey</option>
              <option value="registration">Registration</option>
              <option value="contact">Contact</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setTemplateFilter('');
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
      {selectedForms.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">
              {selectedForms.length} form(s) selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={handleBulkDelete}
                className="flex items-center px-3 py-1 text-sm text-red-700 bg-red-100 rounded-md hover:bg-red-200"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forms Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : forms.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <BarChart3 className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No forms found</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first form</p>
            <button
              onClick={() => navigate('/superadmin/form-builder')}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mx-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Form
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedForms.length === forms.length && forms.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedForms(forms.map(form => form._id));
                        } else {
                          setSelectedForms([]);
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Form Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Template
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fields
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {forms.map((form) => (
                  <tr key={form._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedForms.includes(form._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedForms([...selectedForms, form._id]);
                          } else {
                            setSelectedForms(selectedForms.filter(id => id !== form._id));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{form.title}</div>
                        <div className="text-sm text-gray-500">{form.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getTemplateBadge(form.template_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(form.settings.isActive)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {form.fields.length} fields
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(form.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewAnalytics(form)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Analytics"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/superadmin/form-submissions/${form._id}`)}
                          className="text-green-600 hover:text-green-900"
                          title="View Submissions"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleExportSubmissions(form._id, form.title)}
                          className="text-orange-600 hover:text-orange-900"
                          title="Export Submissions"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(form._id, form.settings.isActive)}
                          className={form.settings.isActive ? "text-yellow-600 hover:text-yellow-900" : "text-green-600 hover:text-green-900"}
                          title={form.settings.isActive ? "Deactivate" : "Activate"}
                        >
                          {form.settings.isActive ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDuplicateForm(form._id)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Duplicate Form"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditForm(form._id)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit Form"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteForm(form._id, form.title)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Form"
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
                <span className="font-medium">{Math.min(currentPage * 10, totalForms)}</span> of{' '}
                <span className="font-medium">{totalForms}</span> results
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

export default FormManagement;
