import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  PlayIcon, 
  ArrowRightIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import Swal from 'sweetalert2';
import api from '../../services/api';

const UnifiedTestTaking = () => {
  const { testId: urlTestId } = useParams();
  const navigate = useNavigate();
  
  // Test state
  const [availableTests, setAvailableTests] = useState([]);
  const [currentTest, setCurrentTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentSection, setCurrentSection] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [testStarted, setTestStarted] = useState(false);
  const [attemptId, setAttemptId] = useState(null);
  const [selectedTestId, setSelectedTestId] = useState(null);
  const [now, setNow] = useState(Date.now());

  // Fetch available unified tests
  const fetchAvailableTests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/unified-test-taking/unified-tests/available`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableTests(data.tests || []);
      } else {
        throw new Error('Failed to fetch available tests');
      }
    } catch (error) {
      console.error('Error fetching available tests:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to fetch available tests'
      });
    } finally {
      setLoading(false);
    }
  };

  // Start a unified test - NEW SECTION-BASED APPROACH
  const startTest = async (testId) => {
    try {
      console.log('Starting test with ID:', testId);
      setSelectedTestId(testId);
      
      // First, get the student view of the test
      const studentViewResponse = await fetch(`/api/unified-test-taking/unified-tests/${testId}/student-view`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!studentViewResponse.ok) {
        const errorData = await studentViewResponse.json();
        throw new Error(errorData.message || 'Failed to load test data');
      }
      
      const studentViewData = await studentViewResponse.json();
      console.log('Student view data:', studentViewData);
      
      // Now start the test attempt
      const startResponse = await fetch(`/api/unified-test-taking/unified-tests/${testId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      if (!startResponse.ok) {
        const errorData = await startResponse.json();
        throw new Error(errorData.message || 'Failed to start test');
      }
      
      const startData = await startResponse.json();
      console.log('Test start response:', startData);
      
      // Set up the test with section-based data
      setCurrentTest(studentViewData.data);
      setAttemptId(startData.data.attempt_id);
      setTestStarted(true);
      setCurrentSection(0);
      setCurrentQuestionIndex(0);
      setAnswers({});
      
      // Set questions for the first section
      if (studentViewData.data.sections && studentViewData.data.sections.length > 0) {
        const firstSection = studentViewData.data.sections[0];
        setQuestions(firstSection.questions || []);
        setTimeRemaining(firstSection.time_limit_minutes * 60);
        console.log('Set questions for first section:', firstSection.questions?.length);
        console.log('First question structure:', firstSection.questions?.[0]);
      }
      
      Swal.fire({
        icon: 'success',
        title: 'Test Started',
        text: 'Good luck with your test!'
      });
      
    } catch (error) {
      console.error('Error starting test:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to start test'
      });
    }
  };

  // Move to next section
  const nextSection = () => {
    if (currentTest && currentTest.sections && currentSection < currentTest.sections.length - 1) {
      const nextSectionIndex = currentSection + 1;
      const nextSection = currentTest.sections[nextSectionIndex];
      
      setCurrentSection(nextSectionIndex);
      setQuestions(nextSection.questions || []);
      setCurrentQuestionIndex(0);
      setTimeRemaining(nextSection.time_limit_minutes * 60);
      setAnswers({});
      
      console.log(`Moved to section ${nextSectionIndex + 1}: ${nextSection.section_name}`);
    }
  };
  
  // Move to previous section (if allowed)
  const prevSection = () => {
    if (currentSection > 0) {
      const prevSectionIndex = currentSection - 1;
      const prevSection = currentTest.sections[prevSectionIndex];
      
      setCurrentSection(prevSectionIndex);
      setQuestions(prevSection.questions || []);
      setCurrentQuestionIndex(0);
      setTimeRemaining(prevSection.time_limit_minutes * 60);
      setAnswers({});
      
      console.log(`Moved to section ${prevSectionIndex + 1}: ${prevSection.section_name}`);
    }
  };
  
  // Check if current section is completed
  const isCurrentSectionCompleted = () => {
    if (!currentTest || !currentTest.sections || !currentTest.sections[currentSection]) {
      return false;
    }
    
    const currentSectionData = currentTest.sections[currentSection];
    const sectionQuestions = currentSectionData.questions || [];
    
    // Check if all questions in current section are answered
    return sectionQuestions.every(q => answers[q.question_id]);
  };
  
  // Auto-advance to next section when time runs out
  const handleSectionTimeUp = () => {
    if (currentTest && currentTest.sections && currentSection < currentTest.sections.length - 1) {
      Swal.fire({
        icon: 'warning',
        title: 'Section Time Up!',
        text: 'Moving to next section automatically.',
        confirmButtonText: 'OK'
      }).then(() => {
        nextSection();
      });
    } else {
      // Last section, submit test
      Swal.fire({
        icon: 'warning',
        title: 'Time\'s Up!',
        text: 'Your test will be automatically submitted.',
        confirmButtonText: 'OK'
      }).then(() => {
        submitTest();
      });
    }
  };

  // Handle answer change
  const handleAnswerChange = (questionId, answer) => {
    console.log('Answer change:', { questionId, answer });
    setAnswers(prev => {
      const newAnswers = {
        ...prev,
        [questionId]: answer
      };
      console.log('Updated answers:', newAnswers);
      return newAnswers;
    });
  };

  // Navigate to next question
  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  // Navigate to previous question
  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Submit entire test
  const submitTest = async () => {
    try {
      console.log('Submitting test with ID:', selectedTestId);
      console.log('Current test:', currentTest);
      console.log('Answers being submitted:', answers);
      console.log('Answer keys:', Object.keys(answers));
      console.log('Answer values:', Object.values(answers));
      
      const testId = selectedTestId || currentTest?.id || currentTest?._id;
      if (!testId) {
        throw new Error('Test ID not found');
      }
      
      const response = await fetch(`/api/unified-test-taking/unified-tests/${testId}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          attempt_id: attemptId,
          answers: answers
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Test submission response:', data);
        
        Swal.fire({
          icon: 'success',
          title: 'Test Submitted Successfully!',
          text: `Your score: ${data.data?.percentage?.toFixed(2) || 0}%`,
          showConfirmButton: true
        }).then(() => {
          // Navigate back to available tests
          setTestStarted(false);
          setCurrentTest(null);
          setQuestions([]);
          setAnswers({});
          setCurrentQuestionIndex(0);
          setCurrentSection(0);
          setAttemptId(null);
          setSelectedTestId(null);
          fetchAvailableTests();
        });
      } else {
        throw new Error('Failed to submit test');
      }
    } catch (error) {
      console.error('Error submitting test:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to submit test'
      });
    }
  };


  // Timer effect - Section-based timing
  useEffect(() => {
    let interval = null;
    if (testStarted && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(time => {
          if (time <= 1) {
            // Time's up for current section
            handleSectionTimeUp();
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [testStarted, timeRemaining, currentSection, currentTest]);

  // Format time
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Get attempt status badge
  const getAttemptStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="h-3 w-3 mr-1" />
            Completed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="h-3 w-3 mr-1" />
            In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Available
          </span>
        );
    }
  };

  // Real-time clock update (like online exam system)
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper to format duration (like online exam system)
  const formatDuration = (milliseconds) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Helper to get test status and countdown (like online exam system)
  const getTestStatus = (test) => {
    // Parse dates as IST (Indian Standard Time)
    const start = test.start_date ? new Date(test.start_date) : null;
    const end = test.end_date ? new Date(test.end_date) : null;
    
    if (!start && !end) {
      return { status: 'open', message: 'Always Available' };
    }
    
    if (start && end) {
      if (now < start.getTime()) {
        // Not yet open
        const diff = start.getTime() - now;
        return {
          status: 'upcoming',
          message: `Opens in ${formatDuration(diff)}`
        };
      } else if (now > end.getTime()) {
        // Already closed
        return { status: 'closed', message: 'Test Closed' };
      } else {
        // Open
        return { status: 'open', message: 'Test is Open' };
      }
    } else if (start) {
      // Only start date
      if (now < start.getTime()) {
        const diff = start.getTime() - now;
        return {
          status: 'upcoming',
          message: `Opens in ${formatDuration(diff)}`
        };
      } else {
        return { status: 'open', message: 'Test is Open' };
      }
    } else if (end) {
      // Only end date
      if (now > end.getTime()) {
        return { status: 'closed', message: 'Test Closed' };
      } else {
        return { status: 'open', message: 'Test is Open' };
      }
    }
    
    return { status: 'open', message: 'Test is Open' };
  };

  // Sort tests: open first, then upcoming, then closed (like online exam system)
  const sortedTests = availableTests.slice().sort((a, b) => {
    const aStatus = getTestStatus(a).status;
    const bStatus = getTestStatus(b).status;
    const order = { open: 0, upcoming: 1, closed: 2 };
    return order[aStatus] - order[bStatus];
  });

  useEffect(() => {
    console.log('useEffect triggered with urlTestId:', urlTestId);
    if (urlTestId) {
      // If we have a testId from URL, start that specific test
      console.log('Starting test from URL with ID:', urlTestId);
      startTest(urlTestId);
    } else {
      // Otherwise, fetch available tests
      console.log('No URL testId, fetching available tests');
      fetchAvailableTests();
    }
  }, [urlTestId]);

  // Test taking interface
  if (testStarted && currentTest) {
    const currentQuestion = questions[currentQuestionIndex];
    const currentSectionData = currentTest.sections[currentSection];
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <main className="container mx-auto px-4 py-6">
          {/* Header with Timer */}
          <header className="pb-6 mb-6 border-b border-gradient-to-r from-transparent via-slate-200 to-transparent flex justify-between items-center">
            <motion.h1 
              className="text-3xl font-bold text-slate-800"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              {currentTest.test_name}
            </motion.h1>
            
            <motion.div 
              className="text-right"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="text-sm text-slate-600 mb-1">Section Time Remaining</div>
              <div className={`text-3xl font-bold ${timeRemaining < 300 ? 'text-red-500' : 'text-blue-600'}`}>
                {formatTime(timeRemaining)}
              </div>
            </motion.div>
          </header>

          {/* Section Tabs */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-slate-700 mb-4">Test Sections</h3>
              <div className="flex space-x-2 overflow-x-auto">
                {currentTest.sections.map((section, index) => (
                  <button
                    key={section.section_id}
                    onClick={() => {
                      if (index !== currentSection) {
                        // Only allow moving to previous sections or next section if current is completed
                        if (index < currentSection || (index === currentSection + 1 && isCurrentSectionCompleted())) {
                          setCurrentSection(index);
                          setQuestions(section.questions || []);
                          setCurrentQuestionIndex(0);
                          setTimeRemaining(section.time_limit_minutes * 60);
                          setAnswers({});
                        }
                      }
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 whitespace-nowrap ${
                      index === currentSection
                        ? 'bg-blue-600 text-white shadow-lg'
                        : index < currentSection
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : index === currentSection + 1 && isCurrentSectionCompleted()
                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={index > currentSection + 1 || (index === currentSection + 1 && !isCurrentSectionCompleted())}
                  >
                    <div className="text-sm font-semibold">{section.section_name}</div>
                    <div className="text-xs opacity-75">
                      {section.time_limit_minutes} min • {section.questions?.length || 0} questions
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Current Section Info */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {currentSectionData?.section_name || 'Current Section'}
                  </h2>
                  <p className="text-slate-600">
                    {currentSectionData?.section_description || ''}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-slate-700">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </div>
                  <div className="text-sm text-slate-500">
                    Section {currentSection + 1} of {currentTest.sections.length}
                  </div>
                </div>
              </div>
              
              <div className="w-full bg-slate-200 rounded-full h-3">
                <motion.div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </motion.div>

          {/* Question Card */}
          <motion.div 
            className="bg-white rounded-2xl shadow-xl p-8 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {currentQuestion && (
              <>
                {/* Question Header */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-slate-800">
                      Question {currentQuestionIndex + 1}
                    </h2>
                    <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      {currentQuestion.question_type || 'MCQ'}
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                    <p className="text-lg text-slate-700 leading-relaxed">
                      {currentQuestion.question_text}
                    </p>
                  </div>
                </div>

                {/* Question Type Specific Rendering */}
                {currentQuestion.question_type === 'MCQ' && currentQuestion.options && (
                  <motion.div 
                    className="space-y-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                  >
                    {Object.entries(currentQuestion.options).map(([key, value], index) => (
                      <motion.div
                        key={key}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                        className={`border-2 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${
                          answers[currentQuestion.question_id] === value
                            ? 'border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50 ring-4 ring-blue-100 shadow-lg scale-[1.02]'
                            : 'border-slate-200 hover:border-blue-300 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50'
                        }`}
                        onClick={() => handleAnswerChange(currentQuestion.question_id, value)}
                      >
                        <div className="flex items-center">
                          <motion.div
                            className={`h-5 w-5 mr-4 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                              answers[currentQuestion.question_id] === value
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-slate-300 hover:border-blue-400'
                            }`}
                          >
                            {answers[currentQuestion.id] === value && (
                              <motion.div
                                className="w-2 h-2 bg-white rounded-full"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.2 }}
                              />
                            )}
                          </motion.div>
                          <input
                            type="radio"
                            name={currentQuestion.question_id}
                            value={value}
                            checked={answers[currentQuestion.question_id] === value}
                            onChange={() => handleAnswerChange(currentQuestion.question_id, value)}
                            className="sr-only"
                          />
                          <span className="font-semibold text-slate-600 mr-3 text-lg">{key}.</span>
                          <span className="text-slate-700 text-lg leading-relaxed">{value}</span>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}

                {currentQuestion.question_type === 'Sentence' && (
                  <motion.div 
                    className="space-y-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                  >
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Your Answer:
                      </label>
                      <textarea
                        value={answers[currentQuestion.question_id] || ''}
                        onChange={(e) => handleAnswerChange(currentQuestion.question_id, e.target.value)}
                        placeholder="Enter your answer here..."
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        rows={6}
                      />
                    </div>
                  </motion.div>
                )}

                {currentQuestion.question_type === 'Audio' && (
                  <motion.div 
                    className="space-y-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                  >
                    {currentQuestion.audio_file_url && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-blue-700 font-semibold mb-2">Listen to the audio:</p>
                        <audio controls className="w-full">
                          <source src={currentQuestion.audio_file_url} type="audio/mpeg" />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Your Response:
                      </label>
                      <textarea
                        value={answers[currentQuestion.question_id] || ''}
                        onChange={(e) => handleAnswerChange(currentQuestion.question_id, e.target.value)}
                        placeholder="Enter your response to the audio..."
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        rows={6}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Technical Questions */}
                {currentQuestion.question_type === 'Technical' && (
                  <motion.div 
                    className="space-y-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                  >
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-700">Language:</span>
                        <select
                          value={answers[currentQuestion.question_id]?.language || 'python'}
                          onChange={(e) => handleAnswerChange(currentQuestion.question_id, {
                            ...answers[currentQuestion.question_id],
                            language: e.target.value
                          })}
                          className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="python">Python</option>
                          <option value="javascript">JavaScript</option>
                          <option value="java">Java</option>
                          <option value="cpp">C++</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Write your code:
                      </label>
                      <textarea
                        value={answers[currentQuestion.question_id]?.code || ''}
                        onChange={(e) => handleAnswerChange(currentQuestion.question_id, {
                          ...answers[currentQuestion.question_id],
                          code: e.target.value
                        })}
                        placeholder="Write your code here..."
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                        rows={12}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Writing Questions */}
                {currentQuestion.question_type === 'Writing' && (
                  <motion.div 
                    className="space-y-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                  >
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-yellow-800 mb-2">Writing Instructions:</h4>
                      <p className="text-yellow-700">
                        Write a clear and well-structured response. Pay attention to grammar, spelling, and organization.
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Your Writing:
                      </label>
                      <textarea
                        value={answers[currentQuestion.question_id] || ''}
                        onChange={(e) => handleAnswerChange(currentQuestion.question_id, e.target.value)}
                        placeholder="Write your response here..."
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        rows={10}
                      />
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>

          {/* Navigation */}
          <motion.div 
            className="flex justify-between items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <div className="flex space-x-4">
              {/* Previous Section Button */}
              {currentSection > 0 && (
                <button
                  onClick={prevSection}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  <span>Prev Section</span>
                </button>
              )}
              
              {/* Previous Question Button */}
              <button
                onClick={prevQuestion}
                disabled={currentQuestionIndex === 0}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2 ${
                  currentQuestionIndex === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-slate-600 hover:bg-slate-700 text-white hover:shadow-lg'
                }`}
              >
                <ChevronLeftIcon className="h-5 w-5" />
                <span>Previous</span>
              </button>
            </div>

            <div className="text-sm text-slate-600 text-center">
              <div>{Object.keys(answers).length} of {questions.length} questions answered</div>
              <div className="text-xs text-slate-500">
                Section {currentSection + 1} of {currentTest.sections.length}
              </div>
            </div>

            <div className="flex space-x-4">
              {/* Next Question Button */}
              <button
                onClick={nextQuestion}
                disabled={currentQuestionIndex === questions.length - 1}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2 ${
                  currentQuestionIndex === questions.length - 1
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg'
                }`}
              >
                <span>Next</span>
                <ChevronRightIcon className="h-5 w-5" />
              </button>
              
              {/* Next Section Button */}
              {currentSection < currentTest.sections.length - 1 && isCurrentSectionCompleted() && (
                <button
                  onClick={nextSection}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2"
                >
                  <span>Next Section</span>
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </motion.div>

          {/* Section Completion and Test Submission */}
          {currentQuestionIndex === questions.length - 1 && (
            <motion.div 
              className="mt-8 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              {currentSection < currentTest.sections.length - 1 ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 font-medium">
                      Section completed! You can move to the next section or submit the entire test.
                    </p>
                  </div>
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={nextSection}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-lg flex items-center space-x-2"
                    >
                      <span>Next Section</span>
                      <ArrowRightIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={submitTest}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-lg flex items-center space-x-2"
                    >
                      <span>Submit Test</span>
                      <ArrowRightIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 font-medium">
                      Final section completed! Ready to submit your test.
                    </p>
                  </div>
                  <button
                    onClick={submitTest}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 hover:shadow-lg flex items-center space-x-2 mx-auto"
                  >
                    <span>Submit Test</span>
                    <ArrowRightIcon className="h-5 w-5" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </main>
      </div>
    );
  }

  // Available tests list
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-slate-800 mb-4">Unified Tests</h1>
          <p className="text-xl text-slate-600">Take comprehensive tests with multiple sections</p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : sortedTests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center py-12"
          >
            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircleIcon className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Tests Available</h3>
              <p className="text-gray-600">There are currently no unified tests available for you to take.</p>
            </div>
          </motion.div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sortedTests.map((test) => {
              const { status, message } = getTestStatus(test);
              return (
              <motion.div
                key={test._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-white shadow-lg rounded-2xl p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{test.test_name}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    status === 'open' ? 'bg-green-100 text-green-800' :
                    status === 'upcoming' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {status === 'open' ? 'Open' : status === 'upcoming' ? 'Upcoming' : 'Closed'}
                  </span>
                </div>
                
                <p className="text-gray-600 text-sm mb-4">{test.test_description}</p>
                
                {/* Status Message */}
                <div className="text-xs font-medium mb-2">
                  <span className={
                    status === 'open' ? 'text-green-600' :
                    status === 'upcoming' ? 'text-yellow-600' :
                    'text-red-600'
                  }>
                    {message}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm text-gray-500 mb-4">
                  <div className="flex justify-between">
                    <span>Sections:</span>
                    <span>{test.total_sections}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Questions:</span>
                    <span>{test.total_questions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>{test.total_time_minutes} min</span>
                  </div>
                  {test.start_date && (
                    <div className="flex justify-between">
                      <span>Start Date:</span>
                      <span>{new Date(test.start_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {test.end_date && (
                    <div className="flex justify-between">
                      <span>End Date:</span>
                      <span>{new Date(test.end_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {!test.start_date && !test.end_date && (
                    <div className="flex justify-between text-green-600">
                      <span>Availability:</span>
                      <span>Always Open</span>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  <button
                    className={
                      `flex-1 px-4 py-2 text-white text-sm font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2 ` +
                      (test.attempt_status === 'completed'
                        ? 'bg-gray-400 cursor-not-allowed'
                        : status === 'open'
                          ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                          : 'bg-gray-300 cursor-not-allowed')
                    }
                    onClick={() => {
                      if (test.attempt_status === 'completed') {
                        return;
                      }
                      if (status === 'open') {
                        console.log('Start Test button clicked with test ID:', test._id);
                        startTest(test._id);
                      }
                    }}
                    disabled={test.attempt_status === 'completed' || status !== 'open'}
                  >
                    {test.attempt_status === 'completed' ? (
                      <>
                        <CheckCircleIcon className="h-4 w-4" />
                        <span>Completed</span>
                      </>
                    ) : status === 'open' ? (
                      <>
                        <PlayIcon className="h-4 w-4" />
                        <span>Start Test</span>
                      </>
                    ) : status === 'upcoming' ? (
                      <>
                        <ClockIcon className="h-4 w-4" />
                        <span>Not Yet Available</span>
                      </>
                    ) : (
                      <>
                        <XCircleIcon className="h-4 w-4" />
                        <span>Closed</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default UnifiedTestTaking;