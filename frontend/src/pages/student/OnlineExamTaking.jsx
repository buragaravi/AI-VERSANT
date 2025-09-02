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

  useEffect(() => {
    const fetchExam = async () => {
      try {
        setLoading(true);
        // Try to get the random assignment first (for online exams with random questions)
        try {
          const res = await api.get(`/student/test/${examId}/random-assignment`);
          setExam(res.data.data);
          setQuestions(res.data.data.questions || []);
          setAssignmentId(res.data.data.assignment_id);
        } catch (randomErr) {
          // If random assignment fails, try the regular test endpoint
          console.log('Random assignment failed, trying regular test endpoint:', randomErr);
          const res = await api.get(`/student/test/${examId}`);
          setExam(res.data.data);
          setQuestions(res.data.data.questions || []);
          setAssignmentId(null); // No assignment ID for regular tests
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

  // Auto-submit after 2 warnings
  useEffect(() => {
    if (cheatCount >= 2 && !autoSubmitted) {
      setAutoSubmitted(true);
      handleSubmit();
    }
  }, [cheatCount, autoSubmitted]);

  useEffect(() => {
    if (!loading && questions.length > 0 && !startTime) {
      setStartTime(Date.now());
    }
  }, [loading, questions, startTime]);

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    try {
      const endTime = Date.now();
      const timeTakenMs = startTime ? endTime - startTime : null;

      if (assignmentId) {
        // Submit using random assignment endpoint
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
        // First, we need to start the test to get an attempt_id
        try {
          const startRes = await api.post(`/student/tests/${examId}/start`);
          const attemptId = startRes.data.data.attempt_id;
          
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
        } catch (startErr) {
          showError('Failed to start test. Please try again.');
        }
      }
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to submit your answers. Please try again.');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!exam) return <div className="text-center p-8">Exam not found or unavailable.</div>;
  if (questions.length === 0) return <div className="text-center p-8">This exam has no questions.</div>;

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="px-6 lg:px-10 py-8">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 text-center">{exam.name}</h1>
            </div>
            {cheatWarning && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-center">
                <strong>Tab switching or leaving the exam is not allowed!</strong> ({cheatCount} warning{cheatCount > 1 ? 's' : ''})
                {autoSubmitted && <div className="mt-2 font-bold">Exam auto-submitted due to repeated tab switching.</div>}
              </div>
            )}
            <div ref={examRef} className="bg-white rounded-2xl shadow-lg mx-auto p-4 sm:p-8 max-w-md w-full min-h-[350px] flex flex-col justify-center select-none">
              <fieldset disabled={autoSubmitted} style={{ opacity: autoSubmitted ? 0.6 : 1 }}>
                <div className="text-center mb-6 text-sm font-semibold text-gray-500">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </div>
                <div className="text-center">
                  <p className="text-lg sm:text-xl text-gray-800 mb-8 break-words">{currentQuestion.question}</p>
                </div>
                {currentQuestion.question_type === 'mcq' && (
                  <div className="space-y-4 max-w-lg mx-auto w-full">
                    {Object.entries(currentQuestion.options).map(([key, value]) => (
                      <label
                        key={key}
                        className={
                          'flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all w-full ' +
                          (answers[currentQuestion.question_id] === key
                            ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-300'
                            : 'border-gray-200 hover:border-indigo-400')
                        }
                      >
                        <input
                          type="radio"
                          name={currentQuestion.question_id}
                          value={key}
                          checked={answers[currentQuestion.question_id] === key}
                          onChange={() => handleAnswerChange(currentQuestion.question_id, key)}
                          className="h-5 w-5 mr-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                        />
                        <span className="font-semibold text-gray-700">{key}.</span>
                        <span className="ml-3 text-gray-800">{value}</span>
                      </label>
                    ))}
                  </div>
                )}
                <div className="mt-10 flex justify-between items-center">
                  <button
                    onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                    disabled={currentQuestionIndex === 0}
                    className="px-6 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {currentQuestionIndex === questions.length - 1 ? (
                    <button
                      onClick={handleSubmit}
                      disabled={Object.keys(answers).length !== questions.length}
                      className="px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                    >
                      Submit
                    </button>
                  ) : (
                    <button
                      onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                      disabled={currentQuestionIndex === questions.length - 1}
                      className="px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Next
                    </button>
                  )}
                </div>
              </fieldset>
            </div>
          </motion.div>
      </main>
    </div>
  );
};

export default OnlineExamTaking; 