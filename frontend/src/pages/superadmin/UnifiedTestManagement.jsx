import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  PlayIcon,
  PauseIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';
import Swal from 'sweetalert2';
import api from '../../services/api';
import TestCreationWizard from '../../components/unified-test/TestCreationWizard';

const UnifiedTestManagement = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  // Fetch unified tests
  const fetchTests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/unified-test-management/unified-tests');
      
      if (response.data.success) {
        setTests(response.data.tests || []);
      } else {
        throw new Error(response.data.message || 'Failed to fetch tests');
      }
    } catch (error) {
      console.error('Error fetching unified tests:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to fetch unified tests'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  // Wizard handlers
  const handleWizardClose = () => {
    setShowWizard(false);
  };

  const handleWizardSave = (testId) => {
    setShowWizard(false);
    fetchTests(); // Refresh the tests list
    Swal.fire({
      icon: 'success',
      title: 'Success!',
      text: 'Unified test created successfully',
      confirmButtonText: 'OK'
    });
  };

  // Filter tests by status
  const filteredTests = tests.filter(test => {
    if (filterStatus === 'all') return true;
    return test.status === filterStatus;
  });

  // Handle test status change
  const handleStatusChange = async (testId, newStatus) => {
    try {
      const response = await api.put(`/unified-test-management/unified-tests/${testId}`, {
        status: newStatus
      });

      if (response.data.success) {
        await fetchTests();
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: `Test ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`
        });
      } else {
        throw new Error(response.data.message || 'Failed to update test status');
      }
    } catch (error) {
      console.error('Error updating test status:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.message || 'Failed to update test status'
      });
    }
  };

  // Handle test deletion
  const handleDeleteTest = async (testId, testName) => {
    const result = await Swal.fire({
      title: 'Delete Unified Test',
      html: `
        <div class="text-left">
          <p class="mb-4">Are you sure you want to delete this unified test?</p>
          <div class="bg-gray-100 p-4 rounded-lg">
            <p><strong>Test Name:</strong> ${testName}</p>
            <p class="text-red-600"><strong>This action cannot be undone!</strong></p>
          </div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete Test',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        const response = await api.delete(`/unified-test-management/unified-tests/${testId}`);

        if (response.data.success) {
          await fetchTests();
          Swal.fire({
            icon: 'success',
            title: 'Deleted',
            text: 'Unified test deleted successfully'
          });
        } else {
          throw new Error(response.data.message || 'Failed to delete test');
        }
      } catch (error) {
        console.error('Error deleting test:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to delete test'
        });
      }
    }
  };

  // Get status badge styling
  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', text: 'Draft' },
      active: { color: 'bg-green-100 text-green-800', text: 'Active' },
      completed: { color: 'bg-blue-100 text-blue-800', text: 'Completed' },
      archived: { color: 'bg-yellow-100 text-yellow-800', text: 'Archived' }
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Unified Test Management</h1>
          <p className="text-gray-600">Create and manage comprehensive tests with multiple sections and question types</p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Create Unified Test</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Tests</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Tests Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Test Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sections
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Questions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTests.map((test) => (
                <tr key={test._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{test.test_name}</div>
                      <div className="text-sm text-gray-500">{test.test_description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {test.total_sections || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {test.total_questions || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {test.total_time_minutes || 0} min
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(test.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(test.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => {/* TODO: View test details */}}
                      className="text-blue-600 hover:text-blue-900"
                      title="View Details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingTest(test)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="Edit Test"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    {test.status === 'draft' && (
                      <button
                        onClick={() => handleStatusChange(test._id, 'active')}
                        className="text-green-600 hover:text-green-900"
                        title="Activate Test"
                      >
                        <PlayIcon className="h-4 w-4" />
                      </button>
                    )}
                    {test.status === 'active' && (
                      <button
                        onClick={() => handleStatusChange(test._id, 'draft')}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Deactivate Test"
                      >
                        <PauseIcon className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteTest(test._id, test.test_name)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete Test"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTests.length === 0 && (
          <div className="text-center py-12">
            <ArchiveBoxIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No unified tests</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filterStatus === 'all' 
                ? 'Get started by creating a new unified test.'
                : `No tests found with status "${filterStatus}".`
              }
            </p>
            {filterStatus === 'all' && (
              <div className="mt-6">
                <button
                  onClick={() => setShowWizard(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Unified Test
                </button>
              </div>
            )}
          </div>
        )}
      </div>


      {/* Test Creation Wizard */}
      {showWizard && (
        <TestCreationWizard
          onClose={handleWizardClose}
          onSave={handleWizardSave}
        />
      )}
    </div>
  );
};

export default UnifiedTestManagement;
