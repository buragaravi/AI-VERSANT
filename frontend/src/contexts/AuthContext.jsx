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
    const token = localStorage.getItem('access_token')
    console.log('AuthContext useEffect token:', token)
    if (token && token !== 'null' && token !== 'undefined') {
      authService.getCurrentUser()
        .then(userData => {
          setUser(userData)
        })
        .catch(() => {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
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