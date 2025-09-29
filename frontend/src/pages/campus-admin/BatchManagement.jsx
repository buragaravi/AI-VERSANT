import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Eye, X, Search, User, Mail, Phone, GraduationCap } from 'lucide-react';
import api from '../../services/api';

const BatchManagement = () => {
  const { error, success } = useNotification();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', course_ids: [] });
  const [courses, setCourses] = useState([]);
  const [editingBatch, setEditingBatch] = useState(null);
  
  // Student details modal states
  const [showStudentDetails, setShowStudentDetails] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchStudents, setBatchStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [studentsLoading, setStudentsLoading] = useState(false);

  useEffect(() => {
    fetchBatches();
    fetchCourses();
  }, []);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await api.get('/campus-admin/batches');
      setBatches(res.data.data || []);
    } catch (err) {
      error('Failed to fetch batches');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await api.get('/campus-admin/courses');
      setCourses(res.data.data || []);
    } catch (err) {
      setCourses([]);
    }
  };

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCourseSelect = (e) => {
    const value = Array.from(e.target.selectedOptions, option => option.value);
    setForm({ ...form, course_ids: value });
  };

  // Student details functions
  const fetchBatchStudents = async (batchId) => {
    setStudentsLoading(true);
    try {
      const res = await api.get(`/batch-management/batch/${batchId}/students`);
      if (res.data.success) {
        setBatchStudents(res.data.data);
        setFilteredStudents(res.data.data);
        setSearchTerm('');
        
        // Find and set the selected batch
        const batch = batches.find(b => b.id === batchId);
        if (batch) {
          setSelectedBatch(batch);
        }
        
        setShowStudentDetails(true);
      }
    } catch (err) {
      error('Failed to fetch batch students');
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    
    if (term === '') {
      setFilteredStudents(batchStudents);
    } else {
      const filtered = batchStudents.filter(student => 
        student.name.toLowerCase().includes(term.toLowerCase()) ||
        student.roll_number.toLowerCase().includes(term.toLowerCase()) ||
        student.email.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredStudents(filtered);
    }
  };

  const closeStudentDetails = () => {
    setShowStudentDetails(false);
    setSelectedBatch(null);
    setBatchStudents([]);
    setFilteredStudents([]);
    setSearchTerm('');
  };

  const handleCreateOrEdit = async (e) => {
    e.preventDefault();
    try {
      if (editingBatch) {
        await api.put(`/campus-admin/batches/${editingBatch.id}`, { name: form.name });
        success('Batch updated successfully!');
      } else {
        await api.post('/campus-admin/batches', form);
        success('Batch created successfully!');
      }
      setShowModal(false);
      setForm({ name: '', course_ids: [] });
      setEditingBatch(null);
      fetchBatches();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to save batch');
    }
  };

  const handleEdit = (batch) => {
    setEditingBatch(batch);
    setForm({ name: batch.name, course_ids: batch.courses.map(c => c.id) });
    setShowModal(true);
  };

  const handleDelete = async (batchId) => {
    if (!window.confirm('Are you sure you want to delete this batch?')) return;
    try {
      await api.delete(`/campus-admin/batches/${batchId}`);
      success('Batch deleted successfully!');
      fetchBatches();
    } catch (err) {
      error('Failed to delete batch');
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-x-hidden overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-text">Batch Management</h1>
          </div>
          {loading ? (
            <LoadingSpinner size="md" />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="overflow-x-auto"
            >
              <table className="min-w-full bg-white rounded-lg shadow">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left">Batch Name</th>
                    <th className="px-4 py-2 text-left">{(batches && batches.length > 0 && batches[0].courses) ? 'Courses' : 'Campuses'}</th>
                    <th className="px-4 py-2 text-left">Students</th>
                  </tr>
                </thead>
                <tbody>
                  {(batches || []).map(batch => (
                    <tr 
                      key={batch.id} 
                      className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => fetchBatchStudents(batch.id)}
                    >
                      <td className="px-4 py-2 flex items-center">
                        <span className="flex-1">{batch.name}</span>
                        <Eye className="w-4 h-4 text-blue-500 ml-2" />
                      </td>
                      <td className="px-4 py-2">
                        {batch.courses 
                          ? batch.courses.map(c => c.name).join(', ')
                          : batch.campuses 
                            ? batch.campuses.map(c => c.name).join(', ')
                            : 'N/A'
                        }
                      </td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {batch.student_count} students
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </div>
        {/* Modal for create/edit */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <form
              className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-auto"
              onSubmit={handleCreateOrEdit}
            >
              <h2 className="text-xl font-bold mb-4">{editingBatch ? 'Edit Batch' : 'Create Batch'}</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Batch Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Courses</label>
                <select
                  multiple
                  name="course_ids"
                  value={form.course_ids}
                  onChange={handleCourseSelect}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                  onClick={() => setShowModal(false)}
                >Cancel</button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >{editingBatch ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        )}

        {/* Student Details Modal */}
        {showStudentDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedBatch?.name} - Students
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {filteredStudents.length} of {batchStudents.length} students
                  </p>
                </div>
                <button
                  onClick={closeStudentDetails}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-6 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search students by name, roll number, or email..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Students Table */}
              <div className="overflow-y-auto max-h-96">
                {studentsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <LoadingSpinner size="md" />
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center p-8">
                    <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No students found</p>
                  </div>
                ) : (
                  <table className="min-w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Roll Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Mobile
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Course
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredStudents.map((student, index) => (
                        <motion.tr
                          key={student.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold text-white">
                                  {student.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-semibold text-gray-900">
                                  {student.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-mono bg-gray-50 px-3 py-1 rounded-lg border">
                              {student.roll_number}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              <a 
                                href={`mailto:${student.email}`}
                                className="text-blue-600 hover:text-blue-800 hover:underline transition-colors flex items-center"
                              >
                                <Mail className="w-4 h-4 mr-1" />
                                {student.email}
                              </a>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {student.mobile_number ? (
                                <a 
                                  href={`tel:${student.mobile_number}`}
                                  className="text-green-600 hover:text-green-800 hover:underline transition-colors flex items-center"
                                >
                                  <Phone className="w-4 h-4 mr-1" />
                                  {student.mobile_number}
                                </a>
                              ) : (
                                <span className="text-gray-400 italic">N/A</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {student.course_name ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                  <GraduationCap className="w-3 h-3 mr-1" />
                                  {student.course_name}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">N/A</span>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchManagement; 