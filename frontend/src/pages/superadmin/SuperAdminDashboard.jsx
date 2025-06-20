import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { useNotification } from '../../contexts/NotificationContext'
import Header from '../../components/common/Header'
import SuperAdminSidebar from '../../components/common/SuperAdminSidebar'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import api, { getCoursesByCampus, getCampuses } from '../../services/api'

const SuperAdminDashboard = () => {
  const { user } = useAuth()
  const { success, error } = useNotification()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeCourses, setActiveCourses] = useState(0)
  const [adminCount, setAdminCount] = useState(0)

  useEffect(() => {
    fetchDashboardStats()
    fetchActiveCourses()
    fetchAdminCount()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/superadmin/dashboard')
      setStats(response.data.data)
    } catch (err) {
      error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchActiveCourses = async () => {
    try {
      const campusesRes = await getCampuses()
      let totalCourses = 0
      for (const campus of campusesRes.data.data) {
        const coursesRes = await getCoursesByCampus(campus.id)
        totalCourses += (coursesRes.data.data?.length || 0)
      }
      setActiveCourses(totalCourses)
    } catch (e) {
      setActiveCourses(0)
    }
  }

  const fetchAdminCount = async () => {
    try {
      const campusRes = await getCampuses()
      const campuses = campusRes.data.data || []
      let adminIds = new Set()
      // Add campus admins
      campuses.forEach(c => {
        if (c.admin && c.admin.id) adminIds.add(c.admin.id)
      })
      // Add course admins
      for (const campus of campuses) {
        const courseRes = await getCoursesByCampus(campus.id)
        const courses = courseRes.data.data || []
        courses.forEach(course => {
          if (course.admin && course.admin.id) adminIds.add(course.admin.id)
        })
      }
      setAdminCount(adminIds.size)
    } catch (e) {
      setAdminCount(0)
    }
  }

  const dashboardCards = [
    {
      title: 'Total Admins',
      value: adminCount,
      icon: '👥',
      color: 'bg-blue-500',
      link: '/superadmin/users'
    },
    {
      title: 'Total Students',
      value: stats?.statistics?.total_students || 0,
      icon: '🎓',
      color: 'bg-green-500',
      link: '/superadmin/students'
    },
    {
      title: 'Total Tests',
      value: stats?.statistics?.total_tests || 0,
      icon: '📝',
      color: 'bg-purple-500',
      link: '/superadmin/tests'
    },
    {
      title: 'Active Courses',
      value: activeCourses,
      icon: '📚',
      color: 'bg-orange-500',
      link: '/superadmin/courses'
    }
  ]

  const quickActions = [
    {
      title: 'Results',
      description: 'View student results and analytics',
      icon: '📊',
      link: '/superadmin/results',
      color: 'bg-pink-600'
    },
    {
      title: 'Create Test',
      description: 'Create new practice or exam tests',
      icon: '📝',
      link: '/superadmin/tests/create',
      color: 'bg-green-600'
    },
    {
      title: 'Manage Campuses',
      description: 'Add or modify campus information',
      icon: '🏢',
      link: '/superadmin/campuses',
      color: 'bg-purple-600'
    },
    {
      title: 'Batch Creation',
      description: 'Create and manage batches',
      icon: '📊',
      link: '/superadmin/batch-creation',
      color: 'bg-orange-600'
    }
  ]

  if (loading) {
    return <LoadingSpinner size="lg" />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SuperAdminSidebar />
      <div className="flex-1 lg:pl-64">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.name}!
            </h1>
            <p className="mt-2 text-gray-600">
              Here's what's happening with your VERSANT system today.
            </p>
          </motion.div>

          {/* Statistics Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            {dashboardCards.map((card, index) => (
              <Link
                key={index}
                to={card.link}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-center">
                  <div className={`${card.color} rounded-lg p-3 text-white text-2xl`}>
                    {card.icon}
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{card.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  </div>
                </div>
              </Link>
            ))}
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  to={action.link}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border-l-4 border-blue-500"
                >
                  <div className="flex items-center mb-4">
                    <div className={`${action.color} rounded-lg p-2 text-white text-xl`}>
                      {action.icon}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {action.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {action.description}
                  </p>
                </Link>
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
                { action: 'New user registered', time: '2 minutes ago', type: 'user' },
                { action: 'Test completed by student', time: '5 minutes ago', type: 'test' },
                { action: 'New campus added', time: '1 hour ago', type: 'campus' },
                { action: 'System backup completed', time: '2 hours ago', type: 'system' }
              ].map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-gray-900">{activity.action}</span>
                  </div>
                  <span className="text-sm text-gray-500">{activity.time}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default SuperAdminDashboard 