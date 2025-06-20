import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Download, Upload, X, Check, AlertCircle, BarChart } from 'lucide-react'
import { useNotification } from '../../contexts/NotificationContext'
import Header from '../../components/common/Header'
import SuperAdminSidebar from '../../components/common/SuperAdminSidebar'
import { 
  getBatches, 
  createBatch, 
  updateBatch, 
  deleteBatch, 
  getBatchCampuses, 
  getBatchCourses 
} from '../../services/api'

const BatchManagement = () => {
  const { showNotification } = useNotification()
  const [batches, setBatches] = useState([])
  const [campuses, setCampuses] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingBatch, setEditingBatch] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    campus_ids: [],
    course_ids: []
  })
  const [errors, setErrors] = useState({})
  const [selectedCampusIds, setSelectedCampusIds] = useState([])
  const [availableCourses, setAvailableCourses] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [batchesRes, campusesRes] = await Promise.all([
        getBatches(),
        getBatchCampuses()
      ])
      
      setBatches(batchesRes.data.data || [])
      setCampuses(campusesRes.data.data || [])
    } catch (error) {
      showNotification('Error loading data', 'error')
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCoursesForCampuses = async (campusIds) => {
    if (campusIds.length === 0) {
      setAvailableCourses([])
      return
    }
    
    try {
      const response = await getBatchCourses(campusIds)
      setAvailableCourses(response.data.data || [])
    } catch (error) {
      showNotification('Error loading courses', 'error')
      console.error('Error loading courses:', error)
    }
  }

  const handleCampusSelection = (campusId) => {
    const newSelectedCampusIds = selectedCampusIds.includes(campusId)
      ? selectedCampusIds.filter(id => id !== campusId)
      : [...selectedCampusIds, campusId]
    
    setSelectedCampusIds(newSelectedCampusIds)
    setFormData(prev => ({
      ...prev,
      campus_ids: newSelectedCampusIds,
      course_ids: [] // Reset course selection when campus changes
    }))
    loadCoursesForCampuses(newSelectedCampusIds)
  }

  const handleCourseSelection = (courseId) => {
    setFormData(prev => ({
      ...prev,
      course_ids: prev.course_ids.includes(courseId)
        ? prev.course_ids.filter(id => id !== courseId)
        : [...prev.course_ids, courseId]
    }))
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Batch name is required'
    } else if (formData.name.length < 3) {
      newErrors.name = 'Batch name must be at least 3 characters'
    }
    
    if (formData.campus_ids.length === 0) {
      newErrors.campuses = 'Please select at least one campus'
    }
    
    if (formData.course_ids.length === 0) {
      newErrors.courses = 'Please select at least one course'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    try {
      if (editingBatch) {
        await updateBatch(editingBatch.id, formData)
        showNotification('Batch updated successfully', 'success')
      } else {
        await createBatch(formData)
        showNotification('Batch created successfully', 'success')
      }
      
      resetForm()
      loadData()
    } catch (error) {
      const message = error.response?.data?.message || 'Operation failed'
      showNotification(message, 'error')
    }
  }

  const handleEdit = (batch) => {
    setEditingBatch(batch)
    const campusIds = batch.campuses.map(c => c.id)
    setFormData({
      name: batch.name,
      campus_ids: campusIds,
      course_ids: batch.courses.map(c => c.id)
    })
    setSelectedCampusIds(campusIds)
    loadCoursesForCampuses(campusIds)
    setShowModal(true)
  }

  const handleDelete = async (batchId) => {
    if (!window.confirm('Are you sure you want to delete this batch?')) return
    
    try {
      await deleteBatch(batchId)
      showNotification('Batch deleted successfully', 'success')
      loadData()
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to delete batch'
      showNotification(message, 'error')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      campus_ids: [],
      course_ids: []
    })
    setSelectedCampusIds([])
    setAvailableCourses([])
    setEditingBatch(null)
    setErrors({})
    setShowModal(false)
  }

  const exportToCSV = () => {
    const headers = ['Batch Name', 'Campuses', 'Courses', 'Total Students']
    const csvData = batches.map(batch => [
      batch.name,
      batch.campuses.map(c => c.name).join(', '),
      batch.courses.map(c => c.name).join(', '),
      batch.student_count || 0
    ])
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'batches.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const importFromCSV = (event) => {
    const file = event.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target.result
      const lines = text.split('\n')
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim())
      
      // Validate headers
      const requiredHeaders = ['Batch Name', 'Campus Names', 'Course Names']
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
      
      if (missingHeaders.length > 0) {
        showNotification(`Missing required headers: ${missingHeaders.join(', ')}`, 'error')
        return
      }
      
      // Process each line
      const batchesToCreate = []
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        const values = line.split(',').map(v => v.replace(/"/g, '').trim())
        const batchName = values[headers.indexOf('Batch Name')]
        const campusNames = values[headers.indexOf('Campus Names')].split(';').map(n => n.trim())
        const courseNames = values[headers.indexOf('Course Names')].split(';').map(n => n.trim())
        
        if (batchName && campusNames.length > 0 && courseNames.length > 0) {
          batchesToCreate.push({ batchName, campusNames, courseNames })
        }
      }
      
      if (batchesToCreate.length > 0) {
        // Here you would implement the batch creation logic
        showNotification(`${batchesToCreate.length} batches ready for import`, 'success')
    }
    }
    
    reader.readAsText(file)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <SuperAdminSidebar />
        <div className="flex-1 lg:pl-64">
          <Header />
          <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SuperAdminSidebar />
      <div className="flex-1 lg:pl-64">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Batch Management</h1>
                <p className="text-gray-600 mt-2">Create and manage batches for different campuses and courses</p>
              </div>
              <div className="mt-4 md:mt-0 flex space-x-3">
                <button
                  onClick={exportToCSV}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </button>
                <label className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Import CSV
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={importFromCSV}
                  />
                </label>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Batch
                </button>
            </div>
          </div>

            {/* Batch List */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Batch Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campuses
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Courses
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Students
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
            {batches.map((batch) => (
                    <tr key={batch.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{batch.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {batch.campuses.map(campus => campus.name).join(', ')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {batch.courses.map(course => course.name).join(', ')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{batch.student_count || 0}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => handleEdit(batch)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(batch.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {batches.length === 0 && (
                <div className="text-center py-12">
                  <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No batches</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating a new batch.</p>
                  <div className="mt-6">
                    <button
                      onClick={() => setShowModal(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Batch
                    </button>
                  </div>
                </div>
              )}
                  </div>
                </div>
          </div>

        {/* Create/Edit Batch Modal */}
          {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                      {editingBatch ? 'Edit Batch' : 'Create New Batch'}
                    </h2>
                    <button
                      onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600"
                    >
                  <X className="h-6 w-6" />
                    </button>
                </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Batch Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                    Batch Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter batch name"
                    />
                    {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>

                  {/* Campus Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Campuses
                    </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {campuses.map((campus) => (
                      <label key={campus.id} className="flex items-center">
                          <input
                          type="checkbox"
                          checked={selectedCampusIds.includes(campus.id)}
                            onChange={() => handleCampusSelection(campus.id)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                        <span className="ml-2 text-sm text-gray-900">{campus.name}</span>
                        </label>
                      ))}
                    </div>
                    {errors.campuses && (
                    <p className="mt-1 text-sm text-red-600">{errors.campuses}</p>
                    )}
                  </div>

                  {/* Course Selection */}
                {availableCourses.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Courses
                      </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {availableCourses.map((course) => (
                        <label key={course.id} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.course_ids.includes(course.id)}
                                onChange={() => handleCourseSelection(course.id)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                          <span className="ml-2 text-sm text-gray-900">
                            {course.name} ({course.campus_name})
                          </span>
                            </label>
                          ))}
                        </div>
                      {errors.courses && (
                      <p className="mt-1 text-sm text-red-600">{errors.courses}</p>
                      )}
                    </div>
                  )}

                {/* Selected Courses Summary */}
                {formData.course_ids.length > 0 && (
                  <div className="bg-blue-50 p-4 rounded-md">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Selected Courses:</h4>
                    <div className="text-sm text-blue-700">
                      {availableCourses
                        .filter(course => formData.course_ids.includes(course.id))
                        .map(course => `${course.name} (${course.campus_name})`)
                        .join(', ')}
                    </div>
                  </div>
                )}

                  {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      {editingBatch ? 'Update Batch' : 'Create Batch'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
      </div>
    </div>
  )
}

export default BatchManagement 