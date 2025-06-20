import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../contexts/AuthContext'
import { useNotification } from '../../contexts/NotificationContext'
import Header from '../../components/common/Header'
import SuperAdminSidebar from '../../components/common/SuperAdminSidebar'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import api from '../../services/api'
import { Upload, Plus, Trash2, Play, Pause, Volume2, Edit } from 'lucide-react'

const TestManagement = () => {
  const { user } = useAuth()
  const { success, error } = useNotification()
  const [loading, setLoading] = useState(false)
  const [testData, setTestData] = useState(null)
  const [uploadMethod, setUploadMethod] = useState('manual') // 'manual' or 'csv'
  const [questions, setQuestions] = useState([{ question: '', instructions: '' }])
  const [csvFile, setCsvFile] = useState(null)
  const [previewAudio, setPreviewAudio] = useState(null)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm()

  const watchModule = watch('module_id')
  const watchLevel = watch('level_id')
  const watchAccent = watch('accent')
  const watchSpeed = watch('speed')

  useEffect(() => {
    fetchTestData()
  }, [])

  const fetchTestData = async () => {
    try {
      setLoading(true)
      const response = await api.get('/test-management/get-test-data')
      setTestData(response.data.data)
    } catch (err) {
      error('Failed to load test data')
    } finally {
      setLoading(false)
    }
  }

  const addQuestion = () => {
    if (questions.length < 50) {
      setQuestions([...questions, { question: '', instructions: '' }])
    }
  }

  const removeQuestion = (index) => {
    if (questions.length > 1) {
      const newQuestions = questions.filter((_, i) => i !== index)
      setQuestions(newQuestions)
    }
  }

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...questions]
    newQuestions[index][field] = value
    setQuestions(newQuestions)
  }

  const handleCsvUpload = (event) => {
    const file = event.target.files[0]
    if (file && file.type === 'text/csv') {
      setCsvFile(file)
      setUploadMethod('csv')
    } else {
      error('Please upload a valid CSV file')
    }
  }

  const generatePreviewAudio = async (text) => {
    if (!text.trim()) return

    try {
      setIsGeneratingAudio(true)
      // This would call the backend to generate audio
      const response = await api.post('/test-management/generate-preview-audio', {
        text,
        accent: watchAccent || 'en',
        speed: watchSpeed || 1.0
      })
      
      setPreviewAudio(response.data.audio_url)
    } catch (err) {
      error('Failed to generate preview audio')
    } finally {
      setIsGeneratingAudio(false)
    }
  }

  const onSubmit = async (data) => {
    try {
      setLoading(true)
      
      const formData = new FormData()
      formData.append('test_name', data.test_name)
      formData.append('module_id', data.module_id)
      formData.append('level_id', data.level_id)
      formData.append('accent', data.accent)
      formData.append('speed', data.speed)
      formData.append('max_attempts', data.max_attempts)
      formData.append('campus_ids', JSON.stringify(data.campus_ids || []))
      formData.append('course_ids', JSON.stringify(data.course_ids || []))
      formData.append('batch_ids', JSON.stringify(data.batch_ids || []))

      if (uploadMethod === 'csv' && csvFile) {
        formData.append('csv_file', csvFile)
      } else {
        formData.append('questions', JSON.stringify(questions))
      }

      const response = await api.post('/test-management/upload-practice-test', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      success('Practice test uploaded successfully!')
      // Reset form
      setQuestions([{ question: '', instructions: '' }])
      setCsvFile(null)
      setUploadMethod('manual')
    } catch (err) {
      error(err.response?.data?.message || 'Failed to upload practice test')
    } finally {
      setLoading(false)
    }
  }

  const getMaxAttempts = () => {
    switch (watchLevel) {
      case 'beginner':
        return 3
      case 'intermediate':
        return 2
      case 'advanced':
        return 1
      default:
        return 3
    }
  }

  if (loading && !testData) {
    return <LoadingSpinner size="lg" />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SuperAdminSidebar />
      <div className="flex-1 lg:pl-64">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900">
              Practice Test Management
            </h1>
            <p className="mt-2 text-gray-600">
              Create and upload practice tests for students
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Practice Tests</h2>
              <button className="flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-1" /> Add Test
              </button>
            </div>
            <ul className="divide-y divide-gray-200">
              {[{id: 1, name: 'Listening Beginner'}, {id: 2, name: 'Speaking Advanced'}].map((test) => (
                <li key={test.id} className="py-3 flex items-center justify-between">
                  <span>{test.name}</span>
                  <div className="flex space-x-2">
                    <button className="p-1 text-blue-600 hover:text-blue-800"><Edit className="h-4 w-4" /></button>
                    <button className="p-1 text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default TestManagement 