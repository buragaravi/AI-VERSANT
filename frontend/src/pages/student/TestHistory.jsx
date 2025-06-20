import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { useNotification } from '../../contexts/NotificationContext'
import Header from '../../components/common/Header'
import Sidebar from '../../components/common/Sidebar'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import api from '../../services/api'

const TestHistory = () => {
  const { user } = useAuth()
  const { error } = useNotification()
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState([])

  useEffect(() => {
    fetchTestResults()
  }, [])

  const fetchTestResults = async () => {
    try {
      setLoading(true)
      const response = await api.get('/student/test-history')
      setResults(response.data.data)
    } catch (err) {
      error('Failed to load test history')
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
                Test History
              </h1>
              <p className="mt-2 text-gray-600">
                View your completed practice tests and results
              </p>
            </motion.div>
            <div className="bg-white rounded-lg shadow-md p-6">
              {results.length === 0 ? (
                <p className="text-gray-600">No completed tests found.</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.map((result) => (
                      <tr key={result.id}>
                        <td className="px-4 py-2 whitespace-nowrap">{result.test_name}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{result.average_score}%</td>
                        <td className="px-4 py-2 whitespace-nowrap">{new Date(result.submitted_at).toLocaleString()}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <Link
                            to={`/student/test-result/${result.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            View Result
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default TestHistory 