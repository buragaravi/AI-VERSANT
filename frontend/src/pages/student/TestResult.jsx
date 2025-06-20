import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useNotification } from '../../contexts/NotificationContext'
import Header from '../../components/common/Header'
import Sidebar from '../../components/common/Sidebar'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import api from '../../services/api'
import { Volume2, AudioLines } from 'lucide-react'

const TestResult = () => {
  const { resultId } = useParams()
  const { error } = useNotification()
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState(null)
  const [audioPlayer, setAudioPlayer] = useState(null)
  const [playingIndex, setPlayingIndex] = useState(null)

  useEffect(() => {
    fetchResult()
    return () => {
      if (audioPlayer) {
        audioPlayer.pause()
      }
    }
    // eslint-disable-next-line
  }, [resultId])

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
            <div className="bg-white rounded-lg shadow-md p-6">
              {result.results.map((q, idx) => (
                <div key={idx} className="mb-8 border-b pb-6 last:border-b-0 last:pb-0">
                  <div className="flex items-center mb-2">
                    <span className="text-lg font-semibold text-gray-900 mr-2">
                      Question {q.question_index + 1}
                    </span>
                    <span className="text-sm text-gray-600">Similarity: {q.similarity_score}%</span>
                  </div>
                  <div className="mb-2">
                    <span className="font-medium text-gray-700">Original:</span>
                    <span className="ml-2 text-gray-900">{q.original_text}</span>
                  </div>
                  <div className="mb-2">
                    <span className="font-medium text-gray-700">Your Answer:</span>
                    <span className="ml-2 text-gray-900">{q.student_text}</span>
                  </div>
                  <div className="mb-2 flex flex-wrap gap-4">
                    <div>
                      <span className="font-medium text-gray-700">Missing Words:</span>
                      <span className="ml-2 text-red-600">{q.missing_words.join(', ') || 'None'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Extra Words:</span>
                      <span className="ml-2 text-yellow-600">{q.extra_words.join(', ') || 'None'}</span>
                    </div>
                  </div>
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
          </div>
        </main>
      </div>
    </div>
  )
}

export default TestResult 