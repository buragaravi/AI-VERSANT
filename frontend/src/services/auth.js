import api from './api'

export const authService = {
  login: async (username, password) => {
    return api.post('/auth/login', { username, password })
  },

  logout: async () => {
    return api.post('/auth/logout')
  },

  refreshToken: async (refreshToken) => {
    return api.post(
      '/auth/refresh',
      {},
      {
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      }
    )
  },

  getCurrentUser: async () => {
    return api.get('/auth/me')
  },

  forgotPassword: async (email) => {
    return api.post('/auth/forgot-password', { email })
  },

  resetPassword: async (token, newPassword) => {
    return api.post('/auth/reset-password', { token, new_password: newPassword })
  },
} 