import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { useNotification } from '../../contexts/NotificationContext'
import Header from '../../components/common/Header'
import Sidebar from '../../components/common/Sidebar'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import api from '../../services/api'

const CourseAdminDashboard = () => {
  const { user } = useAuth()
  const { success, error } = useNotification()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/course-admin/dashboard')
      setStats(response.data.data)
    } catch (err) {
      error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Sidebar />
      
      <div className="lg:pl-64">
        <main className="py-4 sm:py-6">
          <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6"
            >
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center sm:text-left">
                Course Dashboard
              </h1>
              <p className="mt-2 text-gray-600 text-center sm:text-left">
                Welcome back, {user?.name}! Here's your course overview.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 w-full max-w-xs mx-auto mb-2">
                <div className="flex items-center">
                  <div className="bg-blue-500 rounded-lg p-3 text-white text-2xl">
                    👥
                  </div>
                  <div className="ml-4">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Total Students</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {stats?.statistics?.total_students || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 w-full max-w-xs mx-auto mb-2">
                <div className="flex items-center">
                  <div className="bg-green-500 rounded-lg p-3 text-white text-2xl">
                    📝
                  </div>
                  <div className="ml-4">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Tests Completed</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">156</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 w-full max-w-xs mx-auto mb-2">
                <div className="flex items-center">
                  <div className="bg-purple-500 rounded-lg p-3 text-white text-2xl">
                    📊
                  </div>
                  <div className="ml-4">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">Average Score</p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">82%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default CourseAdminDashboard 