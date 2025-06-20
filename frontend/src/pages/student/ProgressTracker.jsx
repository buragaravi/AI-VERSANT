import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Header from '../../components/common/Header'
import Sidebar from '../../components/common/Sidebar'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import api from '../../services/api'

const ProgressTracker = () => {
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(null)

  useEffect(() => {
    fetchProgress()
  }, [])

  const fetchProgress = async () => {
    try {
      setLoading(true)
      const response = await api.get('/student/progress')
      setProgress(response.data.data)
    } catch (err) {
      setProgress(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" />
  }

  if (!progress) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <Sidebar />
        <div className="lg:pl-64">
          <main className="py-6">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
              <p className="text-gray-600">No progress data found.</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Sidebar />
      <div className="lg:pl-64">
        <main className="py-6">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <h1 className="text-3xl font-bold text-gray-900">
                Progress Tracker
              </h1>
              <p className="mt-2 text-gray-600">
                Track your progress across all modules
              </p>
            </motion.div>
            <div className="bg-white rounded-lg shadow-md p-6">
              {progress.modules.map((mod, idx) => (
                <div key={idx} className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">{mod.name}</h2>
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${mod.progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600">{mod.progress}% Complete</p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default ProgressTracker 