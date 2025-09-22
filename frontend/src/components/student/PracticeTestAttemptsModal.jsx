import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, Clock, CheckCircle, XCircle, Eye, ChevronLeft } from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingSpinner from '../common/LoadingSpinner';
import TestProgressChart from './TestProgressChart';

const PracticeTestAttemptsModal = ({ isOpen, onClose, test, onViewAttemptDetails }) => {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(false);
  const { error } = useNotification();

  useEffect(() => {
    if (isOpen && test?.test_id) {
      fetchAttempts();
    }
  }, [isOpen, test]);

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/student/practice-test-attempts/${test.test_id}`);
      if (response.data.success) {
        setAttempts(response.data.data.attempts || []);
      } else {
        error('Failed to fetch test attempts');
      }
    } catch (err) {
      console.error('Error fetching attempts:', err);
      error('Failed to fetch test attempts');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (attempt) => {
    onViewAttemptDetails(attempt);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {test?.test_name} - Attempts
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {test?.module_id} • {test?.subcategory || test?.level_id || 'Practice Test'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : attempts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No attempts found</h3>
              <p className="text-gray-500">No attempts available for this test.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Progress Chart Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Progress Overview</h4>
                <div className="h-32">
                  <TestProgressChart 
                    attempts={attempts} 
                    testName={test?.test_name}
                  />
                </div>
              </div>
              
              {/* Attempts List */}
              <div className="space-y-4">
              {attempts.map((attempt, index) => (
                <motion.div
                  key={attempt.attempt_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h4 className="text-lg font-medium text-gray-900">
                          Attempt {index + 1}
                        </h4>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(attempt.score)} bg-opacity-10`}>
                          {attempt.score.toFixed(1)}%
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(attempt.submitted_at).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {attempt.time_taken || 'N/A'} min
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          {attempt.correct_answers}/{attempt.total_questions} correct
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleViewDetails(attempt)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                  </div>
                </motion.div>
              ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default PracticeTestAttemptsModal;
