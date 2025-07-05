import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Header from '../../components/common/Header';
import Sidebar from '../../components/common/Sidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useNotification } from '../../contexts/NotificationContext';
import api from '../../services/api';

const CampusReports = () => {
  const { error } = useNotification();
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    setLoading(true);
    try {
      const res = await api.get('/campus-admin/reports/student-progress');
      setProgress(res.data.data || []);
    } catch (err) {
      error('Failed to fetch progress data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <Sidebar />
      <div className="flex-1 lg:pl-64">
        <Header />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-text">Campus Results & Analytics</h1>
          </div>
          {loading ? (
            <LoadingSpinner size="md" />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="overflow-x-auto"
            >
              <table className="min-w-full bg-white rounded-lg shadow">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left">Student ID</th>
                    <th className="px-4 py-2 text-left">Module</th>
                    <th className="px-4 py-2 text-left">Level</th>
                    <th className="px-4 py-2 text-left">Score</th>
                    <th className="px-4 py-2 text-left">Attempts</th>
                  </tr>
                </thead>
                <tbody>
                  {progress.map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-2">{item.student_id}</td>
                      <td className="px-4 py-2">{item.module_id}</td>
                      <td className="px-4 py-2">{item.level_id}</td>
                      <td className="px-4 py-2">{item.score || '-'}</td>
                      <td className="px-4 py-2">{item.attempts || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampusReports; 