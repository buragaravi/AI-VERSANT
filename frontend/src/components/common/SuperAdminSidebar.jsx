import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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
    { name: 'User Management', path: '/superadmin/users', icon: Users },
    { name: 'Campus Management', path: '/superadmin/campuses', icon: Building2 },
    { name: 'Course Management', path: '/superadmin/courses', icon: BookCopy },
    { name: 'Batch Management', path: '/superadmin/batches', icon: Briefcase },
    { name: 'Module Creation', path: '/superadmin/tests/create', icon: PlusSquare },
    { name: 'Results', path: '/superadmin/results', icon: BarChart3 },
    { name: 'Practice Analytics', path: '/superadmin/practice-analytics', icon: BarChart3 },
    { name: 'Student Management', path: '/superadmin/students', icon: GraduationCap },
    // { name: 'System Analytics', path: '/superadmin/analytics', icon: LineChart }
  ]

  const isActive = (path) => location.pathname.startsWith(path)

  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 80, damping: 18 }}
      className="fixed top-0 left-0 h-screen w-64 bg-background shadow-xl z-30 flex flex-col rounded-tr-3xl rounded-br-3xl border-r border-border text-text transition-colors duration-300"
    >
      <nav className="flex-1 flex flex-col justify-between">
        <div className="flex flex-col space-y-2 px-4 mt-8">
          {navLinks.map((link, idx) => (
            <motion.div
              key={link.name}
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.05 * idx, type: 'spring', stiffness: 80, damping: 18 }}
            >
              <Link
                to={link.path}
                className={`group flex items-center px-3 py-2 text-base font-medium rounded-lg transition-all duration-300 animate-fade-in
                  ${isActive(link.path)
                    ? 'bg-highlight text-text shadow-lg border border-border scale-105'
                    : 'text-text hover:bg-highlight hover:text-text hover:shadow-md border border-transparent hover:scale-105'}
                `}
                style={{ marginBottom: '2px' }}
              >
                <link.icon className={`mr-3 h-5 w-5 transition-colors duration-200 ${isActive(link.path) ? 'text-secondary' : 'text-text group-hover:text-secondary'}`} />
                <span className="transition-transform duration-300 group-hover:translate-x-1">{link.name}</span>
              </Link>
            </motion.div>
          ))}
        </div>
        <div className="px-4 mt-8 mb-4">
          <button
            onClick={() => onModuleUpload ? onModuleUpload() : navigate('/superadmin/question-bank-upload')}
            className="w-full flex items-center justify-center gap-2 bg-button text-text font-semibold px-4 py-3 rounded-xl shadow-lg hover:bg-buttonHover hover:text-text hover:shadow-xl transition-all duration-300 text-base mb-2 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-secondary animate-fade-in border border-border"
            style={{ boxShadow: '0 4px 16px 0 rgba(22, 163, 74, 0.10)' }}
          >
            <FilePlus className="h-5 w-5 text-text" />
            Question Bank Upload
          </button>
        </div>
      </nav>
      <div className="px-4 pb-6 mt-auto">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-secondary text-text font-medium px-4 py-2 rounded-lg hover:bg-tertiary hover:text-text transition-all duration-300 shadow-sm animate-fade-in border border-border hover:scale-105"
        >
          Logout
        </button>
      </div>
    </motion.div>
  )
}

export default SuperAdminSidebar 