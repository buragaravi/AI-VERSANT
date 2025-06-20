import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useDashboard } from '../../contexts/DashboardContext'
import { 
  Home, 
  Users, 
  BookOpen, 
  FileText, 
  BarChart3, 
  Settings,
  GraduationCap,
  Building,
  UserCheck,
  Calendar,
  Award,
  Activity,
  Plus,
  FilePlus,
  Building2,
  BarChart
} from 'lucide-react'

const Sidebar = () => {
  const { user } = useAuth()
  const { sidebarOpen, closeSidebar } = useDashboard()
  const location = useLocation()

  const getNavigationItems = () => {
    const baseItems = [
      { name: 'Dashboard', href: '/superadmin', icon: Home }
    ]

    switch (user?.role) {
      case 'superadmin':
        return [
          { name: 'Dashboard', href: '/superadmin', icon: Home },
          { name: 'Users', href: '/superadmin/users', icon: Users },
          { name: 'Campuses', href: '/superadmin/campuses', icon: Building },
          { name: 'Courses', href: '/superadmin/courses', icon: BookOpen },
          { name: 'Tests', href: '/superadmin/tests', icon: FileText },
          { name: 'Analytics', href: '/superadmin/analytics', icon: BarChart3 },
          { name: 'Settings', href: '/superadmin/settings', icon: Settings }
        ]
      
      case 'campus_admin':
        return [
          ...baseItems,
          { name: 'Students', href: '/campus-admin/students', icon: GraduationCap },
          { name: 'Reports', href: '/campus-admin/reports', icon: BarChart3 },
          { name: 'Analytics', href: '/campus-admin/analytics', icon: Activity }
        ]
      
      case 'course_admin':
        return [
          ...baseItems,
          { name: 'Students', href: '/course-admin/students', icon: GraduationCap },
          { name: 'Progress', href: '/course-admin/progress', icon: Award },
          { name: 'Reports', href: '/course-admin/reports', icon: BarChart3 }
        ]
      
      case 'student':
        return [
          ...baseItems,
          { name: 'Practice Tests', href: '/student/practice', icon: FileText },
          { name: 'Online Exams', href: '/student/exams', icon: Calendar },
          { name: 'Test History', href: '/student/history', icon: Activity },
          { name: 'Progress', href: '/student/progress', icon: Award }
        ]
      
      default:
        return baseItems
    }
  }

  const navigationItems = getNavigationItems()

  const quickActions = [
    {
      name: 'Create User',
      href: '/superadmin/users/create',
      icon: Plus,
      color: 'bg-blue-600',
    },
    {
      name: 'Create Test',
      href: '/superadmin/tests/create',
      icon: FilePlus,
      color: 'bg-green-600',
    },
    {
      name: 'Manage Campuses',
      href: '/superadmin/campuses',
      icon: Building2,
      color: 'bg-purple-600',
    },
    {
      name: 'System Analytics',
      href: '/superadmin/analytics',
      icon: BarChart,
      color: 'bg-orange-600',
    },
  ]

  const isActive = (href) => {
    if (href === '/') {
      return location.pathname === href || location.pathname === '/superadmin' || location.pathname === '/campus-admin' || location.pathname === '/course-admin' || location.pathname === '/student'
    }
    return location.pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={closeSidebar}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </div>
      )}

      {/* Sidebar */}
      <div className="fixed top-0 left-0 h-screen w-64 bg-white shadow-lg z-30">
        <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
          <img
            src="https://static.wixstatic.com/media/bfee2e_7d499a9b2c40442e85bb0fa99e7d5d37~mv2.png/v1/fill/w_203,h_111,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo1.png"
            alt="VERSANT Logo"
            className="h-8 w-auto"
          />
        </div>

        <nav className="mt-8 px-4">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={closeSidebar}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive(item.href)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon
                    className={`mr-3 h-5 w-5 ${
                      isActive(item.href)
                        ? 'text-blue-500'
                        : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.name}
                </Link>
              )
            })}
            {user?.role === 'superadmin' && (
              <div className="mt-4 flex flex-col space-y-2">
                <Link to="/superadmin/users/create" className="flex items-center px-3 py-2 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition">
                  <Users className="h-5 w-5 mr-2" /> Student Creation
                </Link>
                <Link to="/superadmin/tests/create" className="flex items-center px-3 py-2 rounded-md bg-green-50 text-green-700 hover:bg-green-100 font-medium transition">
                  <FilePlus className="h-5 w-5 mr-2" /> Test Creation
                </Link>
                <Link to="/superadmin/campuses" className="flex items-center px-3 py-2 rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 font-medium transition">
                  <Building2 className="h-5 w-5 mr-2" /> Administration
                </Link>
                <Link to="/superadmin/batch-creation" className="flex items-center px-3 py-2 rounded-md bg-orange-50 text-orange-700 hover:bg-orange-100 font-medium transition">
                  <BarChart className="h-5 w-5 mr-2" /> Batch Creation
                </Link>
              </div>
            )}
          </div>
          {/* Quick Actions for superadmin */}
          {user?.role === 'superadmin' && (
            <div className="mt-8">
              <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Quick Actions</h3>
              <div className="space-y-2">
                {quickActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <Link
                      key={action.name}
                      to={action.href}
                      onClick={closeSidebar}
                      className={`flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${action.color} text-white hover:opacity-90`}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {action.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </nav>

        {/* User info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <UserCheck className="h-4 w-4 text-white" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar 

export const SuperAdminSidebar = () => {
  const location = useLocation()
  const isActive = (href) => location.pathname.startsWith(href)

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
          <Link
            to="/superadmin"
            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${isActive('/superadmin') ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
          >
            <Home className={`mr-3 h-5 w-5 ${isActive('/superadmin') ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
            Dashboard
          </Link>
          <Link to="/superadmin/users/create" className="flex items-center px-3 py-2 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition">
            <Users className="h-5 w-5 mr-2" /> Student Creation
          </Link>
          <Link to="/superadmin/tests/create" className="flex items-center px-3 py-2 rounded-md bg-green-50 text-green-700 hover:bg-green-100 font-medium transition">
            <FilePlus className="h-5 w-5 mr-2" /> Test Creation
          </Link>
          <Link to="/superadmin/campuses" className="flex items-center px-3 py-2 rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 font-medium transition">
            <Building2 className="h-5 w-5 mr-2" /> Administration
          </Link>
          <Link to="/superadmin/batch-creation" className="flex items-center px-3 py-2 rounded-md bg-orange-50 text-orange-700 hover:bg-orange-100 font-medium transition">
            <BarChart className="h-5 w-5 mr-2" /> Batch Creation
          </Link>
        </div>
        {/* Any additional navigation for superadmin can go here */}
      </nav>
    </div>
  )
} 