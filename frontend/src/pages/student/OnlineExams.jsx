import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Header from '../../components/common/Header'
import Sidebar from '../../components/common/Sidebar'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import api from '../../services/api'

const OnlineExams = () => {
  const [loading, setLoading] = useState(true)
  const [exams, setExams] = useState([])

  useEffect(() => {
    fetchExams()
  }, [])

  const fetchExams = async () => {
    try {
      setLoading(true)
      const response = await api.get('/student/online-exams')
      setExams(response.data.data)
    } catch (err) {
      setExams([])
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
        <main className="py-6">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <h1 className="text-3xl font-bold text-gray-900">
                Online Exams
              </h1>
              <p className="mt-2 text-gray-600">
                View and start your scheduled online exams
              </p>
            </motion.div>
            <div className="bg-white rounded-lg shadow-md p-6">
              {exams.length === 0 ? (
                <p className="text-gray-600">No online exams available.</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {exams.map((exam) => (
                    <li key={exam.id} className="py-4 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">{exam.name}</h2>
                        <p className="text-sm text-gray-600">{exam.date} • {exam.duration} min</p>
                      </div>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                        Start Exam
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default OnlineExams 