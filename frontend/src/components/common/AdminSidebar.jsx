import React from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { 
  Users, FilePlus, Building2, BarChart, LayoutDashboard, 
  BookCopy, GraduationCap, FileText, LogOut
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { motion } from 'framer-motion'

const AdminSidebar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user } = useAuth()

  // Define navigation based on admin role
  const getNavigation = () => {
    // Super Admin - Full access
    if (user?.role === 'super_admin' || user?.role === 'superadmin') {
      return [
        { name: 'Dashboard', path: '/superadmin/dashboard', icon: LayoutDashboard },
        { name: 'Campus Management', path: '/superadmin/campuses', icon: Building2 },
        { name: 'Course Management', path: '/superadmin/courses', icon: BookCopy },
        { name: 'Batch Creation', path: '/superadmin/batch-course-instances', icon: GraduationCap },
        { name: 'User Management', path: '/superadmin/users', icon: Users },
        { name: 'Test Management', path: '/superadmin/tests', icon: FilePlus },
        { name: 'Question Bank Upload', path: '/superadmin/question-bank-upload', icon: FileText },
        { name: 'Student Management', path: '/superadmin/students', icon: GraduationCap },
        { name: 'Results Management', path: '/superadmin/results', icon: BarChart },
      ]
    }

    // Campus Admin - Limited access
    if (user?.role === 'campus_admin') {
      return [
        { name: 'Dashboard', path: '/campus-admin/dashboard', icon: LayoutDashboard },
        { name: 'Test Management', path: '/campus-admin/tests', icon: FilePlus },
        { name: 'Student Upload', path: '/campus-admin/student-upload', icon: Users },
        { name: 'Results', path: '/campus-admin/results', icon: BarChart },
      ]
    }

    // Course Admin - Limited access
    if (user?.role === 'course_admin') {
      return [
        { name: 'Dashboard', path: '/course-admin/dashboard', icon: LayoutDashboard },
        { name: 'Test Management', path: '/course-admin/tests', icon: FilePlus },
        { name: 'Student Upload', path: '/course-admin/student-upload', icon: Users },
        { name: 'Results', path: '/course-admin/results', icon: BarChart },
      ]
    }

    return [
      { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    ]
  }

  const navigation = getNavigation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

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
          <p className="text-sm text-gray-600 font-medium capitalize">{user?.role?.replace('_', ' ')} Portal</p>
        </motion.div>

        <nav className="flex-1 flex flex-col justify-between">
          <div className="flex flex-col space-y-1 px-4 mt-6">
            {navigation.map((link, idx) => (
              <motion.div
                key={link.name}
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.05 * idx, type: 'spring', stiffness: 80, damping: 18 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  to={link.path}
                  className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 relative overflow-hidden
                    ${isActive(link.path)
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-100 hover:to-blue-50 hover:text-gray-900 hover:shadow-md'}
                  `}
                >
                  {/* Active indicator */}
                  {isActive(link.path) && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  
                  <link.icon className={`mr-3 h-5 w-5 transition-all duration-300 relative z-10
                    ${isActive(link.path) 
                      ? 'text-white' 
                      : 'text-gray-500 group-hover:text-blue-600 group-hover:scale-110'
                    }`} 
                  />
                  <span className="relative z-10 transition-all duration-300 group-hover:translate-x-1 font-semibold">
                    {link.name}
                  </span>
                  
                  {/* Hover effect */}
                  {!isActive(link.path) && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </Link>
              </motion.div>
            ))}
          </div>
        </nav>

        {/* User Info & Logout */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
          className="px-4 pb-6 mt-auto"
        >
          <div className="flex items-center mb-4 p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-md">
              <span className="text-white text-sm font-medium">
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-600 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white font-semibold px-4 py-3 rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <motion.div
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
            >
              <LogOut className="h-5 w-5" />
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

export default AdminSidebar 