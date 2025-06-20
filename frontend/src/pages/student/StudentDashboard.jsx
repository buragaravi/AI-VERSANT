import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { useNotification } from '../../contexts/NotificationContext'
import Header from '../../components/common/Header'
import Sidebar from '../../components/common/Sidebar'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import api from '../../services/api'

const StudentDashboard = () => {
  const { user } = useAuth()
  const { success, error } = useNotification()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/student/dashboard')
      setStats(response.data.data)
    } catch (err) {
      error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const modules = [
    { name: 'Listening', icon: '🎧', progress: 75, color: 'bg-blue-500' },
    { name: 'Speaking', icon: '🗣️', progress: 60, color: 'bg-green-500' },
    { name: 'Reading', icon: '📖', progress: 85, color: 'bg-purple-500' },
    { name: 'Writing', icon: '✍️', progress: 70, color: 'bg-orange-500' }
  ]

  if (loading) {
    return <LoadingSpinner size="lg" />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Sidebar />
      
      <div className="lg:pl-64">
        <main className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <h1 className="text-3xl font-bold text-gray-900">
                Student Dashboard
              </h1>
              <p className="mt-2 text-gray-600">
                Welcome back, {user?.name}! Ready to improve your English skills?
              </p>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
            >
              <Link
                to="/student/practice"
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border-l-4 border-blue-500"
              >
                <div className="flex items-center mb-4">
                  <div className="bg-blue-500 rounded-lg p-2 text-white text-xl">
                    📝
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Practice Tests
                </h3>
                <p className="text-gray-600 text-sm">
                  Take practice tests to improve your skills
                </p>
              </Link>

              <Link
                to="/student/exams"
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border-l-4 border-green-500"
              >
                <div className="flex items-center mb-4">
                  <div className="bg-green-500 rounded-lg p-2 text-white text-xl">
                    🎯
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Online Exams
                </h3>
                <p className="text-gray-600 text-sm">
                  Scheduled exams and assessments
                </p>
              </Link>
            </motion.div>

            {/* Progress Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white rounded-lg shadow-md p-6 mb-8"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Progress</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {modules.map((module, index) => (
                  <div key={index} className="text-center">
                    <div className={`${module.color} rounded-lg p-4 text-white text-3xl mb-3`}>
                      {module.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {module.name}
                    </h3>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className={`${module.color} h-2 rounded-full transition-all duration-300`}
                        style={{ width: `${module.progress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600">{module.progress}% Complete</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {[
                  { action: 'Completed Listening Practice Test', time: '2 hours ago', score: '85%' },
                  { action: 'Started Speaking Module', time: '1 day ago', score: 'In Progress' },
                  { action: 'Finished Reading Assessment', time: '2 days ago', score: '92%' },
                  { action: 'Submitted Writing Assignment', time: '3 days ago', score: '78%' }
                ].map((activity, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                      <span className="text-gray-900">{activity.action}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium text-gray-700">{activity.score}</span>
                      <span className="text-sm text-gray-500">{activity.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default StudentDashboard 