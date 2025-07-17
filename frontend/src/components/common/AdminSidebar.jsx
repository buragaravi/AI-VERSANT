import React from 'react'
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { 
  Home, Users, FilePlus, Building2, BarChart, LayoutDashboard, 
  BookCopy, Briefcase, PlusSquare, BarChart3, GraduationCap, 
  LineChart, FileText, BarChart3 as ChartBarIcon,
  Settings, LogOut
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
        { name: 'Practice Analytics', path: '/superadmin/practice-analytics', icon: ChartBarIcon },
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

    return (
    <div className="flex h-screen">
      <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-50">
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-800">Study Edge</h1>
            <p className="text-sm text-gray-600 capitalize">{user?.role?.replace('_', ' ')} Portal</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item, index) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={item.path}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    location.pathname === item.path
                      ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              </motion.div>
            ))}
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>
      <div className="ml-64 flex-1 bg-gray-50">
        <Outlet />
      </div>
    </div>
  )
}

export default AdminSidebar 