import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { DashboardProvider } from './contexts/DashboardContext'
import { NotificationProvider } from './contexts/NotificationContext'

// Auth Pages
import Login from './pages/auth/Login'
import GetStarted from './pages/auth/GetStarted'

// Super Admin Pages
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard'
import CampusManagement from './pages/superadmin/CampusManagement'
import CourseManagement from './pages/superadmin/CourseManagement'
import UserManagement from './pages/superadmin/UserManagement'
import TestManagement from './pages/superadmin/TestManagement'
import BatchManagement from './pages/superadmin/BatchManagement'
import StudentManagement from './pages/superadmin/StudentManagement'
import ResultsManagement from './pages/superadmin/ResultsManagement'
import BatchDetails from './pages/superadmin/BatchDetails'
import PracticeAnalytics from './pages/superadmin/PracticeAnalytics'
import QuestionBankUpload from './pages/superadmin/QuestionBankUpload'

// Campus Admin Pages
import CampusAdminDashboard from './pages/campus-admin/CampusAdminDashboard'
import CampusStudentManagement from './pages/campus-admin/CampusStudentManagement'
import CampusReports from './pages/campus-admin/CampusReports'
import CampusBatchManagement from './pages/campus-admin/BatchManagement'
import CampusCourseManagement from './pages/campus-admin/CourseManagement'

// Course Admin Pages
import CourseAdminDashboard from './pages/course-admin/CourseAdminDashboard'
import CourseStudentManagement from './pages/course-admin/CourseStudentManagement'
import StudentProgress from './pages/course-admin/StudentProgress'

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard'
import PracticeModules from './pages/student/PracticeModules'
import OnlineExams from './pages/student/OnlineExams'
import TestHistory from './pages/student/TestHistory'
import ProgressTracker from './pages/student/ProgressTracker'
import StudentProfile from './pages/student/Profile'
import OnlineExamTaking from './pages/student/OnlineExamTaking'
import TestResult from './pages/student/TestResult'
import PracticeModuleTaking from './pages/student/PracticeModuleTaking'

// Components
import ProtectedRoute from './components/common/ProtectedRoute'
import LoadingSpinner from './components/common/LoadingSpinner'
import ErrorBoundary from './components/common/ErrorBoundary'
import NotificationToast from './components/common/NotificationToast'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DashboardProvider>
          <NotificationProvider>
            <div className="min-h-screen bg-gray-50">
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: '#4ade80',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    duration: 4000,
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
              <NotificationToast />
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<GetStarted />} />
                <Route path="/login" element={<Login />} />

                {/* Super Admin Routes */}
                <Route
                  path="/superadmin/*"
                  element={
                    <ProtectedRoute allowedRoles={['superadmin', 'super_admin']}>
                      <Routes>
                        <Route path="/" element={<Navigate to="dashboard" replace />} />
                        <Route path="dashboard" element={<SuperAdminDashboard />} />
                        <Route path="users" element={<ProtectedRoute allowedRoles={['superadmin', 'super_admin']}><UserManagement /></ProtectedRoute>} />
                        <Route path="campuses" element={<ProtectedRoute allowedRoles={['superadmin', 'super_admin']}><CampusManagement /></ProtectedRoute>} />
                        <Route path="courses" element={<ProtectedRoute allowedRoles={['superadmin', 'super_admin']}><CourseManagement /></ProtectedRoute>} />
                        <Route path="batches" element={<ProtectedRoute allowedRoles={['superadmin', 'super_admin']}><BatchManagement /></ProtectedRoute>} />
                        <Route path="batches/:batchId" element={<ProtectedRoute allowedRoles={['superadmin', 'super_admin']}><BatchDetails /></ProtectedRoute>} />
                        <Route path="students" element={<ProtectedRoute allowedRoles={['superadmin', 'super_admin']}><StudentManagement /></ProtectedRoute>} />
                        <Route path="results" element={<ProtectedRoute allowedRoles={['superadmin', 'super_admin']}><ResultsManagement /></ProtectedRoute>} />
                        <Route path="practice-analytics" element={<ProtectedRoute allowedRoles={['superadmin', 'super_admin']}><PracticeAnalytics /></ProtectedRoute>} />
                        <Route path="tests" element={<TestManagement />} />
                        <Route path="tests/create" element={<TestManagement />} />
                        <Route path="question-bank-upload" element={<QuestionBankUpload />} />
                      </Routes>
                    </ProtectedRoute>
                  }
                />

                {/* Campus Admin Routes */}
                <Route
                  path="/campus-admin/*"
                  element={
                    <ProtectedRoute allowedRoles={['campus_admin']}>
                      <Routes>
                        <Route path="/" element={<CampusAdminDashboard />} />
                        <Route path="/students" element={<CampusStudentManagement />} />
                        <Route path="/batches" element={<CampusBatchManagement />} />
                        <Route path="/courses" element={<CampusCourseManagement />} />
                        <Route path="/results" element={<CampusReports />} />
                        <Route path="/analytics" element={<CampusReports />} />
                        <Route path="/reports" element={<CampusReports />} />
                      </Routes>
                    </ProtectedRoute>
                  }
                />

                {/* Course Admin Routes */}
                <Route
                  path="/course-admin/*"
                  element={
                    <ProtectedRoute allowedRoles={['course_admin']}>
                      <Routes>
                        <Route path="/" element={<CourseAdminDashboard />} />
                        <Route path="/students" element={<CourseStudentManagement />} />
                        <Route path="/progress" element={<StudentProgress />} />
                      </Routes>
                    </ProtectedRoute>
                  }
                />

                {/* Student Routes */}
                <Route
                  path="/student/*"
                  element={
                    <ProtectedRoute allowedRoles={['student']}>
                      <Routes>
                        <Route path="/" element={<StudentDashboard />} />
                        <Route path="/practice" element={<PracticeModules />} />
                        <Route path="/exams" element={<OnlineExams />} />
                        <Route path="/history" element={<TestHistory />} />
                        <Route path="/progress" element={<ProgressTracker />} />
                        <Route path="/profile" element={<StudentProfile />} />
                        <Route path="/exam/:examId" element={<OnlineExamTaking />} />
                        <Route path="/test-result/:resultId" element={<TestResult />} />
                        <Route path="/practice-modules/:testId" element={<PracticeModuleTaking />} />
                      </Routes>
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </NotificationProvider>
        </DashboardProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App 