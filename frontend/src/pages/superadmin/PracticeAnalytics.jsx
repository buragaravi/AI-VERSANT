import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import SuperAdminSidebar from '../../components/common/SuperAdminSidebar';
import Header from '../../components/common/Header';
import { BarChart2, Users, BookOpen } from 'lucide-react';
import api from '../../services/api';

const StatCard = ({ icon, title, value, color }) => {
    const colors = {
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-green-600',
        purple: 'from-purple-500 to-purple-600',
        red: 'from-red-500 to-red-600',
    };
    return (
        <motion.div
            className={`bg-gradient-to-br ${colors[color]} text-white rounded-2xl shadow-lg p-6 flex items-center space-x-4`}
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ type: 'spring', stiffness: 300 }}
        >
            <div className="bg-white bg-opacity-20 p-3 rounded-full">{icon}</div>
            <div>
                <p className="text-sm font-light uppercase tracking-wider">{title}</p>
                <p className="text-3xl font-bold">{value}</p>
            </div>
        </motion.div>
    );
};

const PracticeAnalytics = () => {
    const [stats, setStats] = useState({ totalPracticeTests: 0, totalStudents: 0, modules: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const res = await api.get('/superadmin/practice-overview');
                const data = res.data.data || {};
                setStats({
                    totalPracticeTests: data.total_practice_tests || 0,
                    totalStudents: data.total_students_practicing || 0,
                    modules: data.modules || []
                });
            } catch (e) {
                setStats({ totalPracticeTests: 0, totalStudents: 0, modules: [] });
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="min-h-screen bg-background flex">
            <SuperAdminSidebar />
            <div className="flex-1 lg:pl-64">
                <Header />
                <main className="px-6 lg:px-10 py-12">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <h1 className="text-3xl font-bold text-gray-900 mb-8">Practice Analytics</h1>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                            <StatCard icon={<BarChart2 size={28} />} title="Total Practice Tests" value={loading ? '...' : stats.totalPracticeTests} color="blue" />
                            <StatCard icon={<Users size={28} />} title="Unique Students Practicing" value={loading ? '...' : stats.totalStudents} color="green" />
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-lg">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Module-wise Practice Stats</h2>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 rounded-xl overflow-hidden">
                                    <thead className="bg-gradient-to-r from-blue-700 to-black">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Module</th>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Attempts</th>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Unique Students</th>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Avg Score</th>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Completion Rate (%)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan="5" className="text-center text-gray-500 py-8">Loading...</td></tr>
                                        ) : stats.modules.length === 0 ? (
                                            <tr><td colSpan="5" className="text-center text-gray-500 py-8">No data found.</td></tr>
                                        ) : stats.modules.map((mod, idx) => (
                                            <tr key={mod.module_name || idx} className={idx % 2 === 0 ? 'bg-blue-50' : 'bg-white'}>
                                                <td className="px-4 py-2 text-sm font-bold text-blue-900">{mod.module_display_name || mod.module_name}</td>
                                                <td className="px-4 py-2 text-sm text-black">{mod.total_attempts}</td>
                                                <td className="px-4 py-2 text-sm text-blue-700">{mod.unique_students}</td>
                                                <td className="px-4 py-2 text-sm text-blue-600">{mod.average_score?.toFixed(1) ?? '-'}</td>
                                                <td className="px-4 py-2 text-sm text-green-700">{mod.completion_rate?.toFixed(1) ?? '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                </main>
            </div>
        </div>
    );
};

export default PracticeAnalytics;
