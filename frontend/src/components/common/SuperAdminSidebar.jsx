import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, Users, FilePlus, Building2, BarChart, LayoutDashboard, BookCopy, Briefcase, PlusSquare, BarChart3, GraduationCap, LineChart } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const SuperAdminSidebar = () => {
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
    { name: 'System Analytics', path: '/superadmin/analytics', icon: LineChart }
  ]

  const isActive = (path) => location.pathname.startsWith(path)

  return (
    <div className="fixed top-0 left-0 h-screen w-64 bg-white shadow-lg z-30 flex flex-col">
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
        <img
          src="https://static.wixstatic.com/media/bfee2e_7d499a9b2c40442e85bb0fa99e7d5d37~mv2.png/v1/fill/w_203,h_111,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo1.png"
          alt="VERSANT Logo"
          className="h-8 w-auto"
        />
      </div>
      <nav className="mt-8 px-4 flex-1">
        <div className="flex flex-col space-y-2 mb-6">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${isActive(link.path) ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
            >
              <link.icon className={`mr-3 h-5 w-5 ${isActive(link.path) ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
              {link.name}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}

export default SuperAdminSidebar 