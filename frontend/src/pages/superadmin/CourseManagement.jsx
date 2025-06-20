import React, { useEffect, useState } from "react"
import { motion } from 'framer-motion'
import Header from '../../components/common/Header'
import SuperAdminSidebar from '../../components/common/SuperAdminSidebar'
import { Edit, Trash2, Users, ChevronRight, ChevronDown } from 'lucide-react'
import { getCourses, getBatchesForCourse, getBatchStudents } from '../../services/api'
import LoadingSpinner from '../../components/common/LoadingSpinner'

const CourseManagement = () => {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [batches, setBatches] = useState([])
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [students, setStudents] = useState([])
  const [loadingBatches, setLoadingBatches] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(false)

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true)
        const response = await getCourses()
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          setCourses(response.data.data)
        } else {
          setCourses([])
          if (response.data && !response.data.success) {
            setError(response.data.message || 'Failed to fetch courses');
          }
        }
      } catch (err) {
        setError('Failed to fetch courses')
      } finally {
        setLoading(false)
      }
    }
    fetchCourses()
  }, [])

  const handleCourseClick = async (course) => {
    if (selectedCourse && (course.id === selectedCourse.id)) {
      setSelectedCourse(null)
      setBatches([])
      setSelectedBatch(null)
      setStudents([])
      return
    }

    setSelectedCourse(course)
    setSelectedBatch(null)
    setStudents([])
    setLoadingBatches(true)
    try {
      const response = await getBatchesForCourse(course.id || course._id)
      if (response.data && response.data.success) {
        setBatches(response.data.data)
      } else {
        setBatches([])
      }
    } catch (err) {
      console.error('Failed to fetch batches:', err)
      setBatches([])
    } finally {
      setLoadingBatches(false)
    }
  }

  const handleBatchClick = async (batch) => {
    if (selectedBatch && (batch.id === selectedBatch.id)) {
      setSelectedBatch(null)
      setStudents([])
      return
    }

    setSelectedBatch(batch)
    setLoadingStudents(true)
    try {
      const response = await getBatchStudents(batch.id)
      if (response.data && response.data.success) {
        setStudents(response.data.data)
      } else {
        setStudents([])
      }
    } catch (err) {
      console.error('Failed to fetch students:', err)
      setStudents([])
    } finally {
      setLoadingStudents(false)
    }
  }

  const uniqueCourses = Array.from(new Map(courses.map(c => [(c.id || c._id), c])).values());

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SuperAdminSidebar />
      <div className="flex-1 lg:pl-64">
        <Header />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900">
              All Courses
            </h1>
            <p className="mt-2 text-gray-600">
              View all courses across campuses and manage their batches.
            </p>
          </motion.div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Course & Batch Explorer</h2>
            </div>
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <LoadingSpinner />
              </div>
            ) : error ? (
              <div className="text-red-500 text-center py-4">{error}</div>
            ) : (
              <div className="space-y-4">
                {uniqueCourses.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">No courses found.</div>
                ) : (
                  uniqueCourses.map((course) => (
                    <div key={course.id || course._id} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Course Header */}
                      <div 
                        className="p-4 cursor-pointer bg-gray-50 hover:bg-gray-100 flex items-center justify-between"
                        onClick={() => handleCourseClick(course)}
                      >
                        <div className="flex items-center space-x-3">
                          {selectedCourse && selectedCourse.id === (course.id || course._id) ? (
                            <ChevronDown className="h-5 w-5 text-gray-600" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-500" />
                          )}
                          <div>
                            <span className="font-semibold text-lg text-gray-800">{course.name}</span>
                            {course.campus && (
                              <span className="ml-4 text-sm text-gray-500">Campus: <span className="font-medium text-gray-700">{course.campus.name}</span></span>
                            )}
                            {course.admin && (
                              <span className="ml-4 text-sm text-gray-500">Admin: <span className="font-medium text-gray-700">{course.admin.name} ({course.admin.email})</span></span>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          {/* Edit/Delete buttons can be added back if needed */}
                        </div>
                      </div>

                      {/* Batches Section */}
                      {selectedCourse && selectedCourse.id === (course.id || course._id) && (
                        <div className="border-t border-gray-200 bg-white">
                          <div className="p-4">
                            <h3 className="text-md font-semibold text-gray-700 mb-3">Batches</h3>
                            {loadingBatches ? (
                              <div className="flex justify-center items-center py-4"><LoadingSpinner /></div>
                            ) : batches.length === 0 ? (
                              <div className="text-center text-gray-500 py-4 text-sm">No batches found for this course.</div>
                            ) : (
                              <div className="space-y-3">
                                {batches.map((batch) => (
                                  <div key={batch.id} className="border border-gray-200 rounded-lg bg-gray-50 overflow-hidden">
                                    {/* Batch Header */}
                                    <div 
                                      className="p-3 cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                                      onClick={() => handleBatchClick(batch)}
                                    >
                                      <div className="flex items-center space-x-3">
                                        {selectedBatch && selectedBatch.id === batch.id ? (
                                          <ChevronDown className="h-4 w-4 text-gray-600" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 text-gray-500" />
                                        )}
                                        <div>
                                          <span className="font-medium text-gray-800">{batch.name}</span>
                                          <span className="ml-3 text-sm text-gray-500">
                                            Students: {batch.student_count || 0}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Students Section */}
                                    {selectedBatch && selectedBatch.id === batch.id && (
                                      <div className="border-t border-gray-200 bg-white">
                                        <div className="p-3">
                                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Students</h4>
                                          {loadingStudents ? (
                                            <div className="flex justify-center items-center py-2"><LoadingSpinner /></div>
                                          ) : students.length === 0 ? (
                                            <div className="text-center text-gray-500 py-2 text-sm">No students found in this batch.</div>
                                          ) : (
                                            <div className="space-y-2">
                                              {students.map((student) => (
                                                <div key={student.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                                                  <div>
                                                    <span className="font-medium text-sm">{student.name}</span>
                                                    <span className="ml-3 text-xs text-gray-500">Roll: {student.roll_number}</span>
                                                    <span className="ml-3 text-xs text-gray-500">{student.email}</span>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CourseManagement
