import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { useNotification } from '../../contexts/NotificationContext'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmailCollectionPrompt from '../../components/common/EmailCollectionPrompt'
import FormPortalPopup from '../../components/common/FormPortalPopup'
import { useFormPortal } from '../../contexts/FormPortalContext'
import FormStats from '../../components/student/FormStats'
import ReleasedFormData from '../../components/student/ReleasedFormData'
import api from '../../services/api'
import { 
  BrainCircuit, 
  BookOpen, 
  Target, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Award,
  Calendar,
  BarChart3,
  FileText,
  PlayCircle,
  BookOpenCheck,
  Trophy,
  Star,
  Zap
} from 'lucide-react'

const StudentDashboard = () => {
  const { user } = useAuth()
  const { success, error } = useNotification()
  const { hasIncompleteRequiredForms, hasIncompleteForms, loading: formLoading } = useFormPortal()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [progressData, setProgressData] = useState(null)
  const [grammarResults, setGrammarResults] = useState([])
  const [vocabularyResults, setVocabularyResults] = useState([])
  const [unlockedModules, setUnlockedModules] = useState([])
  const [unlockedLoading, setUnlockedLoading] = useState(true)
  const [unlockedError, setUnlockedError] = useState(null)
  const [userProfile, setUserProfile] = useState(null)

  // Helper function to safely format numbers
  const safeToFixed = (value, decimals = 1) => {
    if (typeof value === 'number' && !isNaN(value)) {
      return value.toFixed(decimals)
    }
    const num = parseFloat(value || 0)
    return isNaN(num) ? '0.0' : num.toFixed(decimals)
  }

  const coreModules = [
    { id: 'GRAMMAR', name: 'Grammar', icon: '🧠', color: 'bg-indigo-500' },
    { id: 'VOCABULARY', name: 'Vocabulary', icon: '📚', color: 'bg-green-500' }
  ]

  useEffect(() => {
    fetchDashboardData()
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/student/profile')
      if (response.data.success) {
        setUserProfile(response.data.data)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const handleEmailUpdated = (newEmail) => {
    setUserProfile(prev => ({
      ...prev,
      email: newEmail
    }))
    // Also update the auth context if needed
    if (user) {
      user.email = newEmail
    }
  }

  useEffect(() => {
    const fetchUnlocked = async () => {
      try {
        setUnlockedLoading(true)
        setUnlockedError(null)
        const res = await api.get('/student/unlocked-modules')
        setUnlockedModules(res.data.data || [])
      } catch (e) {
        setUnlockedError('Failed to load unlocked modules.')
      } finally {
        setUnlockedLoading(false)
      }
    }
    fetchUnlocked()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [summaryRes, grammarRes, vocabularyRes] = await Promise.all([
        api.get('/student/progress-summary'),
        api.get('/student/grammar-detailed-results'),
        api.get('/student/vocabulary-detailed-results')
      ])
      
      setProgressData(summaryRes.data.data)
      setGrammarResults(grammarRes.data.data)
      setVocabularyResults(vocabularyRes.data.data)
    } catch (err) {
      error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading || formLoading) {
    return <LoadingSpinner size="lg" />
  }

  // Block dashboard content if there are any incomplete forms (required or optional)
  const shouldBlockDashboard = hasIncompleteForms()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Block dashboard content if forms are required */}
      {shouldBlockDashboard && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-30 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl"
          >
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Please Complete All Forms</h3>
            <p className="text-gray-600">You need to complete all pending forms before accessing the dashboard.</p>
          </motion.div>
        </div>
      )}
      
      <div className={`w-full p-4 sm:p-6 lg:p-8 ${shouldBlockDashboard ? 'pointer-events-none opacity-50' : ''}`}>
        {/* Enhanced Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 w-full"
        >
          <div className="bg-transparent p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <Trophy className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-gray-800">
                      Welcome back, {user?.name?.split(' ')[0] || 'Student'}!
                    </h1>
                    <p className="text-gray-600 text-sm mt-0.5">
                      Ready to continue your English learning journey?
                    </p>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center">
                      <Target className="h-4 w-4 text-blue-600 mr-2" />
                      <div>
                        <p className="text-xs text-blue-700 font-medium">Overall Progress</p>
                        <p className="text-sm font-semibold text-blue-900">
                          {progressData?.overall_progress ? safeToFixed(progressData.overall_progress) : '0'}%
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="flex items-center">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mr-2" />
                      <div>
                        <p className="text-xs text-green-700 font-medium">Tests Completed</p>
                        <p className="text-sm font-semibold text-green-900">
                          {progressData?.total_tests_completed || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="flex items-center">
                      <Award className="h-4 w-4 text-purple-600 mr-2" />
                      <div>
                        <p className="text-xs text-purple-700 font-medium">Best Score</p>
                        <p className="text-sm font-semibold text-purple-900">
                          {progressData?.highest_score ? safeToFixed(progressData.highest_score) : '0'}%
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-orange-50 rounded-lg p-3">
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 text-orange-600 mr-2" />
                      <div>
                        <p className="text-xs text-orange-700 font-medium">Streak</p>
                        <p className="text-sm font-semibold text-orange-900">
                          {progressData?.current_streak || 0} days
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <Zap className="h-5 w-5 text-blue-600 mr-2" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/student/practice"
              className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-5 border border-gray-100 hover:border-blue-200"
            >
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors">
                  <PlayCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-blue-600 group-hover:translate-x-1 transition-transform duration-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                Practice Tests
              </h3>
              <p className="text-gray-600 text-sm">
                Take practice tests to improve your skills
              </p>
            </Link>

            <Link
              to="/student/exams"
              className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-5 border border-gray-100 hover:border-green-200"
            >
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-green-200 transition-colors">
                  <Target className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-green-600 group-hover:translate-x-1 transition-transform duration-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-green-600 transition-colors">
                Online Exams
              </h3>
              <p className="text-gray-600 text-sm">
                Scheduled exams and assessments
              </p>
            </Link>

            <Link
              to="/student/progress"
              className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-5 border border-gray-100 hover:border-purple-200"
            >
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-purple-200 transition-colors">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div className="text-purple-600 group-hover:translate-x-1 transition-transform duration-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">
                Progress Tracker
              </h3>
              <p className="text-gray-600 text-sm">
                Track your learning progress
              </p>
            </Link>

            <Link
              to="/student/history"
              className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-5 border border-gray-100 hover:border-orange-200"
            >
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-orange-200 transition-colors">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div className="text-orange-600 group-hover:translate-x-1 transition-transform duration-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">
                Test History
              </h3>
              <p className="text-gray-600 text-sm">
                View your past test results
              </p>
            </Link>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column */}
          <div className="xl:col-span-2 space-y-6 lg:space-y-8">
            {/* Learning Progress Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                  <TrendingUp className="h-6 w-6 text-blue-600 mr-3" />
                  Learning Progress
                </h2>
                <Link 
                  to="/student/progress" 
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                >
                  View Details
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {coreModules.map((coreModule) => {
                  const moduleProgress = progressData?.modules?.find(m => m.module_name === coreModule.id)
                  const progressPercentage = moduleProgress?.progress_percentage || 0
                  const highestScore = moduleProgress?.highest_score || 0
                  
                  return (
                    <motion.div
                      key={coreModule.id}
                      whileHover={{ scale: 1.02 }}
                      className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${coreModule.color}`}>
                          {coreModule.icon}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">{safeToFixed(progressPercentage)}%</p>
                          <p className="text-sm text-gray-600">Complete</p>
                        </div>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        {coreModule.name}
                      </h3>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium text-gray-900">{safeToFixed(progressPercentage)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all duration-500 ${coreModule.color}`}
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Best Score</span>
                          <span className="font-medium text-gray-900">{safeToFixed(highestScore)}%</span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>

            {/* Grammar Progress */}
            {grammarResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <BrainCircuit className="h-6 w-6 text-indigo-600 mr-3" />
                    Grammar Progress
                  </h2>
                  <div className="flex items-center text-indigo-600 text-sm font-medium">
                    <Star className="h-4 w-4 mr-1" />
                    {grammarResults.filter(cat => cat.status === 'completed').length} / {grammarResults.length} Completed
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {grammarResults.map((category, index) => (
                    <motion.div
                      key={index}
                      whileHover={{ scale: 1.02 }}
                      className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-5 border border-indigo-200 hover:border-indigo-300 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-900">{category.subcategory_display_name}</h3>
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                          category.status === 'completed' 
                            ? 'bg-green-100 text-green-800 border border-green-200' 
                            : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        }`}>
                          {category.status === 'completed' ? 'Completed' : 'In Progress'}
                        </span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Best Score</span>
                          <span className="font-semibold text-gray-900">{safeToFixed(category.highest_score)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${category.highest_score}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>{category.total_attempts} attempts</span>
                          <span className="font-medium">{safeToFixed(category.highest_score)}%</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Released Form Data - Inside Learning Progress Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-8"
            >
              <ReleasedFormData />
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-6 lg:space-y-8">
            {/* Form Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <FormStats />
            </motion.div>


            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <Clock className="h-5 w-5 text-blue-600 mr-3" />
                Recent Activity
              </h2>
              <div className="space-y-4">
                {progressData?.recent_activity?.slice(0, 5).map((activity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between py-3 px-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 hover:border-blue-200 transition-all duration-300"
                  >
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-3" />
                      <div>
                        <span className="text-gray-900 font-medium">Practice Test</span>
                        <p className="text-xs text-gray-600">Completed</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-blue-600">
                        {safeToFixed(activity.average_score)}%
                      </span>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
                {(!progressData?.recent_activity || progressData.recent_activity.length === 0) && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">No recent activity</p>
                    <p className="text-sm text-gray-400 mt-1">Start practicing to see your progress!</p>
                  </div>
                )}
              </div>
            </motion.div>

          </div>
        </div>
      </div>
      
      {/* Email Collection Prompt */}
      <EmailCollectionPrompt 
        user={userProfile || user} 
        onEmailUpdated={handleEmailUpdated}
      />
      
      {/* Form Portal Popup */}
      <FormPortalPopup />
    </div>
  )
}

export default StudentDashboard 