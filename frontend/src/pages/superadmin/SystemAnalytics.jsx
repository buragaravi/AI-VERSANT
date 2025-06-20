import React from 'react'
import { motion } from 'framer-motion'
import Header from '../../components/common/Header'
import SuperAdminSidebar from '../../components/common/SuperAdminSidebar'

const SystemAnalytics = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SuperAdminSidebar />
      <div className="flex-1 lg:pl-64">
        <Header />
        <main className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <h1 className="text-3xl font-bold text-gray-900">
                System Analytics
              </h1>
              <p className="mt-2 text-gray-600">
                View system-wide performance metrics and analytics.
              </p>
            </motion.div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-gray-600">System analytics functionality coming soon...</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default SystemAnalytics 