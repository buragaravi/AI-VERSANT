import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Papa from 'papaparse';
import api from '../../services/api';


import { Plus, Users, Upload, Download, Building, BookOpen, Trash2, Edit, Eye } from 'lucide-react';

const BatchManagement = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateBatch, setShowCreateBatch] = useState(false);
  const [showUploadStudents, setShowUploadStudents] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [showBatchDetails, setShowBatchDetails] = useState(false);
  const [batchStudents, setBatchStudents] = useState([]);
  
  // Form states
  const [campuses, setCampuses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [batchName, setBatchName] = useState('');

  const [creatingBatch, setCreatingBatch] = useState(false);
  
  // Upload states
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadingStudents, setUploadingStudents] = useState(false);
  const [previewData, setPreviewData] = useState([]);

  useEffect(() => {
    fetchBatches();
    fetchCampuses();
  }, []);

  useEffect(() => {
    if (selectedCampus) {
      fetchCoursesByCampus(selectedCampus);
    } else {
      setCourses([]);
    }
  }, [selectedCampus]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const response = await api.get('/batch-management/');
      if (response.data.success) {
        setBatches(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
      toast.error('Failed to fetch batches');
    } finally {
      setLoading(false);
    }
  };

  const fetchCampuses = async () => {
    try {
      const response = await api.get('/campus-management/campuses');
      if (response.data.success) {
        setCampuses(response.data.data);
      } else {
        toast.error(response.data.message || 'Failed to fetch campuses');
      }
    } catch (error) {
      console.error('Error fetching campuses:', error);
      toast.error('Failed to fetch campuses. Please check your backend connection.');
    }
  };

  const fetchCoursesByCampus = async (campusId) => {
    try {
      const response = await api.get(`/course-management/courses?campus_id=${campusId}`);
      if (response.data.success) {
        setCourses(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching courses by campus:', error);
      toast.error('Failed to fetch courses');
    }
  };

  const fetchBatchStudents = async (batchId) => {
    try {
      const response = await api.get(`/batch-management/batch/${batchId}/students`);
      if (response.data.success) {
        setBatchStudents(response.data.data);
        setShowBatchDetails(true);
      }
    } catch (error) {
      console.error('Error fetching batch students:', error);
      toast.error('Failed to fetch batch students');
    }
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!batchName || !selectedCampus || !selectedCourse) {
      toast.error('Please fill all required fields.');
      return;
    }
    setCreatingBatch(true);
    try {
      const response = await api.post('/batch-management/', {
        name: batchName,
        campus_ids: [selectedCampus],
        course_ids: [selectedCourse],
      });
      if (response.data.success) {
        toast.success('Batch created successfully!');
        setShowCreateBatch(false);
        setBatchName('');
        setSelectedCampus('');
        setSelectedCourse('');
        fetchBatches();
      } else {
        toast.error(response.data.message || 'Failed to create batch');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create batch');
    } finally {
      setCreatingBatch(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      toast.error('Please upload a CSV or Excel file');
      return;
    }

    setUploadFile(file);
    
    // Preview CSV file
    if (file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csv = Papa.parse(e.target.result, { header: true });
        setPreviewData(csv.data.slice(0, 5)); // Show first 5 rows
      };
      reader.readAsText(file);
    }
  };

  const handleUploadStudents = async (e) => {
    e.preventDefault();
    if (!uploadFile || !selectedBatch) {
      toast.error('Please select a file and batch');
      return;
    }

    setUploadingStudents(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('batch_id', selectedBatch.id);
      selectedBatch.courses.forEach(course => {
        formData.append('course_ids', course.id);
      });

      // Debug logging
      console.log('Uploading students with:', {
        batch_id: selectedBatch.id,
        course_ids: selectedBatch.courses.map(c => c.id),
        file_name: uploadFile.name,
        file_size: uploadFile.size
      });

      const response = await api.post('/batch-management/upload-students', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Handle both success and partial success (207 status)
      if (response.data.success || response.status === 207) {
        const createdStudents = response.data.data?.created_students || response.data.created_students || [];
        const uploadErrors = response.data.errors || [];
        
        if (createdStudents.length > 0) {
          toast.success(`Successfully uploaded ${createdStudents.length} student(s)!`);
          setShowUploadStudents(false);
          setUploadFile(null);
          setSelectedBatch(null);
          setPreviewData([]);
          fetchBatches();
        }
        
        // Show detailed error messages if any
        if (uploadErrors.length > 0) {
          const errorMessage = uploadErrors.length > 3 
            ? `${uploadErrors.slice(0, 3).join('; ')}... and ${uploadErrors.length - 3} more errors.`
            : uploadErrors.join('; ');
          toast.error(`Upload completed with errors: ${errorMessage}`);
        }
        
        // If no students were created, show general error
        if (createdStudents.length === 0) {
          toast.error('No students were uploaded. Please check your file and try again.');
        }
      } else {
        toast.error(response.data.message || 'Failed to upload students');
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      // Handle different types of errors
      if (error.response?.status === 207) {
        // Partial success - some students uploaded, some failed
        const responseData = error.response.data;
        const createdStudents = responseData.data?.created_students || responseData.created_students || [];
        const uploadErrors = responseData.errors || [];
        
        if (createdStudents.length > 0) {
          toast.success(`Partially successful: ${createdStudents.length} student(s) uploaded.`);
          setShowUploadStudents(false);
          setUploadFile(null);
          setSelectedBatch(null);
          setPreviewData([]);
          fetchBatches();
        }
        
        if (uploadErrors.length > 0) {
          const errorMessage = uploadErrors.length > 3 
            ? `${uploadErrors.slice(0, 3).join('; ')}... and ${uploadErrors.length - 3} more errors.`
            : uploadErrors.join('; ');
          toast.error(`Upload errors: ${errorMessage}`);
        }
      } else if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        // Multiple validation errors
        const errorMessages = error.response.data.errors;
        const displayMessage = errorMessages.length > 3 
          ? `${errorMessages.slice(0, 3).join('; ')}... and ${errorMessages.length - 3} more errors.`
          : errorMessages.join('; ');
        toast.error(`Validation errors: ${displayMessage}`);
      } else if (error.response?.data?.message) {
        // Single error message
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to upload students. Please check your file format and try again.');
      }
    } finally {
      setUploadingStudents(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'Student Name': 'John Doe',
        'Roll Number': '2024001',
        'Email': 'john.doe@example.com',
        'Mobile Number': '9876543210'
      },
      {
        'Student Name': 'Jane Smith',
        'Roll Number': '2024002',
        'Email': 'jane.smith@example.com',
        'Mobile Number': '9876543211'
      }
    ];

    const csv = Papa.unparse(templateData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'student_upload_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteBatch = async (batchId) => {
    if (!window.confirm('Are you sure you want to delete this batch? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.delete(`/batch-management/${batchId}`);
      if (response.data.success) {
        toast.success('Batch deleted successfully!');
        fetchBatches();
      } else {
        toast.error(response.data.message || 'Failed to delete batch');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete batch');
    }
  };

  if (loading) {
    return (
      <main className="p-6 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </main>
    );
  }

  return (
    <main className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Batch Management
              </h1>
              <p className="text-gray-600">
                Create and manage batches with student uploads
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateBatch(true)}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create New Batch
              </button>
              <button
                onClick={() => setShowUploadStudents(true)}
                className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload Students
              </button>
            </div>
          </div>
        </div>



        {/* Batches Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map((batch, index) => (
            <motion.div
              key={batch.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {batch.name}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchBatchStudents(batch.id)}
                      className="p-1 text-blue-600 hover:text-blue-700"
                      title="View Students"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedBatch(batch);
                        setShowUploadStudents(true);
                      }}
                      className="p-1 text-green-600 hover:text-green-700"
                      title="Upload Students"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteBatch(batch.id)}
                      className="p-1 text-red-600 hover:text-red-700"
                      title="Delete Batch"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Campus:</span> {batch.campuses?.map(c => c.name).join(', ') || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Course:</span> {batch.courses?.map(c => c.name).join(', ') || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Students:</span> {batch.student_count || 0}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => fetchBatchStudents(batch.id)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                  >
                    <Users className="w-4 h-4 mr-1 inline" />
                    View Students
                  </button>
                  <button
                    onClick={() => {
                      setSelectedBatch(batch);
                      setShowUploadStudents(true);
                    }}
                    className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                  >
                    <Upload className="w-4 h-4 mr-1 inline" />
                    Add Students
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {batches.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              No Batches Found
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first batch to get started with student management.
            </p>
            <button
              onClick={() => setShowCreateBatch(true)}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Batch
            </button>
          </div>
        )}

        {/* Create Batch Modal */}
        {showCreateBatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <form onSubmit={handleCreateBatch} className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full relative transform transition-all">
              <button type="button" onClick={() => setShowCreateBatch(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-600 text-2xl font-bold transition-colors">&times;</button>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Create New Batch</h2>
                <p className="text-gray-600 mt-2">Set up a new batch for student management</p>
              </div>
              
              <div className="mb-6">
                <label className="block font-semibold text-gray-700 mb-2">Batch Name *</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                  value={batchName} 
                  onChange={e => setBatchName(e.target.value)} 
                  required 
                  placeholder="e.g., 2024-2028 CSE"
                />
              </div>
              

              
              <div className="mb-6">
                <label className="block font-semibold text-gray-700 mb-2">Campus *</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
                  value={selectedCampus} 
                  onChange={e => setSelectedCampus(e.target.value)} 
                  required
                >
                  <option value="">-- Select Campus --</option>
                  {campuses.map(campus => (
                    <option key={campus.id} value={campus.id}>{campus.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="mb-6">
                <label className="block font-semibold text-gray-700 mb-2">Course *</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed" 
                  value={selectedCourse} 
                  onChange={e => setSelectedCourse(e.target.value)} 
                  required
                  disabled={!selectedCampus}
                >
                  <option value="">-- Select Course --</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowCreateBatch(false)}
                  className="px-6 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg" 
                  disabled={creatingBatch}
                >
                  {creatingBatch ? 'Creating...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Upload Students Modal */}
        {showUploadStudents && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
            <form onSubmit={handleUploadStudents} className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full relative transform transition-all">
              <button type="button" onClick={() => setShowUploadStudents(false)} className="absolute top-4 right-4 text-gray-400 hover:text-red-600 text-2xl font-bold transition-colors">&times;</button>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Upload Students</h2>
                <p className="text-gray-600 mt-2">Add students to an existing batch</p>
              </div>
              
                              {!selectedBatch && (
                  <div className="mb-6">
                    <label className="block font-semibold text-gray-700 mb-2">Select Batch *</label>
                    <select 
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200" 
                      onChange={e => {
                        const batch = batches.find(b => b.id === e.target.value);
                        setSelectedBatch(batch);
                      }}
                      required
                    >
                      <option value="">-- Select Batch --</option>
                      {batches.map(batch => (
                        <option key={batch.id} value={batch.id}>{batch.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              
              {selectedBatch && (
                <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-800 mb-2">Selected Batch: {selectedBatch.name}</h3>
                  <p className="text-sm text-green-600">
                    Campus: {selectedBatch.campuses?.map(c => c.name).join(', ')} | 
                    Course: {selectedBatch.courses?.map(c => c.name).join(', ')}
                  </p>
                </div>
              )}
              
              <div className="mb-6">
                <label className="block font-semibold text-gray-700 mb-2">Upload Student File *</label>
                <input 
                  type="file" 
                  accept=".csv,.xlsx"
                  onChange={handleFileUpload}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" 
                  required
                />
                <p className="text-sm text-gray-500 mt-2">
                  Upload CSV or Excel file with student details
                </p>
              </div>
              
              {previewData.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">File Preview (First 5 rows):</h3>
                  <div className="max-h-40 overflow-y-auto border rounded p-2 bg-gray-50">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          {Object.keys(previewData[0] || {}).map(key => (
                            <th key={key} className="text-left p-1">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.map((row, index) => (
                          <tr key={index} className="border-b">
                            {Object.values(row).map((value, i) => (
                              <td key={i} className="p-1">{value}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              <div className="mb-6">
                <button 
                  type="button" 
                  onClick={downloadTemplate}
                  className="inline-flex items-center text-blue-600 hover:text-blue-700"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Download Template
                </button>
              </div>
              
              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowUploadStudents(false)}
                  className="px-6 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg" 
                  disabled={uploadingStudents || !selectedBatch || !uploadFile}
                >
                  {uploadingStudents ? 'Uploading...' : 'Upload Students'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Batch Details Modal */}
        {showBatchDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-4xl w-full relative max-h-[80vh] overflow-y-auto">
              <button type="button" onClick={() => setShowBatchDetails(false)} className="absolute top-3 right-3 text-gray-500 hover:text-red-600 text-xl">&times;</button>
              <h2 className="text-2xl font-bold mb-6">Batch Students</h2>
              
              {batchStudents.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-4 py-2 text-left">Name</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Roll Number</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Email</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">Mobile</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchStudents.map((student, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2">{student.name}</td>
                          <td className="border border-gray-300 px-4 py-2">{student.roll_number}</td>
                          <td className="border border-gray-300 px-4 py-2">{student.email}</td>
                          <td className="border border-gray-300 px-4 py-2">{student.mobile_number || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">No students found in this batch.</p>
                </div>
              )}
              
              <div className="flex justify-end mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowBatchDetails(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
  );
};

export default BatchManagement; 