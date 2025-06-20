import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Users, FilePlus, Building2, BarChart } from 'lucide-react'

const SuperAdminSidebar = () => {
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
          <Link to="/superadmin/campuses" className="flex items-center px-3 py-2 rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100 font-medium transition">
            <Building2 className="h-5 w-5 mr-2" /> Administration
          </Link>
          <Link to="/superadmin/batch-creation" className="flex items-center px-3 py-2 rounded-md bg-orange-50 text-orange-700 hover:bg-orange-100 font-medium transition">
            <BarChart className="h-5 w-5 mr-2" /> Batch Creation
          </Link>
          <Link to="/superadmin/tests/create" className="flex items-center px-3 py-2 rounded-md bg-green-50 text-green-700 hover:bg-green-100 font-medium transition">
            <FilePlus className="h-5 w-5 mr-2" /> Test Creation
          </Link>
          <Link to="/superadmin/results" className="flex items-center px-3 py-2 rounded-md bg-pink-50 text-pink-700 hover:bg-pink-100 font-medium transition">
            <BarChart className="h-5 w-5 mr-2" /> Results
          </Link>
        </div>
      </nav>
    </div>
  )
}

export default SuperAdminSidebar 