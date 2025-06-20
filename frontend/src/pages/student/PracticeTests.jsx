import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { useNotification } from '../../contexts/NotificationContext'
import Header from '../../components/common/Header'
import Sidebar from '../../components/common/Sidebar'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import api from '../../services/api'
import { Play, Pause, Mic, StopCircle, Volume2, Clock, CheckCircle } from 'lucide-react'

const PracticeTests = () => {
  const { user } = useAuth()
  const { success, error } = useNotification()
  const navigate = useNavigate()
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTest, setSelectedTest] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [isTestStarted, setIsTestStarted] = useState(false)
  const [audioAttempts, setAudioAttempts] = useState({})
  const [recordings, setRecordings] = useState({})
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingTimerRef = useRef(null)
  const audioRef = useRef(null)

  useEffect(() => {
    fetchPracticeTests()
  }, [])

  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 10) {
            stopRecording()
            return 10
          }
          return prev + 1
        })
      }, 1000)
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
  }, [isRecording])

  const fetchPracticeTests = async () => {
    try {
      setLoading(true)
      const response = await api.get('/test-management/get-practice-tests')
      setTests(response.data.data)
    } catch (err) {
      error('Failed to load practice tests')
    } finally {
      setLoading(false)
    }
  }

  const startTest = async (testId) => {
    try {
      setLoading(true)
      const response = await api.get(`/test-management/get-test/${testId}`)
      setSelectedTest(response.data.data)
      setIsTestStarted(true)
      setCurrentQuestion(0)
      setAudioAttempts({})
      setRecordings({})
    } catch (err) {
      error('Failed to start test')
    } finally {
      setLoading(false)
    }
  }

  const playAudio = async (questionIndex) => {
    if (!selectedTest) return

    const question = selectedTest.questions[questionIndex]
    const attemptsKey = `${questionIndex}`
    const currentAttempts = audioAttempts[attemptsKey] || 0

    if (currentAttempts >= selectedTest.max_attempts) {
      error(`You can only listen to this audio ${selectedTest.max_attempts} times`)
      return
    }

    try {
      setIsPlaying(true)
      
      // Create audio element and play
      if (audioRef.current) {
        audioRef.current.pause()
      }
      
      audioRef.current = new Audio(question.audio_url)
      audioRef.current.onended = () => setIsPlaying(false)
      audioRef.current.onerror = () => {
        setIsPlaying(false)
        error('Failed to play audio')
      }
      
      await audioRef.current.play()
      
      // Update attempts
      setAudioAttempts(prev => ({
        ...prev,
        [attemptsKey]: currentAttempts + 1
      }))
    } catch (err) {
      setIsPlaying(false)
      error('Failed to play audio')
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        setRecordings(prev => ({
          ...prev,
          [currentQuestion]: audioBlob
        }))
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordingTime(0)
    } catch (err) {
      error('Failed to start recording. Please allow microphone access.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setRecordingTime(0)
    }
  }

  const nextQuestion = () => {
    if (currentQuestion < selectedTest.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }

  const submitTest = async () => {
    const unansweredQuestions = selectedTest.questions.filter((_, index) => !recordings[index])
    
    if (unansweredQuestions.length > 0) {
      error('Please answer all questions before submitting')
      return
    }

    try {
      setIsSubmitting(true)
      
      const formData = new FormData()
      formData.append('test_id', selectedTest.id)
      
      // Add all recordings
      Object.keys(recordings).forEach(questionIndex => {
        formData.append(`question_${questionIndex}`, recordings[questionIndex])
      })

      const response = await api.post('/test-management/submit-practice-test', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      success('Test submitted successfully!')
      navigate(`/student/test-result/${response.data.data.result_id}`)
    } catch (err) {
      error(err.response?.data?.message || 'Failed to submit test')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRemainingAttempts = (questionIndex) => {
    const attemptsKey = `${questionIndex}`
    const currentAttempts = audioAttempts[attemptsKey] || 0
    return selectedTest.max_attempts - currentAttempts
  }

  if (loading) {
    return <LoadingSpinner size="lg" />
  }

  if (!isTestStarted) {
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
                  Practice Tests
                </h1>
                <p className="mt-2 text-gray-600">
                  Choose a practice test to improve your skills
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tests.map((test) => (
                  <motion.div
                    key={test.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {test.name}
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <p><strong>Module:</strong> {test.module}</p>
                      <p><strong>Level:</strong> {test.level}</p>
                      <p><strong>Questions:</strong> {test.question_count}</p>
                      <p><strong>Max Attempts:</strong> {test.max_attempts}</p>
                    </div>
                    <button
                      onClick={() => startTest(test.id)}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Start Test
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const currentQuestionData = selectedTest.questions[currentQuestion]

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Sidebar />
      
      <div className="lg:pl-64">
        <main className="py-6">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Test Header */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {selectedTest.name}
                  </h1>
                  <p className="text-gray-600">
                    Question {currentQuestion + 1} of {selectedTest.questions.length}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    Max Attempts: {selectedTest.max_attempts}
                  </p>
                  <p className="text-sm text-gray-600">
                    Remaining: {getRemainingAttempts(currentQuestion)}
                  </p>
                </div>
              </div>
            </div>

            {/* Question Card */}
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-lg shadow-md p-6 mb-6"
            >
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Question {currentQuestion + 1}
                </h2>
                
                {currentQuestionData.instructions && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-800">
                      <strong>Instructions:</strong> {currentQuestionData.instructions}
                    </p>
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-gray-700">{currentQuestionData.question}</p>
                </div>

                {/* Audio Controls */}
                <div className="flex items-center space-x-4 mb-6">
                  <button
                    onClick={() => playAudio(currentQuestion)}
                    disabled={isPlaying || getRemainingAttempts(currentQuestion) <= 0}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4 mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Listen ({getRemainingAttempts(currentQuestion)} left)
                  </button>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <Volume2 className="h-4 w-4 mr-1" />
                    {selectedTest.accent} • {selectedTest.speed}x speed
                  </div>
                </div>

                {/* Recording Section */}
                <div className="border-t pt-6">
                  <h3 className="text-md font-semibold text-gray-900 mb-4">
                    Your Answer
                  </h3>
                  
                  <div className="flex items-center space-x-4 mb-4">
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        disabled={recordings[currentQuestion]}
                        className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Mic className="h-4 w-4 mr-2" />
                        {recordings[currentQuestion] ? 'Re-record' : 'Start Recording'}
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                      >
                        <StopCircle className="h-4 w-4 mr-2" />
                        Stop Recording
                      </button>
                    )}
                    
                    {isRecording && (
                      <div className="flex items-center text-red-600">
                        <Clock className="h-4 w-4 mr-1" />
                        {10 - recordingTime}s remaining
                      </div>
                    )}
                    
                    {recordings[currentQuestion] && !isRecording && (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Recorded
                      </div>
                    )}
                  </div>

                  {recordings[currentQuestion] && (
                    <div className="p-3 bg-green-50 rounded-md">
                      <p className="text-sm text-green-800">
                        ✓ Answer recorded successfully
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <button
                onClick={previousQuestion}
                disabled={currentQuestion === 0}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <div className="flex space-x-2">
                {currentQuestion < selectedTest.questions.length - 1 ? (
                  <button
                    onClick={nextQuestion}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={submitTest}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Submitting...</span>
                      </div>
                    ) : (
                      'Submit Test'
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / selectedTest.questions.length) * 100}%` }}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default PracticeTests 