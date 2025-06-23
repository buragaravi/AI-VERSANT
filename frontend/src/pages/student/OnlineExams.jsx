import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Header from '../../components/common/Header'
import Sidebar from '../../components/common/Sidebar'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import api from '../../services/api'
import { useNotification } from '../../contexts/NotificationContext'
import { BookText, FileText, AlertTriangle } from 'lucide-react'

const OnlineExams = () => {
  const [loading, setLoading] = useState(true)
  const [exams, setExams] = useState([])
  const { error: showError } = useNotification()

  useEffect(() => {
    const fetchExams = async () => {
      try {
        setLoading(true)
        const response = await api.get('/student/online-exams')
        setExams(response.data.data)
      } catch (err) {
        showError('Failed to load online exams. Please try again later.')
        setExams([])
      } finally {
        setLoading(false)
      }
    }
    fetchExams()
  }, [showError])

  const handleStartExam = (examId) => {
    // This would navigate to the exam taking page, e.g., /student/exam/{examId}
    showError("The exam taking feature is not yet implemented.")
    console.log("Attempting to start exam:", examId)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 lg:pl-64">
        <Header />
        <main className="px-6 lg:px-10 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold text-gray-800">Online Exams</h1>
            <p className="mt-2 text-gray-500">
              View and start your scheduled online exams.
            </p>
          </motion.div>
          
          <div className="mt-8">
            {loading ? (
              <LoadingSpinner />
            ) : exams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {exams.map((exam) => (
                  <motion.div
                    key={exam._id}
                    whileHover={{ scale: 1.05, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
                    className="bg-white p-6 rounded-2xl shadow-lg cursor-pointer flex flex-col justify-between"
                    onClick={() => handleStartExam(exam._id)}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                          {exam.module_name}
                        </span>
                        <span className="text-xs font-medium text-gray-500">{exam.level_name}</span>
                      </div>
                      <h2 className="text-xl font-bold text-gray-800 mb-2">{exam.name}</h2>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        {exam.question_count} Questions
                      </p>
                       <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
                        Start Exam
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16 px-6 bg-white rounded-2xl shadow-lg"
              >
                <div className="mx-auto bg-gray-100 h-20 w-20 flex items-center justify-center rounded-full">
                  <FileText className="h-12 w-12 text-gray-400" />
                </div>
                <h2 className="mt-6 text-2xl font-semibold text-gray-800">No Online Exams Available</h2>
                <p className="mt-2 text-gray-500">
                  There are currently no online exams scheduled for you. Please check back later.
                </p>
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default OnlineExams 