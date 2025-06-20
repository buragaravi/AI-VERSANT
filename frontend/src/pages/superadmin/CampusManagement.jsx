import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Header from '../../components/common/Header'
import SuperAdminSidebar from '../../components/common/SuperAdminSidebar'
import { Plus, Edit, Trash2, X, ArrowLeft, User } from 'lucide-react'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import {
  getCampuses,
  getCoursesByCampus,
  createCampus,
  updateCampus,
  deleteCampus,
  createCourse,
  updateCourse,
  deleteCourse,
  getBatches,
  getBatchesForCourse,
  uploadStudentsToBatch,
  getBatchStudents,
  getStudentDetails,
  authorizeStudentLevel,
  validateStudentUpload,
} from '../../services/api'
import { useNotification } from '../../contexts/NotificationContext'
import StudentCard from '../../components/common/StudentCard';
import { useNavigate } from 'react-router-dom';
import UploadPreviewModal from '../../components/common/UploadPreviewModal';
import UploadSuccessModal from '../../components/common/UploadSuccessModal';

const initialCampusForm = {
  campus_name: '',
  admin_name: '',
  admin_email: '',
  admin_password: ''
}
const initialCourseForm = {
  course_name: '',
  admin_name: '',
  admin_email: '',
  admin_password: ''
}

