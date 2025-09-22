import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, Clock, CheckCircle, XCircle, ChevronLeft, Play, Download } from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingSpinner from '../common/LoadingSpinner';

const PracticeAttemptDetailsModal = ({ isOpen, onClose, attempt, onBack }) => {
  const [attemptDetails, setAttemptDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const { error } = useNotification();

  useEffect(() => {
    if (isOpen && attempt?.attempt_id) {
      fetchAttemptDetails();
    }
  }, [isOpen, attempt]);

  const fetchAttemptDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/student/practice-attempt-details/${attempt.attempt_id}`);
      if (response.data.success) {
        setAttemptDetails(response.data.data);
      } else {
        error('Failed to fetch attempt details');
      }
    } catch (err) {
      console.error('Error fetching attempt details:', err);
      error('Failed to fetch attempt details');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderQuestionDetails = (result, index) => {
    const isCorrect = result.is_correct;
    
    return (
      <div key={index} className="border border-gray-100 rounded-lg p-4">
        <div className="flex justify-between items-start mb-2">
          <h5 className="font-medium text-gray-900">
            Question {result.question_number}
          </h5>
          <div className={`flex items-center gap-1 ${
            isCorrect ? 'text-green-600' : 'text-red-600'
          }`}>
            {isCorrect ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            <span className="text-sm font-medium">
              {isCorrect ? 'Correct' : 'Incorrect'}
            </span>
          </div>
        </div>
        
        <div className="mb-3">
          <p className="text-gray-700 mb-2">
            {result.question_text || 'Question text not available'}
          </p>
        </div>

        {/* MCQ Options */}
        {result.question_type === 'mcq' && result.options && (
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-600 mb-2 block">Options:</label>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(result.options).map(([key, value]) => (
                <div key={key} className={`p-2 rounded ${
                  result.correct_answer === key ? 'bg-green-50 text-green-800' : 
                  result.student_answer === key ? 'bg-red-50 text-red-800' : 'bg-gray-50'
                }`}>
                  {key}: {value}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Student's Answer:</label>
            <p className={`mt-1 p-2 rounded ${
              isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {result.student_answer || 'No answer provided'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Correct Answer:</label>
            <p className="mt-1 p-2 rounded bg-gray-50 text-gray-800">
              {result.correct_answer || 'Not available'}
            </p>
          </div>
        </div>

        {/* Audio-specific details for listening/speaking tests */}
        {(result.question_type === 'audio' || result.question_type === 'listening' || result.question_type === 'speaking') && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Student Transcript:</label>
                <p className="mt-1 p-2 rounded bg-blue-50 text-blue-800">
                  {result.student_text || result.student_answer || 'No transcript available'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Original Text:</label>
                <p className="mt-1 p-2 rounded bg-gray-50 text-gray-800">
                  {result.original_text || result.correct_answer || 'Not available'}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Similarity Score:</label>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        result.similarity_score >= 70 ? 'bg-green-500' : 
                        result.similarity_score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(result.similarity_score || 0, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {result.similarity_score?.toFixed(1) || 0}%
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Student Audio:</label>
                {result.student_audio_url ? (
                  <div className="mt-1">
                    <audio controls className="w-full">
                      <source src={result.student_audio_url} type="audio/webm" />
                      <source src={result.student_audio_url} type="audio/wav" />
                      <source src={result.student_audio_url} type="audio/mp3" />
                      Your browser does not support the audio element.
                    </audio>
                    <a 
                      href={result.student_audio_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 mt-1 inline-block"
                    >
                      <Download className="w-3 h-3 inline mr-1" />
                      Download Audio
                    </a>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-gray-500">No audio available</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Technical test details */}
        {result.question_type === 'technical' && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Student Code:</label>
                <pre className="mt-1 p-2 bg-gray-50 rounded text-sm font-mono overflow-x-auto">
                  {result.student_answer || 'No code provided'}
                </pre>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Expected Output:</label>
                <pre className="mt-1 p-2 bg-gray-50 rounded text-sm font-mono overflow-x-auto">
                  {result.correct_answer || 'Not available'}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Explanation */}
        {result.explanation && (
          <div className="mt-4">
            <label className="text-sm font-medium text-gray-600">Explanation:</label>
            <p className="mt-1 p-2 bg-blue-50 text-blue-800 rounded text-sm">
              {result.explanation}
            </p>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Attempt Details
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {attempt?.test_name} • {attempt?.module_id}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className={`text-2xl font-bold ${getScoreColor(attempt?.score || 0)}`}>
                  {attempt?.score?.toFixed(1) || 0}%
                </div>
                <div className="text-sm text-gray-600">
                  {attempt?.correct_answers}/{attempt?.total_questions} correct
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : !attemptDetails ? (
            <div className="text-center py-8">
              <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No details found</h3>
              <p className="text-gray-500">No detailed results available for this attempt.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Attempt Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">Submitted:</span>
                    <span className="font-medium">
                      {new Date(attemptDetails.attempt.submitted_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">Time Taken:</span>
                    <span className="font-medium">
                      {attemptDetails.attempt.time_taken || 'N/A'} min
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium capitalize">
                      {attemptDetails.attempt.status || 'Completed'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Questions */}
              {attemptDetails.detailed_results && attemptDetails.detailed_results.length > 0 ? (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900">Question Details</h4>
                  {attemptDetails.detailed_results.map((result, index) => 
                    renderQuestionDetails(result, index)
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No question details</h3>
                  <p className="text-gray-500">No detailed question results available for this attempt.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default PracticeAttemptDetailsModal;
