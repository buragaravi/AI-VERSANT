import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, isAuthenticated } = useAuth()
  const location = useLocation()

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner />
  }

  // Check if user is authenticated
  if (!isAuthenticated) {
    // Store the current location to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check role-based access
  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on user role
    const roleRoutes = {
      super_admin: '/superadmin',
      campus_admin: '/campus-admin',
      course_admin: '/course-admin',
      student: '/student',
    }

    const redirectPath = roleRoutes[user.role] || '/'
    return <Navigate to={redirectPath} replace />
  }

  // User is authenticated and has proper role, render the protected content
  return children
}

export default ProtectedRoute 