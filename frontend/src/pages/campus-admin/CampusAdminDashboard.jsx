import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { useNotification } from '../../contexts/NotificationContext'
import Header from '../../components/common/Header'
import Sidebar from '../../components/common/Sidebar'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import api from '../../services/api'

const CampusAdminDashboard = () => {
  const { user } = useAuth()
  const { error } = useNotification()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [batchCount, setBatchCount] = useState(0)

  useEffect(() => {
    fetchDashboardStats()
    fetchBatchCount()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/campus-admin/dashboard')
      setStats(response.data.data)
    } catch (err) {
      error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const fetchBatchCount = async () => {
    try {
      const response = await api.get('/campus-admin/batches')
      setBatchCount(response.data.data?.length || 0)
    } catch (err) {
      setBatchCount(0)
    }
  }

  const dashboardCards = [
    {
      title: 'Total Students',
      value: stats?.statistics?.total_students || 0,
      icon: '🎓',
      color: 'bg-blue-500',
      link: '/campus-admin/students'
    },
    {
      title: 'Total Courses',
      value: stats?.statistics?.total_courses || 0,
      icon: '📚',
      color: 'bg-green-500',
      link: '/campus-admin/courses'
    },
    {
      title: 'Total Batches',
      value: batchCount,
      icon: '🗂️',
      color: 'bg-purple-500',
      link: '/campus-admin/batches'
    }
  ]

  const quickActions = [
    {
      title: 'Batch Management',
      description: 'Create and manage batches',
      icon: '🗂️',
      link: '/campus-admin/batches',
      color: 'bg-orange-600'
    },
    {
      title: 'Course Management',
      description: 'Add or modify courses',
      icon: '📚',
      link: '/campus-admin/courses',
      color: 'bg-green-600'
    },
    {
      title: 'Student Management',
      description: 'View and manage students',
      icon: '🎓',
      link: '/campus-admin/students',
      color: 'bg-blue-600'
    },
    {
      title: 'Results & Analytics',
      description: 'View results and analytics',
      icon: '📊',
      link: '/campus-admin/analytics',
      color: 'bg-purple-600'
    }
  ]

  if (loading) {
    return <LoadingSpinner size="lg" />
  }

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <Sidebar />
      <div className="flex-1 lg:pl-64">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          {/* Statistics Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
          >
            {dashboardCards.map((card, index) => (
              <Link
                key={index}
                to={card.link}
                className="rounded-xl bg-white border border-border shadow-md p-6 flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:border-highlight group animate-fade-in"
              >
                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${card.color} mb-4 shadow group-hover:shadow-lg transition-all duration-300`}>
                  <span className="text-white text-2xl">{card.icon}</span>
                </div>
                <p className="text-lg font-bold text-text mb-1 transition-colors duration-200 group-hover:text-highlight">{card.title}</p>
                <p className="text-3xl font-extrabold text-text mb-2 transition-colors duration-200 group-hover:text-highlight">{card.value}</p>
                <span className="text-sm text-text opacity-70 group-hover:opacity-100 transition-opacity duration-200">View All</span>
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
            <h2 className="text-xl font-semibold text-text mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {quickActions.map((action, index) => (
                <Link
                  key={index}
                  to={action.link}
                  className={`rounded-xl bg-secondary border-l-4 border-highlight shadow-md p-6 flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:border-highlight group animate-fade-in ${action.color}`}
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-highlight mb-4 shadow group-hover:shadow-lg transition-all duration-300">
                    <span className="text-buttontext text-2xl">{action.icon}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-text mb-1 transition-colors duration-200 group-hover:text-highlight">{action.title}</h3>
                  <p className="text-text text-sm opacity-80 group-hover:opacity-100 transition-opacity duration-200">{action.description}</p>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default CampusAdminDashboard 