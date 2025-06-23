import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { useNotification } from '../../contexts/NotificationContext'
import Header from '../../components/common/Header'
import Sidebar from '../../components/common/Sidebar'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import api from '../../services/api'
import { BookOpen, BrainCircuit, Award, Calendar } from 'lucide-react'

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

  const getModuleIcon = (moduleName) => {
    switch (moduleName) {
      case 'Grammar':
        return <BrainCircuit size={16} className="text-indigo-600" />
      case 'Vocabulary':
        return <BookOpen size={16} className="text-green-600" />
      default:
        return <Award size={16} className="text-blue-600" />
    }
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                View your completed practice tests and detailed results
              </p>
            </motion.div>

            <div className="bg-white rounded-lg shadow-md p-6">
              {results.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No completed tests</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Start practicing to see your test history here.
                  </p>
                  <div className="mt-6">
                    <Link
                      to="/student/practice"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Start Practicing
                    </Link>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Responsive Table for Desktop, Cards for Mobile */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Test Details
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Module
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Score
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Performance
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {results.map((result) => (
                          <tr key={result._id} className="hover:bg-indigo-50 transition">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{result.test_name}</div>
                              <div className="text-sm text-gray-500">
                                {result.correct_answers} of {result.total_questions} correct
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {getModuleIcon(result.module_name)}
                                <span className="ml-2 text-sm text-gray-900">{result.module_name}</span>
                              </div>
                              {result.subcategory && (
                                <div className="text-sm text-gray-500 mt-1">
                                  {result.subcategory}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-lg font-bold ${getScoreColor(result.average_score)}`}>
                                {result.average_score.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                  <div
                                    className={`h-2 rounded-full ${
                                      result.average_score >= 80 ? 'bg-green-500' :
                                      result.average_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${result.average_score}%` }}
                                  />
                                </div>
                                <span className="text-sm text-gray-500">
                                  {result.average_score >= 80 ? 'Excellent' :
                                   result.average_score >= 60 ? 'Good' : 'Needs Improvement'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {new Date(result.submitted_at).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-400">
                                {new Date(result.submitted_at).toLocaleTimeString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <Link
                                to={`/student/test-result/${result._id}`}
                                className="text-indigo-600 hover:text-indigo-900 font-medium"
                              >
                                View Details
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Card layout for mobile */}
                  <div className="md:hidden grid grid-cols-2 gap-3 mt-4">
                    {results.map((result) => (
                      <div key={result._id} className="bg-white rounded-xl shadow p-3 border-l-4 border-indigo-500 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-gray-900 text-sm truncate">{result.test_name}</div>
                          <span className={`text-xs font-bold ${getScoreColor(result.average_score)}`}>{result.average_score.toFixed(0)}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-700">
                          {getModuleIcon(result.module_name)}
                          <span className="truncate">{result.module_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-auto pt-2">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(result.submitted_at).toLocaleDateString()}</span>
                        </div>
                        <div className="text-xs mt-1">
                          <Link
                            to={`/student/test-result/${result._id}`}
                            className="text-indigo-600 hover:text-indigo-900 font-medium"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default TestHistory 