const CampusManagement = () => {
  const [campuses, setCampuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState([])
  const [courseLoading, setCourseLoading] = useState(false)
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [courseForm, setCourseForm] = useState(initialCourseForm)
  const [editCourseId, setEditCourseId] = useState(null)
  const [editCourseMode, setEditCourseMode] = useState(false)
  const [showCampusModal, setShowCampusModal] = useState(false)
  const [campusForm, setCampusForm] = useState(initialCampusForm)
  const [editCampusId, setEditCampusId] = useState(null)
  const [editCampusMode, setEditCampusMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { success, error } = useNotification()
  const [batches, setBatches] = useState([])
  const [selectedCampus, setSelectedCampus] = useState(null)
  const [loadingStudents, setLoadingStudents] = useState(false);
  const navigate = useNavigate();

  // State for the new course detail view
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseBatches, setCourseBatches] = useState([]);
  const [loadingCourseBatches, setLoadingCourseBatches] = useState(false);

  // State for the new upload flow
  const [uploadPreviewData, setUploadPreviewData] = useState([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(null);
  const [activeBatch, setActiveBatch] = useState(null);

  const [studentDetails, setStudentDetails] = useState(null);
  const [batchStudents, setBatchStudents] = useState({});

  const fetchCampuses = async () => {
    setLoading(true)
    try {
      const res = await getCampuses()
      setCampuses(res.data.data)
    } catch (e) {
      error('Failed to fetch campuses')
    } finally {
      setLoading(false)
    }
  }

  const fetchCourses = async (campusId) => {
    setCourseLoading(true)
    try {
      const res = await getCoursesByCampus(campusId)
      setCourses(res.data.data)
    } catch (e) {
      error('Failed to fetch courses')
    } finally {
      setCourseLoading(false)
    }
  }

  const fetchBatches = async () => {
    try {
      const res = await getBatches()
      setBatches(res.data.data)
    } catch (e) {
      error('Failed to fetch batches')
    }
  }

  useEffect(() => {
    fetchCampuses()
    fetchBatches()
  }, [])

  // Campus CRUD
  const openAddCampusModal = () => {
    setCampusForm(initialCampusForm)
    setEditCampusMode(false)
    setShowCampusModal(true)
    setEditCampusId(null)
  }
  const openEditCampusModal = (campus) => {
    setCampusForm({
      campus_name: campus.name,
      admin_name: campus.admin?.name || '',
      admin_email: campus.admin?.email || '',
      admin_password: ''
    })
    setEditCampusMode(true)
    setShowCampusModal(true)
    setEditCampusId(campus.id)
  }
  const handleCampusChange = (e) => {
    setCampusForm({ ...campusForm, [e.target.name]: e.target.value })
  }
  const handleCampusSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editCampusMode && editCampusId) {
        await updateCampus(editCampusId, campusForm)
        success('Campus updated successfully')
      } else {
        await createCampus(campusForm)
        success('Campus created successfully')
      }
      setShowCampusModal(false)
      fetchCampuses()
    } catch (e) {
      error('Failed to save campus')
    } finally {
      setSubmitting(false)
    }
  }
  const handleDeleteCampus = async (id) => {
    if (!window.confirm('Are you sure you want to delete this campus?')) return
    try {
      await deleteCampus(id)
      success('Campus deleted successfully')
      fetchCampuses()
      setSelectedCampus(null);
    } catch (e) {
      error('Failed to delete campus')
    }
  }

  // Course CRUD
  const openAddCourseModal = () => {
    setCourseForm(initialCourseForm)
    setEditCourseMode(false)
    setShowCourseModal(true)
    setEditCourseId(null)
  }
  const openEditCourseModal = (course) => {
    setCourseForm({
      course_name: course.name,
      admin_name: course.admin?.name || '',
      admin_email: course.admin?.email || '',
      admin_password: ''
    })
    setEditCourseMode(true)
    setShowCourseModal(true)
    setEditCourseId(course.id)
  }
  const handleCourseChange = (e) => {
    setCourseForm({ ...courseForm, [e.target.name]: e.target.value })
  }
  const handleCourseSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editCourseMode && editCourseId) {
        await updateCourse(editCourseId, courseForm)
        success('Course updated successfully')
      } else {
        if (!selectedCampus || !selectedCampus.id) {
          error('No campus selected. Please go back and select a campus first.')
          setSubmitting(false)
          return
        }
        await createCourse(selectedCampus.id, courseForm)
        success('Course created successfully')
      }
      setShowCourseModal(false)
      fetchCourses(selectedCampus.id)
    } catch (e) {
      const errorMessage = e.response?.data?.message || 'Failed to save course'
      error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }
  const handleDeleteCourse = async (id) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return
    try {
      await deleteCourse(id)
      success('Course deleted successfully')
      fetchCourses(selectedCampus.id)
    } catch (e) {
      error('Failed to delete course')
    }
  }

  const handleCampusCardClick = (campus) => {
    setSelectedCampus(campus)
    fetchCourses(campus.id)
  }

  const handleBackToList = () => {
    setSelectedCampus(null)
    setSelectedCourse(null)
  }

  const handleCourseCardClick = async (course) => {
    setSelectedCourse(course);
    setLoadingCourseBatches(true);
    try {
      const res = await getBatchesForCourse(course.id);
      setCourseBatches(res.data.data);
    } catch (e) {
      error('Failed to fetch batches for course');
    } finally {
      setLoadingCourseBatches(false);
    }
  };

  const handleViewCourseBatchStudents = (batch) => {
    if (!selectedCourse) return;
    navigate(`/superadmin/students/${batch.id}?course_id=${selectedCourse.id}`);
  }

  const handleDownloadTemplate = (batch) => {
    // Generate CSV template for the batch
    const headers = ['Campus Name', 'Course Name', 'Student Name', 'Roll Number', 'Email', 'Mobile Number'];
    const rows = batch.courses.map(course => [selectedCampus.name, course.name, '', '', '', '']);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedCampus.name}_${batch.name}_students_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  const handleFileSelect = async (event, batch) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingFile(file);
    setActiveBatch(batch);
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('campus_id', selectedCampus.id);
      
      const res = await validateStudentUpload(formData);
      
      setUploadPreviewData(res.data.data);
      setIsPreviewModalOpen(true);
    } catch (e) {
      error(e.response?.data?.message || 'Failed to validate file.');
    } finally {
      setSubmitting(false);
      // Reset file input to allow re-uploading the same file
      event.target.value = null;
    }
  };

  const handleConfirmUpload = async (validStudents) => {
    if (validStudents.length === 0) {
      error("No valid students to upload.");
      return;
    }

    setSubmitting(true);
    setIsPreviewModalOpen(false);

    try {
      const res = await uploadStudentsToBatch(selectedCampus.id, activeBatch.id, validStudents);
      setUploadResults(res.data);
      setIsSuccessModalOpen(true);
      fetchBatches(); // Refresh student counts
    } catch (e) {
      error(e.response?.data?.message || 'Failed to upload students.');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleCloseSuccessModal = () => {
    setIsSuccessModalOpen(false);
    setUploadResults(null);
    setActiveBatch(null);
    setUploadingFile(null);
  };

  const copyCredentialsToClipboard = (students) => {
    if (!students || students.length === 0) return;

    const csvHeader = "Name,RollNumber,Username,Password\n";
    const csvContent = students
      .map(s => `${s.student_name},${s.roll_number},${s.username},${s.password}`)
      .join('\n');
    
    navigator.clipboard.writeText(csvHeader + csvContent)
      .then(() => success('Credentials copied to clipboard!'))
      .catch(() => error('Failed to copy credentials.'));
  };

  const handleViewStudents = (batch) => {
    navigate(`/superadmin/students/${batch.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SuperAdminSidebar />
      <div className="flex-1 lg:pl-64">
      <Header />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-lg p-8 mb-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Campus Management</h1>
                <p className="text-gray-600 mt-2">Manage campuses and their configurations.</p>
              </div>
              <button
                className="mt-4 md:mt-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                onClick={openAddCampusModal}
              >
                + Add Campus
              </button>
            </div>
            {!selectedCampus ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {campuses.length === 0 ? (
                  <div className="col-span-2 text-center text-gray-500">No campuses found.</div>
                ) : (
                  campuses.map((campus) => (
                    <div
                      key={campus.id}
                      className="bg-gray-50 rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow flex flex-col justify-between"
                      onClick={() => handleCampusCardClick(campus)}
                    >
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">{campus.name}</h2>
                        <p className="text-gray-600 text-sm mb-1">Admin: {campus.admin?.name} ({campus.admin?.email})</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div>
                <button
                  className="mb-4 flex items-center text-blue-600 hover:underline"
                  onClick={handleBackToList}
                >
                  <ArrowLeft className="h-5 w-5 mr-1" /> Back to Campus List
                </button>
                <div className="bg-blue-50 rounded-lg p-6 mb-6">
                  <h2 className="text-2xl font-bold text-blue-900 mb-2">{selectedCampus.name}</h2>
                  <p className="text-gray-700 mb-2">Admin: {selectedCampus.admin?.name} ({selectedCampus.admin?.email})</p>
                </div>
                {selectedCourse ? (
                  <motion.div
                    key="course-batches"
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                  >
                    <button onClick={() => setSelectedCourse(null)} className="flex items-center text-gray-600 hover:text-gray-900 mb-6 font-medium">
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back to Courses
                    </button>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-3xl font-bold text-gray-800">Batches for <span className="text-blue-600">{selectedCourse.name}</span></h2>
                    </div>
                    {loadingCourseBatches ? <LoadingSpinner /> : (
                        <motion.div 
                          className="space-y-4"
                          variants={{
                            visible: { transition: { staggerChildren: 0.1 } }
                          }}
                          initial="hidden"
                          animate="visible"
                        >
                            {courseBatches.length > 0 ? courseBatches.map(batch => (
                                <motion.div 
                                  key={batch.id} 
                                  className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 flex justify-between items-center border border-gray-200"
                                  variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
                                  whileHover={{ scale: 1.03, y: -5 }}
                                >
                                    <div>
                                        <p className="font-bold text-2xl text-gray-800">{batch.name}</p>
                                        <p className="text-md text-blue-600 font-semibold mt-2 flex items-center">
                                          <User className="inline-block w-5 h-5 mr-2"/>
                                          {batch.student_count} Students
                                        </p>
                                    </div>
                                    <button 
                                      onClick={() => handleViewCourseBatchStudents(batch)} 
                                      className="bg-blue-600 text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-blue-700 transform hover:scale-105 transition-all duration-300"
                                    >
                                        View Students
                                    </button>
                                </motion.div>
                            )) : (
                              <div className="text-center py-12 bg-white rounded-lg shadow-md border">
                                <h3 className="text-xl text-gray-700 font-semibold">No Batches Found</h3>
                                <p className="text-gray-500 mt-2">There are no batches assigned to this course yet.</p>
                              </div>
                            )}
                        </motion.div>
                    )}
                  </motion.div>
                ) : (
                  <>
                    {/* Courses Section */}
                    <div className="mb-8">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-gray-800">Courses</h2>
                        <button onClick={openAddCourseModal} className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 flex items-center">
                          <Plus className="w-5 h-5 mr-2" /> Add Course
                        </button>
                      </div>
                      {courseLoading ? <LoadingSpinner /> : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {courses.map(course => (
                            <div key={course.id} className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleCourseCardClick(course)}>
                              <div className="flex justify-between items-start">
                                  <div>
                                      <h3 className="font-bold text-lg text-gray-800">{course.name}</h3>
                                      <p className="text-sm text-gray-600 mt-1">Admin: {course.admin?.name || 'N/A'} ({course.admin?.email || 'N/A'})</p>
                                  </div>
                                  <div className="flex-shrink-0">
                                      <button onClick={(e) => { e.stopPropagation(); openEditCourseModal(course); }} className="text-blue-500 hover:text-blue-700 p-1"><Edit size={18}/></button>
                                      <button onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id); }} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={18}/></button>
                                  </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Assigned Batches Section */}
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800 mb-4">Assigned Batches</h2>
                      <div className="space-y-6">
                        {batches.filter(b => b.campuses.some(c => c.id === selectedCampus.id)).map(batch => (
                          <div key={batch.id} className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
                            <h3 className="text-xl font-bold text-orange-600 mb-3">{batch.name}</h3>
                            <div className="mb-4">
                              <h4 className="font-semibold text-gray-700">Courses:</h4>
                              <p className="text-gray-600">{batch.courses.map(c => c.name).join(', ')}</p>
                            </div>
                            <div className="flex justify-between items-center">
                              <p className="text-sm font-semibold text-gray-700">Students: <span className="text-blue-600 font-bold">{batchStudents[batch.id] || batch.student_count}</span></p>
                              <div className="flex space-x-2">
                                  <button onClick={() => handleDownloadTemplate(batch)} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Download Template</button>
                                  
                                  <label className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer">
                                    Upload File
                                    <input type="file" className="hidden" accept=".csv, .xlsx" onChange={(e) => handleFileSelect(e, batch)} />
                                  </label>

                                  <button onClick={() => handleViewStudents(batch)} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">View Students</button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Modal for Add/Edit Campus */}
          {showCampusModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
              <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
                <button
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowCampusModal(false)}
                >
                  <X className="h-5 w-5" />
                </button>
                <h3 className="text-xl font-semibold mb-4">{editCampusMode ? 'Edit Campus' : 'Add Campus'}</h3>
                <form onSubmit={handleCampusSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Campus Name</label>
                    <input
                      type="text"
                      name="campus_name"
                      value={campusForm.campus_name}
                      onChange={handleCampusChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Admin Name</label>
                    <input
                      type="text"
                      name="admin_name"
                      value={campusForm.admin_name}
                      onChange={handleCampusChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Admin Email</label>
                    <input
                      type="email"
                      name="admin_email"
                      value={campusForm.admin_email}
                      onChange={handleCampusChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Admin Password</label>
                    <input
                      type="password"
                      name="admin_password"
                      value={campusForm.admin_password}
                      onChange={handleCampusChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="mr-2 px-4 py-2 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                      onClick={() => setShowCampusModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                      disabled={submitting}
                    >
                      {submitting ? 'Saving...' : (editCampusMode ? 'Update' : 'Create')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal for Add/Edit Course */}
          {showCourseModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
              <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
                <button
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowCourseModal(false)}
                >
                  <X className="h-5 w-5" />
                </button>
                <h3 className="text-xl font-semibold mb-4">{editCourseMode ? 'Edit Course' : 'Add Course'}</h3>
                <form onSubmit={handleCourseSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Course Name</label>
                    <input
                      type="text"
                      name="course_name"
                      value={courseForm.course_name}
                      onChange={handleCourseChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Admin Name</label>
                    <input
                      type="text"
                      name="admin_name"
                      value={courseForm.admin_name}
                      onChange={handleCourseChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Admin Email</label>
                    <input
                      type="email"
                      name="admin_email"
                      value={courseForm.admin_email}
                      onChange={handleCourseChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Admin Password</label>
                    <input
                      type="password"
                      name="admin_password"
                      value={courseForm.admin_password}
                      onChange={handleCourseChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="mr-2 px-4 py-2 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                      onClick={() => setShowCourseModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                      disabled={submitting}
                    >
                      {submitting ? 'Saving...' : (editCourseMode ? 'Update' : 'Create')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          <UploadPreviewModal
            isOpen={isPreviewModalOpen}
            onClose={() => setIsPreviewModalOpen(false)}
            previewData={uploadPreviewData}
            onConfirm={handleConfirmUpload}
            fileName={uploadingFile?.name}
          />
          <UploadSuccessModal
            isOpen={isSuccessModalOpen}
            onClose={handleCloseSuccessModal}
            results={uploadResults}
            onCopyToClipboard={copyCredentialsToClipboard}
          />
          </div>
      </div>
    </div>
  )
}

export default CampusManagement 