import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNotification } from '../../contexts/NotificationContext';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../services/api';

const BatchManagement = () => {
  const { error, success } = useNotification();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', course_ids: [] });
  const [courses, setCourses] = useState([]);
  const [editingBatch, setEditingBatch] = useState(null);

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
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <Sidebar />
      <div className="flex-1 lg:pl-64">
        <Header />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-text">Batch Management</h1>
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition"
              onClick={() => { setShowModal(true); setEditingBatch(null); setForm({ name: '', course_ids: [] }); }}
            >
              + New Batch
            </button>
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
                    <th className="px-4 py-2 text-left">Courses</th>
                    <th className="px-4 py-2 text-left">Students</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map(batch => (
                    <tr key={batch.id} className="border-b">
                      <td className="px-4 py-2">{batch.name}</td>
                      <td className="px-4 py-2">{batch.courses.map(c => c.name).join(', ')}</td>
                      <td className="px-4 py-2">{batch.student_count}</td>
                      <td className="px-4 py-2 space-x-2">
                        <button
                          className="text-blue-600 hover:underline"
                          onClick={() => handleEdit(batch)}
                        >Edit</button>
                        <button
                          className="text-red-600 hover:underline"
                          onClick={() => handleDelete(batch.id)}
                        >Delete</button>
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
      </div>
    </div>
  );
};

export default BatchManagement; 