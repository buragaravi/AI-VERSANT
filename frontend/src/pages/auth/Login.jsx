import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { useNotification } from '../../contexts/NotificationContext'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { Eye, EyeOff } from 'lucide-react'

const Login = () => {
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const { success, error: showError } = useNotification()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      const user = await login(data.username, data.password)
      console.log('Login returned user:', user)
      if (user) {
        success('Login successful!')
        // Redirect based on user role
        const roleRoutes = {
          super_admin: '/superadmin',
          campus_admin: '/campus-admin',
          course_admin: '/course-admin',
          student: '/student',
        }
        const redirectPath = location.state?.from?.pathname || roleRoutes[user.role] || '/'
        navigate(redirectPath, { replace: true })
      }
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated SVG Background */}
      <svg className="absolute left-0 top-0 w-full h-full pointer-events-none z-0 animate-pulse" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a5b4fc" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>
        <circle cx="1200" cy="200" r="300" fill="url(#bg-gradient)" fillOpacity="0.15">
          <animate attributeName="cy" values="200;300;200" dur="8s" repeatCount="indefinite" />
        </circle>
        <circle cx="300" cy="700" r="250" fill="url(#bg-gradient)" fillOpacity="0.12">
          <animate attributeName="cy" values="700;600;700" dur="10s" repeatCount="indefinite" />
        </circle>
      </svg>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8 z-10"
      >
        <div>
          {/* Logo with subtle animation */}
          <motion.div
            className="flex justify-center mb-6"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8, yoyo: Infinity }}
            whileHover={{ scale: 1.05 }}
          >
            <img
              src="https://static.wixstatic.com/media/bfee2e_7d499a9b2c40442e85bb0fa99e7d5d37~mv2.png/v1/fill/w_203,h_111,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo1.png"
              alt="VERSANT Logo"
              className="h-16 w-auto drop-shadow-lg"
            />
          </motion.div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Welcome back to VERSANT
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {/* Decorative SVG illustration */}
          <div className="flex justify-center mb-4">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="32" r="32" fill="#6366F1" fillOpacity="0.12" />
              <path d="M20 44C20 38.4772 24.4772 34 30 34H34C39.5228 34 44 38.4772 44 44" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="32" cy="26" r="6" stroke="#6366F1" strokeWidth="2.5"/>
            </svg>
          </div>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                {...register('username', { required: 'Username is required' })}
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                  errors.username ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white/80 backdrop-blur-md transition-shadow duration-200 shadow focus:shadow-lg`}
                placeholder="Username"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
              )}
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                {...register('password', { required: 'Password is required' })}
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm bg-white/80 backdrop-blur-md transition-shadow duration-200 shadow focus:shadow-lg pr-10`}
                placeholder="Password"
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-blue-600 focus:outline-none"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
              >
                Forgot your password?
              </Link>
            </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-2xl"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                    <svg
                      className="h-5 w-5 text-blue-200 group-hover:text-white animate-bounce"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                  Sign in
                </>
              )}
            </button>
          </div>
          <div className="text-center">
            <Link
              to="/"
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors duration-200"
            >
              Back to Home
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default Login 