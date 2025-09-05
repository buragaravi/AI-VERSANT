import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

const OnlineExamTaking = () => {
  const { examId } = useParams();
  const { error: showError, success } = useNotification();
  const [questions, setQuestions] = useState([]);
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cheatWarning, setCheatWarning] = useState(false);
  const [cheatCount, setCheatCount] = useState(0);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const examRef = useRef(null);
  const navigate = useNavigate();
  const [startTime, setStartTime] = useState(null);
  const [assignmentId, setAssignmentId] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [examDuration, setExamDuration] = useState(0);
  const [timerWarning, setTimerWarning] = useState(false);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const fetchExam = async () => {
      try {
        setLoading(true);
        // First, get the test details to check if it's a random assignment test
        try {
          const testRes = await api.get(`/student/test/${examId}`);
          const testData = testRes.data.data;
          
          // Set exam duration from the test data
          const duration = testData.duration || 0;
          setExamDuration(duration);
          setTimeRemaining(duration * 60); // Convert minutes to seconds
          
          // Log duration for debugging
          console.log('Exam duration set to:', duration, 'minutes');
          
          // Check if this is a random assignment test
          if (testData.test_type === 'random_assignment' || testData.has_random_questions) {
            // Try to get the random assignment
            try {
              const res = await api.get(`/student/test/${examId}/random-assignment`);
              setExam(res.data.data);
              setQuestions(res.data.data.questions || []);
              setAssignmentId(res.data.data.assignment_id);
            } catch (randomErr) {
              // If random assignment fails, fall back to regular test
              console.log('Random assignment failed, using regular test:', randomErr);
              setExam(testData);
              setQuestions(testData.questions || []);
              setAssignmentId(null);
            }
          } else {
            // Regular online test - use regular test endpoint
            setExam(testData);
            setQuestions(testData.questions || []);
            setAssignmentId(null);
            
            // Start the test to get attempt_id for regular tests
            try {
              const startRes = await api.post(`/student/tests/${examId}/start`);
              setAttemptId(startRes.data.data.attempt_id);
              console.log('Test started with attempt_id:', startRes.data.data.attempt_id);
            } catch (startErr) {
              console.error('Error starting test:', startErr);
              showError('Failed to start test. Please try again.');
            }
          }
        } catch (err) {
          throw err; // Re-throw to be caught by outer catch
        }
      } catch (err) {
        showError('Failed to load exam.');
        setExam(null);
      } finally {
        setLoading(false);
      }
    };
    if (examId) fetchExam();
  }, [examId, showError]);

  useEffect(() => {
    // Anti-cheating: Prevent tab switching
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setCheatWarning(true);
        setCheatCount(prev => prev + 1);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Prevent copy/cut/paste and text selection
    const preventAction = (e) => e.preventDefault();
    const examNode = examRef.current;
    if (examNode) {
      examNode.addEventListener('copy', preventAction);
      examNode.addEventListener('cut', preventAction);
      examNode.addEventListener('paste', preventAction);
      examNode.addEventListener('contextmenu', preventAction);
      examNode.addEventListener('selectstart', preventAction);
    }
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (examNode) {
        examNode.removeEventListener('copy', preventAction);
        examNode.removeEventListener('cut', preventAction);
        examNode.removeEventListener('paste', preventAction);
        examNode.removeEventListener('contextmenu', preventAction);
        examNode.removeEventListener('selectstart', preventAction);
      }
    };
  }, []);

  // Auto-submit after 2 warnings or when time runs out
  useEffect(() => {
    if (cheatCount >= 2 && !autoSubmitted) {
      setAutoSubmitted(true);
      handleSubmit();
    }
  }, [cheatCount, autoSubmitted]);

  // Auto-submit when time runs out (only if timer is active and properly initialized)
  useEffect(() => {
    if (isTimerActive && timeRemaining <= 0 && examDuration > 0 && !autoSubmitted) {
      setAutoSubmitted(true);
      handleSubmit();
    }
  }, [timeRemaining, isTimerActive, examDuration, autoSubmitted]);

  // Timer persistence - save timer state to localStorage
  useEffect(() => {
    if (isTimerActive && timeRemaining > 0) {
      localStorage.setItem(`exam_timer_${examId}`, JSON.stringify({
        timeRemaining,
        startTime: startTime,
        examDuration
      }));
    }
  }, [timeRemaining, isTimerActive, examId, startTime, examDuration]);

  // Load timer state from localStorage on component mount
  useEffect(() => {
    if (examId && examDuration > 0) {
      const savedTimer = localStorage.getItem(`exam_timer_${examId}`);
      if (savedTimer) {
        try {
          const timerData = JSON.parse(savedTimer);
          const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
          const remaining = Math.max(0, timerData.timeRemaining - elapsed);
          console.log('Loading timer from localStorage:', { timerData, elapsed, remaining });
          setTimeRemaining(remaining);
          if (remaining > 0) {
            setIsTimerActive(true);
          }
        } catch (err) {
          console.error('Error loading timer state:', err);
        }
      }
    }
  }, [examId, examDuration, startTime]);

  // Clean up localStorage when exam is submitted
  useEffect(() => {
    return () => {
      if (examId) {
        localStorage.removeItem(`exam_timer_${examId}`);
      }
    };
  }, [examId]);

  useEffect(() => {
    if (!loading && questions.length > 0 && !startTime) {
      setStartTime(Date.now());
      setIsTimerActive(true);
      console.log('Timer activated. Duration:', examDuration, 'minutes, Time remaining:', timeRemaining, 'seconds');
    }
  }, [loading, questions, startTime, examDuration, timeRemaining]);

  // Timer countdown effect
  useEffect(() => {
    if (isTimerActive && timeRemaining > 0) {
      console.log('Starting timer countdown. Initial time:', timeRemaining);
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          
          // Show warning when 5 minutes or less remain
          if (newTime <= 300 && !timerWarning) {
            setTimerWarning(true);
            showError('Warning: Only 5 minutes remaining!');
          }
          
          // Show critical warning when 1 minute remains
          if (newTime <= 60 && newTime > 0) {
            showError(`Critical: Only ${newTime} seconds remaining!`);
          }
          
          // Auto-submit when time runs out
          if (newTime <= 0) {
            console.log('Time expired, auto-submitting...');
            setIsTimerActive(false);
            setAutoSubmitted(true);
            handleSubmit();
            return 0;
          }
          
          return newTime;
        });
      }, 1000);
    } else if (timeRemaining <= 0 && examDuration > 0) {
      console.log('Timer stopped. Time remaining:', timeRemaining, 'Exam duration:', examDuration);
      setIsTimerActive(false);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerActive, timeRemaining, timerWarning, showError, examDuration]);

  // Format time for display (clean MM:SS format)
  const formatTime = (seconds) => {
    const totalSeconds = Math.floor(seconds); // Remove any decimal places
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    try {
      // Stop the timer
      setIsTimerActive(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      const endTime = Date.now();
      const timeTakenMs = startTime ? endTime - startTime : null;

      if (assignmentId) {
        // Submit using random assignment endpoint
        console.log('Submitting via random assignment endpoint with assignment_id:', assignmentId);
        const payload = {
          assignment_id: assignmentId,
          answers: answers,
          time_taken_ms: timeTakenMs
        };
        const res = await api.post(`/student/test/${examId}/submit-random`, payload);
        if (res.data.success) {
          success('Exam submitted successfully!');
          navigate('/student/history');
        } else {
          showError(res.data.message || 'Failed to submit your answers.');
        }
      } else {
        // Submit using regular test endpoint (for tests without random questions)
        console.log('Submitting via regular test endpoint for test_id:', examId);
        
        if (!attemptId) {
          // If we don't have an attempt_id, try to start the test first
          try {
            const startRes = await api.post(`/student/tests/${examId}/start`);
            setAttemptId(startRes.data.data.attempt_id);
            console.log('Got attempt_id during submit:', startRes.data.data.attempt_id);
          } catch (startErr) {
            console.error('Error starting test during submit:', startErr);
            showError('Failed to start test. Please try again.');
            return;
          }
        }
        
        const payload = {
          attempt_id: attemptId,
          answers: answers,
          time_taken_ms: timeTakenMs
        };
        const res = await api.post(`/student/tests/${examId}/submit`, payload);
        if (res.data.success) {
          success('Exam submitted successfully!');
          navigate('/student/history');
        } else {
          showError(res.data.message || 'Failed to submit your answers.');
        }
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to submit your answers. Please try again.');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!exam) return <div className="text-center p-8">Exam not found or unavailable.</div>;
  if (questions.length === 0) return <div className="text-center p-8">This exam has no questions.</div>;

  // Debug logging
  console.log('Exam state:', {
    autoSubmitted,
    isTimerActive,
    timeRemaining,
    examDuration,
    cheatCount,
    questionsLength: questions.length
  });

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-4">
        {/* Header with Timer */}
        <header className="pb-3 mb-4 border-b border-gray-200 flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{exam.name}</h1>
          <div className="flex items-center space-x-4">
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            {/* Timer Display - Top Right */}
            {examDuration > 0 ? (
              <div className={`px-4 py-2 rounded-lg border-2 font-bold text-lg ${
                timeRemaining <= 300 
                  ? timeRemaining <= 60 
                    ? 'bg-red-100 border-red-500 text-red-700 animate-pulse' 
                    : 'bg-yellow-100 border-yellow-500 text-yellow-700'
                  : 'bg-blue-100 border-blue-500 text-blue-700'
              }`}>
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span>{formatTime(timeRemaining)}</span>
                </div>
              </div>
            ) : (
              <div className="px-4 py-2 rounded-lg border-2 font-bold text-lg bg-gray-100 border-gray-300 text-gray-600">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span>No Time Limit</span>
                </div>
              </div>
            )}
          </div>
        </header>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-lg shadow-md p-6">
          {/* Warning Messages */}
          {cheatWarning && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-center">
              <strong>Tab switching or leaving the exam is not allowed!</strong> ({cheatCount} warning{cheatCount > 1 ? 's' : ''})
              {autoSubmitted && <div className="mt-2 font-bold">Exam auto-submitted due to repeated tab switching.</div>}
            </div>
          )}
          {timeRemaining <= 60 && timeRemaining > 0 && !autoSubmitted && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-center animate-pulse">
              <strong>⚠️ CRITICAL: Only {formatTime(timeRemaining)} remaining!</strong>
              <div className="mt-1 text-sm">Exam will auto-submit when time runs out.</div>
            </div>
          )}
          {timeRemaining <= 300 && timeRemaining > 60 && !timerWarning && !autoSubmitted && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded mb-4 text-center">
              <strong>⏰ Warning: Only {formatTime(timeRemaining)} remaining!</strong>
              <div className="mt-1 text-sm">Please complete your exam soon.</div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress: {Object.keys(answers).length} / {questions.length} answered</span>
              <span>{Math.round((Object.keys(answers).length / questions.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Question Area */}
            <div className="lg:col-span-2">
              <div ref={examRef} className="select-none">
                <fieldset disabled={autoSubmitted} style={{ opacity: autoSubmitted ? 0.6 : 1 }}>
                  <h3 className="text-xl font-semibold mb-6 text-gray-800">{currentQuestion.question}</h3>
                  
                  {currentQuestion.question_type === 'mcq' && (
                    <div className="space-y-3">
                      {Object.entries(currentQuestion.options).map(([key, value]) => (
                        <div
                          key={key}
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${
                            answers[currentQuestion.question_id] === value
                              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                          }`}
                          onClick={() => handleAnswerChange(currentQuestion.question_id, value)}
                        >
                          <div className="flex items-center">
                            <input
                              type="radio"
                              name={currentQuestion.question_id}
                              value={value}
                              checked={answers[currentQuestion.question_id] === value}
                              onChange={() => handleAnswerChange(currentQuestion.question_id, value)}
                              className="h-4 w-4 mr-3 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="font-semibold text-gray-700 mr-2">{key}.</span>
                            <span className="text-gray-800">{value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex justify-between mt-8">
                    <button
                      onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                      disabled={currentQuestionIndex === 0}
                      className="px-6 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Previous
                    </button>
                    {currentQuestionIndex === questions.length - 1 ? (
                      <button
                        onClick={handleSubmit}
                        disabled={Object.keys(answers).length !== questions.length || autoSubmitted}
                        className={`px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white flex items-center ${
                          timeRemaining <= 60 
                            ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                            : 'bg-green-600 hover:bg-green-700'
                        } disabled:bg-gray-400`}
                      >
                        {autoSubmitted ? 'Auto-Submitting...' : 'Submit Exam'}
                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                        disabled={currentQuestionIndex === questions.length - 1}
                        className="px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center"
                      >
                        Next
                        <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}
                  </div>
                </fieldset>
              </div>
            </div>

            {/* Question Navigation Panel */}
            <div className="lg:col-span-1">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="text-center mb-4 font-semibold text-gray-700">Question Navigation</h5>
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {questions.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                        index === currentQuestionIndex
                          ? 'bg-blue-600 text-white'
                          : answers[questions[index]?.question_id]
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
                
                {/* Legend */}
                <div className="mb-4 text-xs text-gray-600">
                  <div className="flex items-center mb-1">
                    <div className="w-3 h-3 bg-blue-600 rounded mr-2"></div>
                    <span>Current Question</span>
                  </div>
                  <div className="flex items-center mb-1">
                    <div className="w-3 h-3 bg-green-100 border border-green-300 rounded mr-2"></div>
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-white border border-gray-300 rounded mr-2"></div>
                    <span>Not Answered</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <button 
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 flex items-center justify-center"
                    onClick={() => {
                      // Mark for review functionality (placeholder)
                      console.log('Mark for review');
                    }}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                    </svg>
                    Mark for Review
                  </button>
                  <button 
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 flex items-center justify-center"
                    onClick={() => {
                      // Clear response functionality
                      handleAnswerChange(currentQuestion.question_id, '');
                    }}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear Response
                  </button>
                </div>
              </div>
            </div>
          </div>
          </motion.div>
      </main>
    </div>
  );
};

export default OnlineExamTaking; 