import React from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { Home, Users, FilePlus, Building2, BarChart, LayoutDashboard, BookCopy, Briefcase, PlusSquare, BarChart3, GraduationCap, LineChart } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { motion } from 'framer-motion'

const SuperAdminSidebar = ({ onModuleUpload }) => {
  const location = useLocation()
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navLinks = [
    { name: 'Dashboard', path: '/superadmin/dashboard', icon: LayoutDashboard },
    { name: 'Campus Management', path: '/superadmin/campuses', icon: Building2 },
    { name: 'Course Management', path: '/superadmin/courses', icon: BookCopy },
    { name: 'Batch Creation', path: '/superadmin/batch-course-instances', icon: GraduationCap },
    { name: 'User Management', path: '/superadmin/users', icon: Users },
    { name: 'Test Management', path: '/superadmin/tests', icon: FilePlus },
    { name: 'Question Bank Upload', path: '/superadmin/question-bank-upload', icon: FilePlus },
    { name: 'Student Management', path: '/superadmin/students', icon: GraduationCap },
    { name: 'Results Management', path: '/superadmin/results', icon: BarChart },
    { name: 'Practice Analytics', path: '/superadmin/practice-analytics', icon: BarChart3 },
    // { name: 'System Analytics', path: '/superadmin/analytics', icon: LineChart }
  ]

  const isActive = (path) => location.pathname.startsWith(path)

  return (
    <div className="flex h-screen">
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 80, damping: 18 }}
        className="fixed top-0 left-0 h-screen w-64 bg-white shadow-xl z-30 flex flex-col border-r border-gray-200"
      >
        {/* Logo/Brand */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-800">Study Edge</h1>
          <p className="text-sm text-gray-600">Super Admin Portal</p>
        </div>

        <nav className="flex-1 flex flex-col justify-between">
          <div className="flex flex-col space-y-2 px-4 mt-6">
            {navLinks.map((link, idx) => (
              <motion.div
                key={link.name}
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.05 * idx, type: 'spring', stiffness: 80, damping: 18 }}
              >
                <Link
                  to={link.path}
                  className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-300
                    ${isActive(link.path)
                      ? 'bg-blue-100 text-blue-700 shadow-md border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}
                  `}
                >
                  <link.icon className={`mr-3 h-5 w-5 transition-colors duration-200 ${isActive(link.path) ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'}`} />
                  <span className="transition-transform duration-300 group-hover:translate-x-1">{link.name}</span>
                </Link>
              </motion.div>
            ))}
          </div>
          <div className="px-4 mt-8 mb-4">
            <button
              onClick={() => onModuleUpload ? onModuleUpload() : navigate('/superadmin/question-bank-upload')}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-semibold px-4 py-3 rounded-lg shadow-md hover:bg-green-700 transition-all duration-300 text-sm hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <FilePlus className="h-5 w-5" />
              Question Bank Upload
            </button>
          </div>
        </nav>
        <div className="px-4 pb-6 mt-auto">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-gray-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-gray-700 transition-all duration-300 shadow-sm hover:scale-105"
          >
            Logout
          </button>
        </div>
      </motion.div>
      <div className="ml-64 flex-1 bg-gray-50">
        <Outlet />
      </div>
    </div>
  )
}

export default SuperAdminSidebar 