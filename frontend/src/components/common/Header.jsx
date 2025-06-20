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
    <header className="sticky top-0 z-40 bg-white shadow-md flex items-center justify-center h-16 relative">
      <div className="absolute left-4 flex items-center space-x-4">
        {/* Empty for spacing or add left-side content if needed */}
      </div>
      <div className="flex items-center space-x-4 justify-center w-full">
        <img src="https://static.wixstatic.com/media/bfee2e_7d499a9b2c40442e85bb0fa99e7d5d37~mv2.png/v1/fill/w_203,h_111,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo1.png" alt="Logo" className="h-10 w-auto" />
        <span className="text-xl font-bold text-blue-700">VERSANT SYSTEM</span>
      </div>
      <div className="absolute right-4 flex items-center space-x-4">
        {/* Notifications */}
        <button className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500">
          <Bell className="h-6 w-6" />
        </button>
        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center space-x-3 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          >
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <span className="hidden md:block text-sm font-medium text-gray-700">
              {user?.name}
            </span>
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
              <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                <p className="font-medium">{user?.name}</p>
                <p className="text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
              <Link
                to="/profile"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setUserMenuOpen(false)}
              >
                Your Profile
              </Link>
              <Link
                to="/settings"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setUserMenuOpen(false)}
              >
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
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