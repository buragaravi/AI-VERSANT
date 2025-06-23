import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNotification } from '../../contexts/NotificationContext';
import Header from '../../components/common/Header';
import StudentSidebar from './StudentSidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../services/api';
import { User, Mail, Hash, Building, BookOpen, Users, Briefcase } from 'lucide-react';

const ProfileCard = ({ icon, title, value }) => (
    <motion.div 
        className="bg-white rounded-xl shadow-lg p-6 flex items-center space-x-6"
        whileHover={{ scale: 1.03, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}
        transition={{ duration: 0.2 }}
    >
        <div className="bg-indigo-100 p-4 rounded-full">
            {React.cloneElement(icon, { className: 'h-8 w-8 text-indigo-600' })}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-lg font-semibold text-gray-800">{value || 'N/A'}</p>
        </div>
    </motion.div>
);

const StudentProfile = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const { error } = useNotification();

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/student/profile');
                if (res.data.success) {
                    setProfile(res.data.data);
                } else {
                    error(res.data.message || 'Failed to fetch profile.');
                }
            } catch (err) {
                error(err.response?.data?.message || 'An error occurred while fetching your profile.');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [error]);

    if (loading) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><LoadingSpinner /></div>;
    }

    if (!profile) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Could not load profile.</p></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <StudentSidebar />
            <div className="flex-1 lg:pl-64">
                <Header />
                <main className="px-6 lg:px-10 py-12">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="max-w-4xl mx-auto">
                            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 text-center">
                                <motion.div 
                                    className="w-32 h-32 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg"
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    <User className="h-16 w-16 text-white" />
                                </motion.div>
                                <h1 className="text-4xl font-bold text-gray-800">{profile.name}</h1>
                                <p className="text-lg text-gray-500 mt-2">{profile.email}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <ProfileCard icon={<Hash />} title="Roll Number" value={profile.roll_number} />
                                <ProfileCard icon={<Building />} title="Campus" value={profile.campus} />
                                <ProfileCard icon={<BookOpen />} title="Course" value={profile.course} />
                                <ProfileCard icon={<Users />} title="Batch" value={profile.batch} />
                            </div>
                        </div>
                    </motion.div>
                </main>
            </div>
        </div>
    );
};

export default StudentProfile; 