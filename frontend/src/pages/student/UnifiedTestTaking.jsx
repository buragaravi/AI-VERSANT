import React, { useState, useEffect } from 'react';
import { 
  PlayIcon, 
  ClockIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import Swal from 'sweetalert2';

const UnifiedTestTaking = () => {
  const [availableTests, setAvailableTests] = useState([]);
  const [currentTest, setCurrentTest] = useState(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [testStarted, setTestStarted] = useState(false);
  const [attemptId, setAttemptId] = useState(null);

  // Fetch available unified tests
  const fetchAvailableTests = async () => {
    try {
      setLoading(true);
      const studentId = localStorage.getItem('userId');
      const response = await fetch(`/api/unified-test-taking/unified-tests/available?student_id=${studentId}`, {
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

  useEffect(() => {
    fetchAvailableTests();
  }, []);

  // Start a unified test
  const startTest = async (testId) => {
    try {
      const studentId = localStorage.getItem('userId');
      const response = await fetch(`/api/unified-test-taking/unified-tests/${testId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ student_id: studentId })
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentTest(data.test);
        setAttemptId(data.attempt_id);
        setTestStarted(true);
        setTimeRemaining(data.test.total_time_minutes * 60); // Convert to seconds
        
        // Load first section questions
        await loadSectionQuestions(testId, data.test.sections[0].section_id);
        
        Swal.fire({
          icon: 'success',
          title: 'Test Started',
          text: 'Good luck with your test!'
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start test');
      }
    } catch (error) {
      console.error('Error starting test:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to start test'
      });
    }
  };

  // Load questions for a specific section
  const loadSectionQuestions = async (testId, sectionId) => {
    try {
      const response = await fetch(`/api/unified-test-taking/unified-tests/${testId}/sections/${sectionId}/questions?student_id=${localStorage.getItem('userId')}&attempt_id=${attemptId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
      } else {
        throw new Error('Failed to load section questions');
      }
    } catch (error) {
      console.error('Error loading section questions:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load section questions'
      });
    }
  };

  // Handle answer change
  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  // Submit current section
  const submitSection = async () => {
    try {
      const response = await fetch(`/api/unified-test-taking/unified-tests/${currentTest._id}/sections/${currentTest.sections[currentSection].section_id}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          student_id: localStorage.getItem('userId'),
          attempt_id: attemptId,
          answers: answers
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Move to next section or complete test
        if (currentSection < currentTest.sections.length - 1) {
          const nextSection = currentSection + 1;
          setCurrentSection(nextSection);
          await loadSectionQuestions(currentTest._id, currentTest.sections[nextSection].section_id);
          setAnswers({}); // Clear answers for next section
          
          Swal.fire({
            icon: 'success',
            title: 'Section Submitted',
            text: `Moving to Section ${nextSection + 1}`
          });
        } else {
          // All sections completed, submit entire test
          await submitTest();
        }
      } else {
        throw new Error('Failed to submit section');
      }
    } catch (error) {
      console.error('Error submitting section:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to submit section'
      });
    }
  };

  // Submit entire test
  const submitTest = async () => {
    try {
      const response = await fetch(`/api/unified-test-taking/unified-tests/${currentTest._id}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          student_id: localStorage.getItem('userId'),
          attempt_id: attemptId
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        Swal.fire({
          icon: 'success',
          title: 'Test Completed!',
          text: `Your score: ${data.total_score}/${data.total_marks}`,
          confirmButtonText: 'View Results'
        }).then(() => {
          // Reset test state
          setCurrentTest(null);
          setCurrentSection(0);
          setQuestions([]);
          setAnswers({});
          setTimeRemaining(0);
          setTestStarted(false);
          setAttemptId(null);
          
          // Refresh available tests
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
        text: 'Failed to submit test'
      });
    }
  };

  // Timer effect
  useEffect(() => {
    let interval = null;
    if (testStarted && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(time => time - 1);
      }, 1000);
    } else if (timeRemaining === 0 && testStarted) {
      // Time's up, auto-submit
      Swal.fire({
        icon: 'warning',
        title: 'Time\'s Up!',
        text: 'Your test will be automatically submitted.',
        confirmButtonText: 'OK'
      }).then(() => {
        submitTest();
      });
    }
    return () => clearInterval(interval);
  }, [testStarted, timeRemaining]);

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
    const statusConfig = {
      not_started: { color: 'bg-gray-100 text-gray-800', text: 'Not Started', icon: null },
      in_progress: { color: 'bg-yellow-100 text-yellow-800', text: 'In Progress', icon: ClockIcon },
      completed: { color: 'bg-green-100 text-green-800', text: 'Completed', icon: CheckCircleIcon }
    };
    
    const config = statusConfig[status] || statusConfig.not_started;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {Icon && <Icon className="h-3 w-3 mr-1" />}
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Test taking interface
  if (testStarted && currentTest) {
    return (
      <div className="space-y-6">
        {/* Test Header */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{currentTest.test_name}</h1>
              <p className="text-gray-600">Section {currentSection + 1} of {currentTest.sections.length}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-lg font-semibold">
                <ClockIcon className="h-5 w-5 text-red-500" />
                <span className={timeRemaining < 300 ? 'text-red-500' : 'text-gray-900'}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section Navigation */}
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              {currentTest.sections.map((section, index) => (
                <button
                  key={section.section_id}
                  onClick={() => {
                    if (index !== currentSection) {
                      setCurrentSection(index);
                      loadSectionQuestions(currentTest._id, section.section_id);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    index === currentSection
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Section {index + 1}
                </button>
              ))}
            </div>
            <div className="text-sm text-gray-500">
              {questions.length} questions in this section
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {questions.map((question, index) => (
            <div key={question.id || index} className="bg-white shadow rounded-lg p-6">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Question {index + 1}
                </h3>
                <p className="mt-2 text-gray-700">{question.question_text}</p>
              </div>

              {/* Question Type Specific Rendering */}
              {question.question_type === 'MCQ' && question.options && (
                <div className="space-y-2">
                  {question.options.map((option, optionIndex) => (
                    <label key={optionIndex} className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name={`question_${question.id || index}`}
                        value={option}
                        checked={answers[question.id || index] === option}
                        onChange={(e) => handleAnswerChange(question.id || index, e.target.value)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <span className="text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {question.question_type === 'Sentence' && (
                <div>
                  <textarea
                    value={answers[question.id || index] || ''}
                    onChange={(e) => handleAnswerChange(question.id || index, e.target.value)}
                    placeholder="Enter your answer here..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                  />
                </div>
              )}

              {question.question_type === 'Audio' && (
                <div className="space-y-4">
                  {question.audio_file_url && (
                    <audio controls className="w-full">
                      <source src={question.audio_file_url} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  )}
                  <textarea
                    value={answers[question.id || index] || ''}
                    onChange={(e) => handleAnswerChange(question.id || index, e.target.value)}
                    placeholder="Enter your response to the audio..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Submit Section Button */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {Object.keys(answers).length} of {questions.length} questions answered
            </div>
            <button
              onClick={submitSection}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <span>
                {currentSection < currentTest.sections.length - 1 ? 'Next Section' : 'Submit Test'}
              </span>
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Available tests list
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Unified Tests</h1>
        <p className="text-gray-600">Take comprehensive tests with multiple sections and question types</p>
      </div>

      {/* Available Tests */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {availableTests.map((test) => (
          <div key={test._id} className="bg-white shadow rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{test.test_name}</h3>
              {getAttemptStatusBadge(test.attempt_status)}
            </div>
            
            <p className="text-gray-600 text-sm mb-4">{test.test_description}</p>
            
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
            </div>

            <div className="flex space-x-2">
              {test.attempt_status === 'not_started' && (
                <button
                  onClick={() => startTest(test._id)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <PlayIcon className="h-4 w-4" />
                  <span>Start Test</span>
                </button>
              )}
              
              {test.attempt_status === 'in_progress' && (
                <button
                  onClick={() => startTest(test._id)}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <ArrowRightIcon className="h-4 w-4" />
                  <span>Continue Test</span>
                </button>
              )}
              
              {test.attempt_status === 'completed' && (
                <button
                  onClick={() => {/* TODO: View results */}}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>View Results</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {availableTests.length === 0 && (
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tests available</h3>
          <p className="mt-1 text-sm text-gray-500">
            There are no unified tests assigned to you at the moment.
          </p>
        </div>
      )}
    </div>
  );
};

export default UnifiedTestTaking;
