import axios from 'axios'

// Determine API URL based on environment
// In development, use the Vite proxy (/api)
// In production, use the full URL
const isDevelopment = import.meta.env.DEV
const API_URL = import.meta.env.VITE_API_URL || (isDevelopment ? '/api' : 'https://versant-backend.onrender.com')

console.log('API Service - VITE_API_URL:', import.meta.env.VITE_API_URL)
console.log('API Service - DEV mode:', isDevelopment)
console.log('API Service - Using API_URL:', API_URL)

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

console.log('API Service - Created axios instance with baseURL:', api.defaults.baseURL)

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token && token !== 'null' && token !== 'undefined') {
      console.log('Sending Authorization header:', token)
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // If we are sending FormData, we need to let the browser set the Content-Type
    // which will include the boundary.
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    
    console.log('API Request:', config.method?.toUpperCase(), config.url)
    return config
  },
  (error) => {
    console.error('API Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url)
    return response
  },
  async (error) => {
    console.error('API Response Error:', error.response?.status, error.config?.url, error.message)
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        console.log('Attempting token refresh with:', refreshToken)
        if (refreshToken && refreshToken !== 'null' && refreshToken !== 'undefined') {
          const response = await axios.post(
            `${API_URL}/auth/refresh`,
            { refresh_token: refreshToken }
          )
          
          const { access_token } = response.data.data
          localStorage.setItem('access_token', access_token)
          
          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        // Don't automatically redirect, let the component handle it
        console.error('Token refresh failed:', refreshError)
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        // Remove the automatic redirect - let the AuthContext handle it
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export const getCourses = async () => {
  return api.get('/course-management/');
};

export const getCampuses = async () => {
  return api.get('/campus-management/');
};

export const createCampus = async (campusData) => {
  return api.post('/campus-management/', campusData);
};

export const updateCampus = async (campusId, campusData) => {
  return api.put(`/campus-management/${campusId}`, campusData);
};

export const deleteCampus = async (campusId) => {
  return api.delete(`/campus-management/${campusId}`);
};

export const getCampusDetails = async (campusId) => {
  return api.get(`/campus-management/${campusId}/details`);
};

export const getCoursesByCampus = async (campusId) => {
  return api.get(`/course-management/${campusId}`);
};

export const createCourse = async (campusId, courseData) => {
  return api.post(`/course-management/${campusId}`, courseData);
};

export const updateCourse = async (courseId, courseData) => {
  return api.put(`/course-management/${courseId}`, courseData);
};

export const deleteCourse = async (courseId) => {
  return api.delete(`/course-management/${courseId}`);
};

export const getUserCountsByCampus = async () => {
  return api.get('/user-management/counts/campus');
};

export const getUserCountsByCourse = async () => {
  return api.get('/user-management/counts/course');
};

export const listUsersByCampus = async (campusId) => {
  return api.get(`/user-management/list/campus/${campusId}`);
};

export const listUsersByCourse = async (courseId) => {
  return api.get(`/user-management/list/course/${courseId}`);
};

// Batch Management API functions
export const getBatches = async () => {
  return api.get('/batch-management/');
};

export const createBatch = async (batchData) => {
  return api.post('/batch-management/', batchData);
};

export const updateBatch = async (batchId, batchData) => {
  return api.put(`/batch-management/${batchId}`, batchData);
};

export const deleteBatch = async (batchId) => {
  return api.delete(`/batch-management/${batchId}`);
};

export const getBatchCampuses = async () => {
  return api.get('/batch-management/campuses');
};

export const getBatchCourses = async (campusIds) => {
  const params = new URLSearchParams();
  campusIds.forEach(id => params.append('campus_ids', id));
  return api.get(`/batch-management/courses?${params.toString()}`);
};

export const validateStudentUpload = async (formData) => {
  return api.post('/batch-management/validate-student-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const uploadStudentsToBatch = async (campusId, batchId, students) => {
  return api.post('/batch-management/upload-students', {
    campus_id: campusId,
    batch_id: batchId,
    students: students,
  });
};

export const getBatchStudents = async (batchId, course_id) => {
  let url = `/batch-management/batch/${batchId}/students`;
  if (course_id) {
    url += `?course_id=${course_id}`;
  }
  return api.get(url);
};

export const getBatchesForCourse = async (courseId) => {
  return api.get(`/batch-management/course/${courseId}/batches`);
};

export const getStudentDetails = async (studentId) => {
  return api.get(`/batch-management/student/${studentId}`);
};

export const authorizeStudentLevel = async (studentId, level) => {
  return api.post(`/batch-management/student/${studentId}/authorize-level`, { level });
};

// Student Management
export const updateStudent = async (studentId, data) => {
  return api.put(`/batch-management/student/${studentId}`, data);
};

export const deleteStudent = async (studentId) => {
  return api.delete(`/batch-management/student/${studentId}`);
};

export default api