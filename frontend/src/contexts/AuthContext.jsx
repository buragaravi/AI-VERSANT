import React, { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/auth'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('access_token')
      const storedUser = localStorage.getItem('user')
      console.log('AuthContext useEffect token:', token)
      console.log('AuthContext storedUser:', storedUser)
      
      if (token && token !== 'null' && token !== 'undefined') {
        // First, try to restore user from localStorage as fallback
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser)
            console.log('Restoring user from localStorage:', parsedUser)
            setUser(parsedUser)
          } catch (e) {
            console.error('Failed to parse stored user:', e)
          }
        }

        // Then try to get fresh user data from API with timeout
        const apiCallPromise = authService.getCurrentUser()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('API timeout')), 5000)
        )

        try {
          const userData = await Promise.race([apiCallPromise, timeoutPromise])
          console.log('Raw userData response:', userData)
          console.log('userData.data:', userData.data)
          console.log('userData.data.data:', userData.data?.data)
          
          // The API returns {data: {user_data}, message, success}
          // We need to extract the actual user data from userData.data
          const freshUser = userData.data.data || userData.data
          console.log('Got fresh user data from API:', freshUser)
          setUser(freshUser)
          // Store the fresh user data
          localStorage.setItem('user', JSON.stringify(freshUser))
        } catch (error) {
          console.error('Failed to get current user:', error)
          console.log('Error details:', error.message, error.response?.status)
          
          // Only clear tokens if it's an authentication error (401, 403)
          if (error.response?.status === 401 || error.response?.status === 403) {
            console.log('Authentication error, clearing session')
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
            localStorage.removeItem('user')
            setUser(null)
          } else {
            // For network errors, timeouts, or CORS issues, keep the existing user state
            console.warn('Network/timeout error during auth check, keeping existing session')
            // If we don't have a user from localStorage, we might need to clear
            if (!storedUser) {
              console.log('No stored user found, clearing session')
              localStorage.removeItem('access_token')
              localStorage.removeItem('refresh_token')
              setUser(null)
            } else {
              console.log('Keeping existing user session from localStorage')
            }
          }
        } finally {
          setLoading(false)
        }
      } else {
        console.log('No token found, user not authenticated')
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const login = async (username, password) => {
    try {
      setLoading(true)
      setError(null)
      const response = await authService.login(username, password)
      const { user: userData, access_token, refresh_token } = response.data.data
      console.log('AuthContext login userData:', userData)
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)
      return userData
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      setUser(null)
      setError(null)
    }
  }

  const forgotPassword = async (email) => {
    try {
      setLoading(true)
      setError(null)
      await authService.forgotPassword(email)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset email')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (token, newPassword) => {
    try {
      setLoading(true)
      setError(null)
      await authService.resetPassword(token, newPassword)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const refreshToken = async () => {
    try {
      const refresh_token = localStorage.getItem('refresh_token')
      if (!refresh_token) {
        throw new Error('No refresh token')
      }

      const response = await authService.refreshToken(refresh_token)
      const { access_token } = response.data

      localStorage.setItem('access_token', access_token)
      return access_token
    } catch (err) {
      logout()
      throw err
    }
  }

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    forgotPassword,
    resetPassword,
    refreshToken,
    isAuthenticated: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 