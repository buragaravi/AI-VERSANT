import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useDashboard } from '../../contexts/DashboardContext'
import { Bell, Menu, Search, User } from 'lucide-react'

const Header = () => {
  const { user, logout } = useAuth()
  const { toggleSidebar } = useDashboard()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    setUserMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 bg-white shadow-md flex items-center h-20 relative px-4 sm:px-8 border-b-2 border-emerald-400">
      {/* Left: Hamburger menu */}
      <div className="flex items-center flex-shrink-0">
        <button
          className="md:hidden p-3 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500"
          onClick={toggleSidebar}
        >
          <Menu className="h-7 w-7" />
        </button>
      </div>
      {/* Center: Logo and system name */}
      <div className="flex-1 flex items-center justify-center">
        <div className="h-14 w-28 sm:h-16 sm:w-36 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mr-3 shadow-md">
          <img src="https://static.wixstatic.com/media/bfee2e_7d499a9b2c40442e85bb0fa99e7d5d37~mv2.png/v1/fill/w_203,h_111,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo1.png" alt="Logo" className="h-10 w-auto sm:h-12 object-contain rounded-xl" />
        </div>
        <span className="text-2xl sm:text-3xl font-bold text-black ml-2 whitespace-nowrap">VERSANT SYSTEM</span>
      </div>
      {/* Right: Profile icon and menu */}
      <div className="flex items-center space-x-6 flex-shrink-0">
        {/* Notifications - Hidden for students */}
        {user?.role !== 'student' && (
          <button className="p-3 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500">
            <Bell className="h-7 w-7" />
          </button>
        )}
        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center space-x-4 p-3 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500"
          >
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            <span className="hidden md:block text-lg font-medium text-black">
              {user?.name}
            </span>
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
              <div className="px-4 py-2 text-base text-black border-b border-gray-100">
                <p className="font-medium">{user?.name}</p>
                <p className="text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
              <Link
                to={user?.role === 'student' ? '/student/profile' : '/profile'}
                className="block px-4 py-2 text-base text-black hover:bg-gray-100"
                onClick={() => setUserMenuOpen(false)}
              >
                Your Profile
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-base text-black hover:bg-gray-100"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header 