import React from 'react';
import { motion } from 'framer-motion';
import Header from '../../components/common/Header';
import SuperAdminSidebar from '../../components/common/SuperAdminSidebar';
import { BarChart2, Users, BookOpen, Building } from 'lucide-react';

const StatCard = ({ icon, title, value, color }) => {
    const colors = {
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-green-600',
        purple: 'from-purple-500 to-purple-600',
        red: 'from-red-500 to-red-600',
    }
    return (
        <motion.div 
            className={`bg-gradient-to-br ${colors[color]} text-white rounded-2xl shadow-lg p-6 flex items-center space-x-4`}
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ type: 'spring', stiffness: 300 }}
        >
            <div className="bg-white bg-opacity-20 p-3 rounded-full">
                {icon}
            </div>
            <div>
                <p className="text-sm font-light uppercase tracking-wider">{title}</p>
                <p className="text-3xl font-bold">{value}</p>
            </div>
        </motion.div>
    );
};

const SystemAnalytics = () => {
    // Placeholder data
    const analyticsData = {
        totalStudents: '1,234',
        totalCampuses: '5',
        totalCourses: '28',
        totalTests: '150',
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <SuperAdminSidebar />
            <div className="flex-1 lg:pl-64">
                <Header />
                <main className="px-6 lg:px-10 py-12">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <h1 className="text-3xl font-bold text-gray-900 mb-8">System Analytics</h1>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                            <StatCard icon={<Users size={28} />} title="Total Students" value={analyticsData.totalStudents} color="blue" />
                            <StatCard icon={<Building size={28} />} title="Total Campuses" value={analyticsData.totalCampuses} color="purple" />
                            <StatCard icon={<BookOpen size={28} />} title="Total Courses" value={analyticsData.totalCourses} color="green" />
                            <StatCard icon={<BarChart2 size={28} />} title="Total Tests" value={analyticsData.totalTests} color="red" />
                        </div>

                        <div className="bg-white p-8 rounded-2xl shadow-lg text-center">
                             <BarChart2 size={60} className="mx-auto text-gray-300 mb-4"/>
                             <h2 className="text-2xl font-bold text-gray-800">Advanced Analytics Coming Soon</h2>
                             <p className="text-gray-500 mt-2">
                                 We're developing powerful visualizations and reports to provide deeper insights into system usage and student performance.
                             </p>
                        </div>

                    </motion.div>
                </main>
            </div>
        </div>
    );
};

export default SystemAnalytics; 