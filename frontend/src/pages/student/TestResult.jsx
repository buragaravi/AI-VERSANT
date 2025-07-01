import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useNotification } from '../../contexts/NotificationContext'
import Header from '../../components/common/Header'
import Sidebar from '../../components/common/Sidebar'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import api from '../../services/api'
import { Volume2, AudioLines, CheckCircle, XCircle } from 'lucide-react'

const TestResult = () => {
  const { resultId } = useParams()
  const { error } = useNotification()
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState(null)
  const [audioPlayer, setAudioPlayer] = useState(null)
  const [playingIndex, setPlayingIndex] = useState(null)
  const [showAutoSubmitWarning, setShowAutoSubmitWarning] = useState(false)

  useEffect(() => {
    fetchResult()
    return () => {
      if (audioPlayer) {
        audioPlayer.pause()
      }
    }
    // eslint-disable-next-line
  }, [resultId])

  useEffect(() => {
    if (result && (result.auto_submitted || result.cheat_detected)) {
      setShowAutoSubmitWarning(true)
    }
  }, [result])

  const fetchResult = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/test-management/get-test-result/${resultId}`)
      setResult(response.data.data)
    } catch (err) {
      error('Failed to load test result')
    } finally {
      setLoading(false)
    }
  }

  const playAudio = (audioUrl, index) => {
    if (audioPlayer) {
      audioPlayer.pause()
    }
    const player = new Audio(`https://{YOUR_S3_BUCKET}.s3.amazonaws.com/${audioUrl}`)
    setAudioPlayer(player)
    setPlayingIndex(index)
    player.onended = () => setPlayingIndex(null)
    player.play()
  }

  if (loading) {
    return <LoadingSpinner size="lg" />
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <Sidebar />
        <div className="lg:pl-64">
          <main className="py-6">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
              <p className="text-gray-600">Result not found.</p>
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Test Result
              </h1>
              <p className="text-gray-600 mb-2">
                <strong>Score:</strong> {result.average_score}%
              </p>
              <p className="text-gray-600 mb-2">
                <strong>Date:</strong> {new Date(result.submitted_at).toLocaleString()}
              </p>
              <Link to="/student/history" className="text-blue-600 hover:underline">
                Back to History
              </Link>
            </motion.div>
            {showAutoSubmitWarning && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 text-center">
                <strong>You switched tabs during the exam.</strong> Detailed results are unavailable.
              </div>
            )}
            {!showAutoSubmitWarning && (
              <div className="bg-white rounded-lg shadow-md p-6">
                {result.results.map((q, idx) => (
                  <div key={idx} className="mb-8 border-b pb-6 last:border-b-0 last:pb-0">
                    <div className="flex items-center mb-2">
                      <span className="text-lg font-semibold text-gray-900 mr-2">
                        Question {q.question_index !== undefined ? q.question_index + 1 : idx + 1}
                      </span>
                      {q.question_type === 'mcq' && (
                        q.is_correct ? (
                          <span className="flex items-center text-green-600 ml-2"><CheckCircle className="h-5 w-5 mr-1" /> Correct</span>
                        ) : (
                          <span className="flex items-center text-red-600 ml-2"><XCircle className="h-5 w-5 mr-1" /> Incorrect</span>
                        )
                      )}
                    </div>
                    <div className="mb-2">
                      <span className="font-medium text-gray-700">{q.question_type === 'mcq' ? 'Question:' : 'Original:'}</span>
                      <span className="ml-2 text-gray-900">{q.question}</span>
                    </div>
                    {q.question_type === 'mcq' && (
                      <div className="mb-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {Object.entries(q.options || {}).map(([key, value]) => {
                            const isCorrect = key === q.correct_answer;
                            const isStudent = key === q.student_answer;
                            return (
                              <div
                                key={key}
                                className={`flex items-center p-3 rounded-lg border-2 text-base font-medium transition-all
                                  ${isCorrect ? 'border-green-500 bg-green-50 text-green-800' :
                                    isStudent ? 'border-red-500 bg-red-50 text-red-800' :
                                    'border-gray-200 bg-white text-gray-700'}`}
                              >
                                <span className="font-bold mr-2">{key}.</span>
                                <span>{value}</span>
                                {isCorrect && <span className="ml-2 text-green-600 font-bold">(Correct)</span>}
                                {isStudent && !isCorrect && <span className="ml-2 text-red-600 font-bold">(Your Answer)</span>}
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-2 text-sm">
                          <span className="font-semibold">Your Answer:</span> <span className={q.is_correct ? 'text-green-700' : 'text-red-700'}>{q.student_answer || 'N/A'}</span>
                          <span className="ml-4 font-semibold">Correct Answer:</span> <span className="text-green-700">{q.correct_answer}</span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center space-x-4 mt-2">
                      <button
                        onClick={() => playAudio(q.student_audio_url, idx)}
                        className={`flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${playingIndex === idx ? 'opacity-70' : ''}`}
                      >
                        <Volume2 className="h-4 w-4 mr-1" />
                        Play Your Audio
                      </button>
                      <a
                        href={`https://{YOUR_S3_BUCKET}.s3.amazonaws.com/${q.student_audio_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                      >
                        <AudioLines className="h-4 w-4 mr-1" />
                        Download
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default TestResult 