import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Header from '../../components/common/Header'
import SuperAdminSidebar from '../../components/common/SuperAdminSidebar'
import { Plus, Edit, Trash2 } from 'lucide-react'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import {
  getUserCountsByCampus,
  getUserCountsByCourse,
  listUsersByCampus,
  listUsersByCourse,
  getCampuses,
  getCoursesByCampus
} from '../../services/api'
import { useNotification } from '../../contexts/NotificationContext'

const UserManagement = () => {
  const [campusCounts, setCampusCounts] = useState([])
  const [courseCounts, setCourseCounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUsers, setShowUsers] = useState(null) // { type: 'campus'|'course', id: string, name: string }
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const { error } = useNotification()
  const [campuses, setCampuses] = useState([])
  const [campusAdmins, setCampusAdmins] = useState([])
  const [courseAdmins, setCourseAdmins] = useState([])

  useEffect(() => {
    fetchCounts()
    fetchAdmins()
  }, [])

  const fetchCounts = async () => {
    setLoading(true)
    try {
      const [campusRes, courseRes] = await Promise.all([
        getUserCountsByCampus(),
        getUserCountsByCourse()
      ])
      setCampusCounts(campusRes.data.data)
      setCourseCounts(courseRes.data.data)
    } catch (e) {
      error('Failed to fetch user counts')
    } finally {
      setLoading(false)
    }
  }

  const fetchAdmins = async () => {
    setLoading(true)
    try {
      // Fetch all campuses
      const campusRes = await getCampuses()
      const campusList = campusRes.data.data || []
      setCampuses(campusList)
      // Extract campus admins
      setCampusAdmins(campusList.map(c => ({
        campusId: c.id,
        campusName: c.name,
        admin: c.admin
      })))
      // Fetch all courses for each campus and extract course admins
      let allCourseAdmins = []
      for (const campus of campusList) {
        const courseRes = await getCoursesByCampus(campus.id)
        const courses = courseRes.data.data || []
        allCourseAdmins = allCourseAdmins.concat(
          courses.map(course => ({
            campusId: campus.id,
            campusName: campus.name,
            courseId: course.id,
            courseName: course.name,
            admin: course.admin
          }))
        )
      }
      setCourseAdmins(allCourseAdmins)
    } catch (e) {
      error('Failed to fetch admin data')
    } finally {
      setLoading(false)
    }
  }

  const openUsersList = async (type, id, name) => {
    // Validate ID before making API call
    if (!id || id === 'undefined' || id === 'null' || id === 'N/A') {
      error('Invalid or missing ID for user listing.');
      return;
    }
    setShowUsers({ type, id, name })
    setUsersLoading(true)
    try {
      let res
      if (type === 'campus') {
        res = await listUsersByCampus(id)
      } else {
        res = await listUsersByCourse(id)
      }
      setUsers(res.data.data)
    } catch (e) {
      error('Failed to fetch users')
    } finally {
      setUsersLoading(false)
    }
  }

  const closeUsersList = () => {
    setShowUsers(null)
    setUsers([])
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SuperAdminSidebar />
      <div className="flex-1 lg:pl-64">
        <Header />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900">
              User Management
            </h1>
            <p className="mt-2 text-gray-600">
              Manage system users and their permissions.
            </p>
          </motion.div>

          {/* Users List Modal */}
          {showUsers && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
              <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl relative">
                <button
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                  onClick={closeUsersList}
                >
                  <span className="text-xl">&times;</span>
                </button>
                <h3 className="text-xl font-semibold mb-4">{showUsers.name} - Users</h3>
                {usersLoading ? <LoadingSpinner /> : (
                  <ul className="divide-y divide-gray-200">
                    {users.length === 0 ? (
                      <li className="py-3 text-center text-gray-500">No users found.</li>
                    ) : (
                      users.map((user) => (
                        <li key={user.id} className="py-3 flex items-center justify-between">
                          <span>{user.name} <span className="text-xs text-gray-500 ml-2">({user.role})</span> <span className="text-xs text-gray-400 ml-2">{user.email}</span></span>
                          <div className="flex space-x-2">
                            <button className="p-1 text-blue-600 hover:text-blue-800"><Edit className="h-4 w-4" /></button>
                            <button className="p-1 text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-lg p-8 mb-10">
            <h2 className="text-2xl font-bold text-blue-700 mb-6 border-b-2 border-blue-100 pb-2">Campus Admins</h2>
            {loading ? <LoadingSpinner /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {campusAdmins.length === 0 ? (
                  <div className="col-span-full text-center text-gray-400">No campus admins found.</div>
                ) : (
                  campusAdmins.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: idx * 0.08 }}
                      className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow hover:shadow-xl transition-shadow duration-300 p-5 flex flex-col border border-blue-200 hover:border-blue-400 cursor-pointer group"
                    >
                      <span className="text-lg font-semibold text-blue-900 mb-1">{item.campusName}</span>
                      <span className="text-base text-blue-700 group-hover:text-blue-900 transition-colors">Admin: <span className="font-medium">{item.admin?.name || 'N/A'}</span></span>
                      <span className="text-sm text-blue-500 group-hover:text-blue-700 transition-colors">Email: {item.admin?.email || 'N/A'}</span>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-lg p-8 mb-10">
            <h2 className="text-2xl font-bold text-purple-700 mb-6 border-b-2 border-purple-100 pb-2">Course Admins <span className="text-base font-normal text-gray-400">(Grouped by Campus)</span></h2>
            {loading ? <LoadingSpinner /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {courseAdmins.length === 0 ? (
                  <div className="col-span-full text-center text-gray-400">No course admins found.</div>
                ) : (
                  courseAdmins.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: idx * 0.08 }}
                      className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow hover:shadow-xl transition-shadow duration-300 p-5 flex flex-col border border-purple-200 hover:border-purple-400 cursor-pointer group"
                    >
                      <span className="text-lg font-semibold text-purple-900 mb-1">{item.campusName}</span>
                      <span className="text-base text-purple-700 group-hover:text-purple-900 transition-colors">Course: <span className="font-medium">{item.courseName}</span></span>
                      <span className="text-base text-purple-700 group-hover:text-purple-900 transition-colors">Admin: <span className="font-medium">{item.admin?.name || 'N/A'}</span></span>
                      <span className="text-sm text-purple-500 group-hover:text-purple-700 transition-colors">Email: {item.admin?.email || 'N/A'}</span>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserManagement 