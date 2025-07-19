import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { Users, FilePlus, Building2, BarChart, LayoutDashboard, BookCopy, GraduationCap, Shield } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import api from '../../services/api'

const SuperAdminSidebar = () => {
  const location = useLocation()
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const [userPermissions, setUserPermissions] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserPermissions()
  }, [user])

  const fetchUserPermissions = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      // Get user's full permissions from the backend
      const userResponse = await api.get(`/user-management/${user.id || user._id}`)
      const permissions = userResponse.data.data?.permissions || {}
      
      setUserPermissions(permissions)
    } catch (err) {
      console.error('Failed to fetch permissions:', err)
      // Use default permissions based on role
      const defaultPermissions = {
        super_admin: {
          modules: ['dashboard', 'campus_management', 'course_management', 'batch_management', 'user_management', 'admin_permissions', 'test_management', 'question_bank_upload', 'crt_upload', 'audio_upload', 'sentence_upload', 'reading_upload', 'writing_upload', 'student_management', 'results_management'],
          can_upload_tests: true,
          can_upload_questions: true
        },
        campus_admin: {
          modules: ['dashboard', 'course_management', 'batch_management', 'user_management', 'test_management', 'question_bank_upload', 'crt_upload', 'audio_upload', 'sentence_upload', 'reading_upload', 'writing_upload', 'student_management', 'results_management'],
          can_upload_tests: false,
          can_upload_questions: false
        },
        course_admin: {
          modules: ['dashboard', 'batch_management', 'user_management', 'test_management', 'question_bank_upload', 'crt_upload', 'audio_upload', 'sentence_upload', 'reading_upload', 'writing_upload', 'student_management', 'results_management'],
          can_upload_tests: false,
          can_upload_questions: false
        }
      }
      setUserPermissions(defaultPermissions[user.role] || defaultPermissions.super_admin)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Define navigation based on user role and permissions
  const getNavigation = () => {
    if (loading || !userPermissions) {
      return []
    }

    const allNavLinks = [
      { name: 'Dashboard', path: '/superadmin/dashboard', icon: LayoutDashboard, module: 'dashboard' },
      { name: 'Campus Management', path: '/superadmin/campuses', icon: Building2, module: 'campus_management' },
      { name: 'Course Management', path: '/superadmin/courses', icon: BookCopy, module: 'course_management' },
      { name: 'Batch Management', path: '/superadmin/batch-management', icon: GraduationCap, module: 'batch_management' },
      { name: 'User Management', path: '/superadmin/users', icon: Users, module: 'user_management' },
      { name: 'Admin Permissions', path: '/superadmin/admin-permissions', icon: Shield, module: 'admin_permissions' },
      { name: 'Test Management', path: '/superadmin/tests', icon: FilePlus, module: 'test_management' },
      { name: 'Question Bank Upload', path: '/superadmin/question-bank-upload', icon: FilePlus, module: 'question_bank_upload', isUpload: true },
      { name: 'CRT Upload', path: '/superadmin/crt-upload', icon: FilePlus, module: 'crt_upload', isUpload: true },
      { name: 'Audio Upload', path: '/superadmin/audio-upload', icon: FilePlus, module: 'audio_upload', isUpload: true },
      { name: 'Sentence Upload', path: '/superadmin/sentence-upload', icon: FilePlus, module: 'sentence_upload', isUpload: true },
      { name: 'Reading Upload', path: '/superadmin/reading-upload', icon: FilePlus, module: 'reading_upload', isUpload: true },
      { name: 'Writing Upload', path: '/superadmin/writing-upload', icon: FilePlus, module: 'writing_upload', isUpload: true },
      { name: 'Student Management', path: '/superadmin/students', icon: GraduationCap, module: 'student_management' },
      { name: 'Results Management', path: '/superadmin/results', icon: BarChart, module: 'results_management' },
    ]

    // Filter navigation based on user permissions
    return allNavLinks.filter(link => {
      // Check if user has access to this module
      if (!userPermissions.modules?.includes(link.module)) {
        return false
      }

      // For campus and course admins, show upload features but mark them as restricted
      if (link.isUpload && (user?.role === 'campus_admin' || user?.role === 'course_admin')) {
        return true // Show but will be marked as restricted
      }

      return true
    })
  }

  const navLinks = getNavigation()

  const isActive = (path) => location.pathname.startsWith(path)

  return (
    <div className="flex">
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 80, damping: 18 }}
        className="fixed top-0 left-0 h-screen w-64 bg-gradient-to-b from-white to-gray-50 shadow-2xl z-30 flex flex-col border-r border-gray-200"
      >
        {/* Logo/Brand */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 100 }}
          className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50"
        >
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Study Edge
          </h1>
          <p className="text-sm text-gray-600 font-medium">
            {user?.role === 'campus_admin' ? 'Campus Admin Portal' : 
             user?.role === 'course_admin' ? 'Course Admin Portal' : 
             'Super Admin Portal'}
          </p>
          {(user?.role === 'campus_admin' || user?.role === 'course_admin') && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-700 font-medium">
                ⚠️ Upload features are restricted
              </p>
            </div>
          )}
        </motion.div>

        <nav className="flex-1 flex flex-col justify-between">
          <div className="flex flex-col space-y-1 px-4 mt-6">
            {navLinks.map((link, idx) => {
              const isRestricted = link.isUpload && (user?.role === 'campus_admin' || user?.role === 'course_admin')
              
              return (
                <motion.div
                  key={link.name}
                  initial={{ x: -30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.05 * idx, type: 'spring', stiffness: 80, damping: 18 }}
                  whileHover={{ scale: isRestricted ? 1 : 1.02 }}
                  whileTap={{ scale: isRestricted ? 1 : 0.98 }}
                >
                  <Link
                    to={isRestricted ? '#' : link.path}
                    onClick={isRestricted ? (e) => {
                      e.preventDefault()
                      toast.error('Upload features are restricted for your role. Please contact a Super Admin for assistance.')
                    } : undefined}
                    className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 relative overflow-hidden
                      ${isActive(link.path) && !isRestricted
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
                        : isRestricted
                        ? 'text-gray-400 bg-gray-50 border border-gray-200 cursor-not-allowed opacity-75'
                        : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-100 hover:to-blue-50 hover:text-gray-900 hover:shadow-md'
                      }
                    `}
                    title={isRestricted ? 'Upload features are restricted for your role' : undefined}
                  >
                    {/* Active indicator */}
                    {isActive(link.path) && !isRestricted && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl"
                        initial={false}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                    
                    <link.icon className={`mr-3 h-5 w-5 transition-all duration-300 relative z-10
                      ${isActive(link.path) && !isRestricted
                        ? 'text-white' 
                        : isRestricted
                        ? 'text-gray-400'
                        : 'text-gray-500 group-hover:text-blue-600 group-hover:scale-110'
                      }`} 
                    />
                    <span className="relative z-10 transition-all duration-300 group-hover:translate-x-1 font-semibold">
                      {link.name}
                    </span>
                    
                    {/* Restriction indicator */}
                    {isRestricted && (
                      <svg className="ml-auto h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )}
                    
                    {/* Hover effect */}
                    {!isActive(link.path) && !isRestricted && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl"
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </nav>
        
        {/* Logout Button */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
          className="px-4 pb-6 mt-auto"
        >
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white font-semibold px-4 py-3 rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <motion.div
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </motion.div>
            Logout
          </button>
        </motion.div>
      </motion.div>
      <div className="ml-64 flex-1 bg-gray-50 w-full">
        <Outlet />
      </div>
    </div>
  )
}

export default SuperAdminSidebar 