import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // Redirect to appropriate dashboard based on user role
    const roleRoutes = {
      super_admin: '/superadmin',
      campus_admin: '/campus-admin',
      course_admin: '/course-admin',
      student: '/student',
    }

    const redirectPath = roleRoutes[user?.role] || '/'
    return <Navigate to={redirectPath} replace />
  }

  return children
}

export default ProtectedRoute 