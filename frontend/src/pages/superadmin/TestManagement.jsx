import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useForm, Controller } from 'react-hook-form'
import { useAuth } from '../../contexts/AuthContext'
import { useNotification } from '../../contexts/NotificationContext'
import { useLocation, useNavigate } from 'react-router-dom'
import Header from '../../components/common/Header'
import SuperAdminSidebar from '../../components/common/SuperAdminSidebar'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import api from '../../services/api'
import { Upload, Plus, Trash2, ChevronLeft, ChevronRight, FileText, CheckCircle, Briefcase, Users, FileQuestion, Sparkles, Eye, Edit, MoreVertical, Play, Pause, AlertTriangle, ChevronDown } from 'lucide-react'
import { MultiSelect } from 'react-multi-select-component'
import clsx from 'clsx'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { uploadModuleQuestions, getRandomQuestionsFromBank, createTestFromBank, getAllTests, getStudentCount } from '../../services/api'
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Modal from '../../components/common/Modal';
import TestSummaryDisplay from './TestSummaryDisplay';
import MCQUpload from './MCQUpload';
import AudioUpload from './AudioUpload';
import SentenceUpload from './SentenceUpload';
import ReadingUpload from './ReadingUpload';
import TestQuestionUpload from './TestQuestionUpload';
import WritingUpload from './WritingUpload';

// Config for modules and levels
const MODULE_CONFIG = {
  GRAMMAR: {
    label: 'Grammar',
    type: 'MCQ',
    levels: ['Noun', 'Pronoun', 'Verb', 'Adjective', 'Adverb', 'Preposition', 'Conjunction', 'Interjection'],
    uploadComponent: MCQUpload,
  },
  VOCABULARY: {
    label: 'Vocabulary',
    type: 'MCQ',
    levels: ['Beginner', 'Intermediate', 'Advanced'],
    uploadComponent: MCQUpload,
  },
  READING: {
    label: 'Reading',
    type: 'MCQ',
    levels: ['Beginner', 'Intermediate', 'Advanced'],
    uploadComponent: ReadingUpload,
  },
  LISTENING: {
    label: 'Listening',
    type: 'SENTENCE',
    levels: ['Beginner', 'Intermediate', 'Advanced'],
    uploadComponent: SentenceUpload,
  },
  SPEAKING: {
    label: 'Speaking',
    type: 'SENTENCE',
    levels: ['Beginner', 'Intermediate', 'Advanced'],
    uploadComponent: SentenceUpload,
  },
  WRITING: {
    label: 'Writing',
    type: 'PARAGRAPH',
    levels: ['Beginner', 'Intermediate', 'Advanced'],
    uploadComponent: WritingUpload,
  },
  CRT: {
    label: 'CRT',
    type: 'MCQ',
    levels: ['Aptitude', 'Reasoning', 'Technical'],
    uploadComponent: MCQUpload,
  },
};

const TestManagement = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  const location = useLocation()
  const [view, setView] = useState('list')
  const [currentTestId, setCurrentTestId] = useState(null)
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingTests, setProcessingTests] = useState(new Set())
  const { success, error, a } = useNotification()
  const { loading: isAuthLoading } = useAuth()
  const pollingIntervalRef = useRef(null)
  const [selectedTest, setSelectedTest] = useState(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [baseName, setBaseName] = useState('')
  const [sequence, setSequence] = useState(1)

  // Check if we're on the question-bank-upload route and set view accordingly
  useEffect(() => {
    if (location.pathname === '/superadmin/question-bank-upload') {
      setView('module-upload')
    }
  }, [location.pathname])

  const fetchTests = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/test-management/tests')
      setTests(res.data.data)
    } catch (err) {
      error("Failed to fetch tests.")
    } finally {
      setLoading(false)
    }
  }, [error])

  useEffect(() => {
    if (!isAuthLoading && view === 'list') {
      fetchTests()
    }
  }, [view, fetchTests, isAuthLoading])

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await api.get('/test-management/tests');
        const updatedTests = res.data.data;
        setTests(updatedTests);

        const stillProcessing = new Set();
        let allDone = true;

        processingTests.forEach(testId => {
          const matchingTest = updatedTests.find(t => t._id === testId);
          if (matchingTest && matchingTest.status === 'processing') {
            stillProcessing.add(testId);
            allDone = false;
          }
        });

        setProcessingTests(stillProcessing);

        if (allDone) {
          success("All pending tests have finished processing.");
        }
      } catch (err) {
        error("Could not update test statuses.");
      }
    };

    if (processingTests.size > 0 && !pollingIntervalRef.current) {
      pollingIntervalRef.current = setInterval(poll, 5000); // Poll every 5 seconds
    } else if (processingTests.size === 0 && pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [processingTests, success, error]);

  const handleTestCreated = (newTestId) => {
    setView('list')
    if (newTestId) {
      setProcessingTests(prev => new Set(prev).add(newTestId));
      // Manually add a placeholder to the list for immediate feedback
      setTests(prev => [
        {
          _id: newTestId,
          name: 'New Test (Processing...)',
          status: 'processing',
          question_count: 'N/A',
          campus_name: 'N/A',
          test_type: 'N/A'
        },
        ...prev
      ]);
    }
  }

  const handleViewTest = async (testId) => {
    if (!testId) {
      error("Cannot view test: Invalid Test ID provided.");
      return;
    }
    setIsPreviewLoading(true);
    setView('preview'); // Switch view immediately to show loading state
    try {
      const response = await api.get(`/test-management/tests/${testId}`);
      if (response.data.success) {
        console.log("Fetched Test Data:", JSON.stringify(response.data.data, null, 2));
        setSelectedTest(response.data.data);
      } else {
        error(response.data.message || 'Failed to fetch test details.');
        setView('list'); // Go back to list if fetch fails
      }
    } catch (err) {
      console.error("Error fetching test details:", err);
      error('An error occurred while fetching test details.');
      setView('list'); // Go back to list on error
    } finally {
      setIsPreviewLoading(false);
    }
  }
  
  const handleDeleteTest = async (testId) => {
    if (window.confirm('Are you sure you want to delete this test? This action cannot be undone.')) {
      try {
        await api.delete(`/test-management/tests/${testId}`)
        success("Test deleted successfully.")
        fetchTests() // Refresh the list
      } catch (err) {
        error(err.response?.data?.message || "Failed to delete test.")
      }
    }
  }

  const handleBackToList = () => {
    setView('list')
  }

  const renderContent = () => {
    switch (view) {
      case 'create':
        return <TestCreationWizard onTestCreated={handleTestCreated} setView={setView} />
      case 'preview':
        if (isPreviewLoading) {
          return <div className="flex justify-center items-center h-screen"><LoadingSpinner /></div>;
        }
        return <TestPreviewView test={selectedTest} onBack={handleBackToList} />
      case 'module-upload':
        return <ModuleQuestionUpload onBack={() => setView('list')} />
      case 'list':
      default:
        return <TestListView tests={tests} loading={loading} setView={setView} onViewTest={handleViewTest} onDeleteTest={handleDeleteTest} />
    }
  }

  return (
          <div className="min-h-screen bg-gray-50">
      <SuperAdminSidebar onModuleUpload={() => setView('module-upload')} />
                  <div className="flex-1">
        <Header />
        <main className="px-6 lg:px-10 py-12">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}

const TestListView = ({ tests, loading, setView, onViewTest, onDeleteTest }) => {
  const [filters, setFilters] = useState({
    module: '',
    level: '',
    campus: '',
    status: '',
  });

  const filteredTests = useMemo(() => {
    return tests.filter(test => {
      return (
        (filters.module ? test.module_name === filters.module : true) &&
        (filters.level ? test.level_name === filters.level : true) &&
        (filters.campus ? test.campus_name === filters.campus : true) &&
        (filters.status ? test.status === filters.status : true)
      );
    });
  }, [tests, filters]);

  const moduleOptions = useMemo(() => [...new Set(tests.map(t => t.module_name).filter(Boolean))], [tests]);
  const levelOptions = useMemo(() => [...new Set(tests.map(t => t.level_name).filter(Boolean))], [tests]);
  const campusOptions = useMemo(() => [...new Set(tests.map(t => t.campus_name).filter(Boolean))], [tests]);
  const statusOptions = useMemo(() => [...new Set(tests.map(t => t.status).filter(Boolean))], [tests]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({ module: '', level: '', campus: '', status: '' });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Test Management</h1>
          <p className="mt-2 text-gray-500">Browse, manage, and create new tests.</p>
        </div>
        <button 
          onClick={() => setView('create')}
          className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105"
        >
          <Plus className="h-5 w-5 mr-2"/>
          Create Test
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-lg">
        <div className="p-6 flex justify-between items-center border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800">All Created Tests</h3>
          <button onClick={clearFilters} className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">Clear Filters</button>
        </div>
        <div className="overflow-x-auto">
          {loading ? <LoadingSpinner /> : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th scope="col" className="w-1/6 px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Test Name</th>
                  <th scope="col" className="w-1/12 px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                  <th scope="col" className="w-1/12 px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <span className="block mb-1">Module</span>
                    <select name="module" value={filters.module} onChange={handleFilterChange} className="w-full border-gray-300 rounded-md shadow-sm text-xs font-normal normal-case focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-white">
                      <option value="">All</option>
                      {moduleOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </th>
                  <th scope="col" className="w-1/12 px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <span className="block mb-1">Level</span>
                    <select name="level" value={filters.level} onChange={handleFilterChange} className="w-full border-gray-300 rounded-md shadow-sm text-xs font-normal normal-case focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-white">
                      <option value="">All</option>
                      {levelOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </th>
                  <th scope="col" className="w-1/6 px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <span className="block mb-1">Campus</span>
                    <select name="campus" value={filters.campus} onChange={handleFilterChange} className="w-full border-gray-300 rounded-md shadow-sm text-xs font-normal normal-case focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-white">
                      <option value="">All</option>
                      {campusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </th>
                  <th scope="col" className="w-1/6 px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Batch</th>
                  <th scope="col" className="w-1/6 px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Courses</th>
                  <th scope="col" className="w-1/12 px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Questions</th>
                  <th scope="col" className="w-1/12 px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <span className="block mb-1">Status</span>
                    <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full border-gray-300 rounded-md shadow-sm text-xs font-normal normal-case focus:ring-indigo-500 focus:border-indigo-500 bg-gray-700 text-white">
                      <option value="">All</option>
                      {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </th>
                  <th scope="col" className="w-1/12 px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Created At</th>
                  <th scope="col" className="w-1/12 relative px-6 py-4"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTests.map((test, index) => (
                  <tr key={test._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50 hover:bg-indigo-50'}>
                    <td className="px-6 py-4 whitespace-normal break-words text-sm font-medium text-gray-900">{test.name}</td>
                    <td className="px-6 py-4 whitespace-normal break-words text-sm text-gray-500 capitalize">{test.test_type}</td>
                    <td className="px-6 py-4 whitespace-normal break-words text-sm text-gray-500 capitalize">{test.module_name}</td>
                    <td className="px-6 py-4 whitespace-normal break-words text-sm text-gray-500 capitalize">{test.level_name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">{test.campus_name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">{test.batches}</td>
                    <td className="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">{test.courses}</td>
                    <td className="px-6 py-4 whitespace-normal break-words text-sm text-gray-500 text-center">{test.question_count}</td>
                    <td className="px-6 py-4 whitespace-normal break-words text-sm">
                      <span className={clsx('px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full', {
                        'bg-green-100 text-green-800': test.status === 'active',
                        'bg-yellow-100 text-yellow-800': test.status === 'processing',
                        'bg-red-100 text-red-800': test.status === 'failed',
                      })}>
                        {test.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-normal break-words text-sm text-gray-500">{test.created_at}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button onClick={() => onViewTest(test._id)} className="text-indigo-600 hover:text-indigo-900 p-1 rounded-full hover:bg-gray-200" title="View Test"><Eye className="h-5 w-5"/></button>
                        <button className="text-gray-400 cursor-not-allowed p-1 rounded-full" title="Edit Test (soon)"><Edit className="h-5 w-5"/></button>
                        <button onClick={() => onDeleteTest(test._id)} className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-gray-200" title="Delete Test"><Trash2 className="h-5 w-5"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </motion.div>
  )
}

const TestPreviewView = ({ test, onBack }) => {
  const { success, error } = useNotification();
  const [notifying, setNotifying] = useState(false);
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [notifyResults, setNotifyResults] = useState([]);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const navigate = useNavigate();

  if (!test) {
    return (
      <div className="text-center p-8">
        <h2 className="text-lg font-semibold text-gray-800">No test data to display.</h2>
        <p className="text-gray-500">There might have been an issue loading the test details.</p>
        <button onClick={onBack} className="mt-4 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600">
          Return to List
        </button>
      </div>
    );
  }

  // Helper to format date/time
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Notify students handler
  const handleNotifyStudents = async () => {
    setNotifyModalOpen(true);
    setNotifyLoading(true);
    setNotifyResults([]);
    try {
      const res = await api.post(`/test-management/notify-students/${test._id}`);
      if (res.data && res.data.results) {
        setNotifyResults(res.data.results);
        success('Notification process completed!');
      } else {
        error('No results returned from notification API.');
      }
    } catch (e) {
      error('Failed to send notification.');
    } finally {
      setNotifyLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{test.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-gray-500 text-base">
            <span className="flex items-center"><Briefcase className="w-4 h-4 mr-1.5" /> <span className="font-semibold">Type:</span> {test.test_type}</span>
            <span className={clsx("flex items-center", {
              'text-green-600': test.status === 'active',
              'text-yellow-600': test.status === 'processing',
              'text-red-600': test.status === 'failed'
            })}>
              <CheckCircle className="w-4 h-4 mr-1.5" /> <span className="font-semibold">Status:</span> <span className="font-semibold">{test.status}</span>
            </span>
            <span className="flex items-center"><FileQuestion className="w-4 h-4 mr-1.5" /> <span className="font-semibold">Questions:</span> {test.questions?.length || 0}</span>
            {test.test_type === 'online' && (
              <>
                {test.startDateTime && (
                  <span className="flex items-center"><span className="font-semibold text-gray-700 ml-2">Start:</span> {formatDateTime(test.startDateTime)}</span>
                )}
                {test.endDateTime && (
                  <span className="flex items-center"><span className="font-semibold text-gray-700 ml-2">End:</span> {formatDateTime(test.endDateTime)}</span>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-2 md:gap-4 mt-4 md:mt-0">
          <button onClick={onBack} className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-800 bg-gray-100 hover:bg-gray-200 transition-colors">
            <ChevronLeft className="h-5 w-5 mr-1" /> Back to List
          </button>
          <button
            onClick={handleNotifyStudents}
            disabled={notifying}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {notifying ? 'Notifying...' : 'Notify Students'}
          </button>
          <button
            onClick={() => navigate(`/superadmin/results?test_id=${test._id}`)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
          >
            Results
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {test.questions && test.questions.map((q, index) => (
          <div key={q.question_id || index} className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-lg text-gray-800 mb-4">Question {index + 1}</h3>
            <p className="text-gray-700 mb-4 whitespace-pre-line">{q.question}</p>
            {q.question_type === 'mcq' ? (
              <div className="space-y-2 text-base">
                <h4 className="font-semibold text-gray-600 mb-1">Options:</h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 list-none pl-0">
                  {Object.entries(q.options).map(([key, value]) => (
                    <li key={key} className={clsx('rounded border px-4 py-2', {
                      'bg-green-50 border-green-400 font-bold text-green-700': q.correct_answer === key,
                      'bg-gray-50 border-gray-200': q.correct_answer !== key
                    })}>
                      <span className="font-semibold">{key}:</span> {value}
                    </li>
                  ))}
                </ul>
                <div className="pt-2">
                  <p className="font-semibold text-gray-600">Answer: <span className="font-bold text-green-600">{q.correct_answer}</span></p>
                </div>
              </div>
            ) : q.audio_presigned_url ? (
              <audio controls>
                <source src={q.audio_presigned_url} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            ) : (
              <div className="flex items-center space-x-2 bg-yellow-100 text-yellow-800 text-sm font-medium px-4 py-3 rounded-md">
                <AlertTriangle className="h-5 w-5" />
                <span>Audio not available.</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Notify Students Modal */}
      {notifyModalOpen && (
        <Modal onClose={() => setNotifyModalOpen(false)} title="Notify Students">
          <div className="mb-4">
            <h3 className="font-semibold text-xl mb-4 text-center text-blue-700">Notification Status</h3>
            {notifyLoading ? (
              <div className="text-blue-600 text-center py-8">Sending notifications...</div>
            ) : (
              <div className="overflow-x-auto rounded-lg shadow">
                <table className="min-w-full text-sm border rounded-lg bg-white">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Email</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Mobile</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Test Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Email Notification</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">SMS Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifyResults.map((s, idx) => (
                      <tr key={s.email} className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                        <td className="px-4 py-2 border-b">{s.name}</td>
                        <td className="px-4 py-2 border-b">{s.email}</td>
                        <td className="px-4 py-2 border-b">{s.mobile_number || '-'}</td>
                        <td className="px-4 py-2 border-b">
                          {s.test_status === 'completed' ? (
                            <span className="text-green-600 font-semibold">Completed</span>
                          ) : (
                            <span className="text-yellow-600 font-semibold">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-2 border-b">
                          {s.notify_status === 'sent' && <span className="text-green-700 font-semibold">Sent</span>}
                          {s.notify_status === 'skipped' && <span className="text-gray-500 font-semibold">Skipped</span>}
                          {s.notify_status === 'pending' && <span className="text-blue-500 font-semibold">Pending</span>}
                          {s.notify_status === 'failed' && <span className="text-red-600 font-semibold">Failed</span>}
                        </td>
                        <td className="px-4 py-2 border-b">
                          {s.sms_status === 'sent' && <span className="text-green-700 font-semibold">Sent</span>}
                          {s.sms_status === 'failed' && <span className="text-red-600 font-semibold">Failed</span>}
                          {s.sms_status === 'no_mobile' && <span className="text-gray-500 font-semibold">No Mobile</span>}
                          {!s.sms_status && <span className="text-gray-400 font-semibold">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!notifyLoading && notifyResults.length > 0 && (
              <div className="mt-6 text-sm text-center bg-blue-50 rounded-lg py-3">
                <span className="font-semibold">Summary:</span> {notifyResults.filter(r => r.notify_status === 'sent').length} notified, {notifyResults.filter(r => r.notify_status === 'skipped').length} skipped (already completed), {notifyResults.filter(r => r.notify_status === 'failed').length} failed.
              </div>
            )}
          </div>
          <div className="flex justify-center mt-4">
            <button onClick={() => setNotifyModalOpen(false)} className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow">Close</button>
          </div>
        </Modal>
      )}
    </motion.div>
  )
}

const TestCreationWizard = ({ onTestCreated, setView }) => {
  const [step, setStep] = useState(1)
  const [testData, setTestData] = useState({
    testName: '',
    testType: '', // Start empty, force selection
    module: null,
    level: null,
    subcategory: null,
    campus: null,
    batches: [],
    courses: [],
    questions: [],
    accent: 'en-US',
    speed: 1.0,
  })

  const nextStep = () => setStep(prev => prev < 5 ? prev + 1 : prev)
  const prevStep = () => setStep(prev => prev > 1 ? prev - 1 : prev)

  const updateTestData = (data) => {
    // Normalize data to ensure we always store string IDs, not objects
    const normalizedData = {};
    
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (typeof value === 'object' && value !== null) {
        // Handle different object types
        if (value.id !== undefined) {
          normalizedData[key] = value.id;
        } else if (value.name !== undefined) {
          normalizedData[key] = value.name;
        } else if (value.value !== undefined) {
          normalizedData[key] = value.value;
        } else if (Array.isArray(value)) {
          // Handle arrays of objects
          normalizedData[key] = value.map(item => 
            typeof item === 'object' ? (item.id || item.value || item.name) : item
          );
        } else {
          normalizedData[key] = value;
        }
      } else {
        normalizedData[key] = value;
      }
    });
    
    setTestData(prev => ({ ...prev, ...normalizedData }))
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step2TestType nextStep={nextStep} prevStep={prevStep} updateTestData={updateTestData} testData={testData} />;
      case 2:
        return <Step3TestName nextStep={nextStep} prevStep={prevStep} updateTestData={updateTestData} testData={testData} />;
      case 3:
        return <Step4AudienceSelection nextStep={nextStep} prevStep={prevStep} updateTestData={updateTestData} testData={testData} />;
      case 4:
        return <Step5QuestionUpload nextStep={nextStep} prevStep={prevStep} updateTestData={updateTestData} testData={testData} />;
      case 5:
        return <Step4ConfirmAndGenerate prevStep={prevStep} testData={testData} onTestCreated={onTestCreated} />;
      default:
        return <Step2TestType nextStep={nextStep} prevStep={prevStep} updateTestData={updateTestData} testData={testData} />;
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Create a New Test</h1>
          <p className="mt-2 text-gray-500">Follow the steps to configure and launch a test.</p>
        </div>
        <button onClick={() => setView('list')} className="text-sm font-medium text-gray-500 hover:text-blue-500">
          &larr; Back to Test List
        </button>
      </div>
      <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
        <div className="mb-8">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <motion.div 
              className="bg-blue-500 h-2.5 rounded-full" 
              animate={{ width: `${((step - 1) / 4) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-right text-sm text-gray-500 mt-2">
            Step {step} of 5: {
              step === 1 ? 'Select Test Type' :
              step === 2 ? 'Select Module and Level' :
              step === 3 ? 'Select Audience' :
              step === 4 ? 'Upload Questions' :
              step === 5 ? 'Final Confirmation' : ''
            }
          </p>
        </div>
        {renderStep()}
      </div>
    </motion.div>
  )
}

const Step1TestDetails = ({ nextStep, prevStep, updateTestData, testData, step }) => {
  // Normalize testData to ensure we always have string IDs, not objects
  const normalizedModule = typeof testData.module === 'object' ? testData.module?.id : testData.module;
  const normalizedLevel = typeof testData.level === 'object' ? testData.level?.id : testData.level;
  const normalizedSubcategory = typeof testData.subcategory === 'object' ? testData.subcategory?.id : testData.subcategory;

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      module: normalizedModule || '',
      level: normalizedLevel || '',
      subcategory: normalizedSubcategory || '',
    }
  })
  const { error } = useNotification()
  const selectedModule = watch('module')
  const [modules, setModules] = useState([])
  const [allLevels, setAllLevels] = useState([])
  const [filteredLevels, setFilteredLevels] = useState([])
  const [grammarCategories, setGrammarCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await api.get('/test-management/get-test-data')
        setModules(res.data.data.modules || [])
        setAllLevels(res.data.data.levels || [])
        setGrammarCategories(res.data.data.grammar_categories || [])
      } catch (err) {
        error("Failed to fetch modules and levels")
      } finally {
        setLoading(false)
      }
    }
    fetchOptions()
  }, [error])

  // Filter levels based on selected module
  useEffect(() => {
    if (selectedModule && allLevels.length > 0) {
      let filtered = [];
      
      if (selectedModule === 'GRAMMAR') {
        // For Grammar, use grammar categories instead of levels
        setFilteredLevels([]);
        return;
      } else if (selectedModule === 'CRT') {
        // For CRT, use predefined levels
        filtered = [
          { id: 'Aptitude', name: 'Aptitude' },
          { id: 'Reasoning', name: 'Reasoning' },
          { id: 'Technical', name: 'Technical' }
        ];
      } else {
        // For other modules, filter levels that start with the module name
        filtered = allLevels.filter(level => 
          level.id && level.id.startsWith(selectedModule)
        );
        
        // If no levels found, create default levels
        if (filtered.length === 0) {
          filtered = [
            { id: `${selectedModule}_BEGINNER`, name: 'Beginner' },
            { id: `${selectedModule}_INTERMEDIATE`, name: 'Intermediate' },
            { id: `${selectedModule}_ADVANCED`, name: 'Advanced' }
          ];
        }
      }
      
      setFilteredLevels(filtered);
      
      // Reset level selection when module changes
      setValue('level', '');
      setValue('subcategory', '');
    } else {
      setFilteredLevels([]);
    }
  }, [selectedModule, allLevels, setValue])

  const onSubmit = async (data) => {
    // Only update test data and go to next step, do not check test name here
    updateTestData(data)
    nextStep()
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-500 p-2 rounded-full text-white">
            <Briefcase className="h-6 w-6"/>
          </div>
          <h2 className="text-2xl font-bold mb-4">Select Module and Level</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="module" className="block text-sm font-medium text-gray-800 mb-1">Module</label>
            <select
              id="module"
              {...register('module', { required: 'Please select a module.' })}
              className="mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition bg-gray-700 text-white border-gray-600"
            >
              <option value="">Select Module</option>
              {modules.map(module => (
                <option key={module.id} value={module.id}>{module.name}</option>
              ))}
            </select>
            {errors.module && <p className="text-red-500 text-xs mt-1">{errors.module.message}</p>}
          </div>
          {selectedModule === 'GRAMMAR' ? (
            <div>
              <label htmlFor="subcategory" className="block text-sm font-medium text-gray-800 mb-1">Grammar Category</label>
              <select
                id="subcategory"
                {...register('subcategory', { required: 'Please select a category.' })}
                className="mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition bg-gray-700 text-white border-gray-600"
              >
                <option value="">Select Category</option>
                {grammarCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {errors.subcategory && <p className="text-red-500 text-xs mt-1">{errors.subcategory.message}</p>}
            </div>
          ) : selectedModule && filteredLevels.length > 0 ? (
            <div>
              <label htmlFor="level" className="block text-sm font-medium text-gray-800 mb-1">Level</label>
              <select
                id="level"
                {...register('level', { required: 'Please select a level.' })}
                className="mt-1 block w-full rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition bg-gray-700 text-white border-gray-600"
              >
                <option value="">Select Level</option>
                {filteredLevels.map(level => (
                  <option key={level.id} value={level.id}>{level.name}</option>
                ))}
              </select>
              {errors.level && <p className="text-red-500 text-xs mt-1">{errors.level.message}</p>}
            </div>
          ) : selectedModule ? (
            <div>
              <label htmlFor="level" className="block text-sm font-medium text-gray-800 mb-1">Level</label>
              <select
                id="level"
                disabled
                className="mt-1 block w-full rounded-md shadow-sm bg-gray-300 text-gray-500 sm:text-sm border-gray-300"
              >
                <option value="">No levels available</option>
              </select>
              <p className="text-yellow-600 text-xs mt-1">No levels found for this module</p>
            </div>
          ) : null}
        </div>
        <div className="flex justify-between items-center pt-4">
          <button type="button" onClick={prevStep} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-gray-800 bg-gray-100 hover:bg-gray-200 transition-colors">
            <ChevronLeft className="h-5 w-5 mr-1" /> Back
          </button>
          <button type="submit" className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105">
            Next: Enter Test Name <ChevronRight className="h-5 w-5 ml-2" />
          </button>
        </div>
      </form>
    </motion.div>
  )
}

const Step2TestType = ({ nextStep, prevStep, updateTestData, testData }) => {
  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm({
    defaultValues: {
      testType: testData.testType,
    }
  })
  const { error } = useNotification()

  const testType = watch('testType')

  const onSubmit = (data) => {
    if (!data.testType) {
      error("Please select a test type");
      return;
    }
    updateTestData({ testType: data.testType })
    nextStep()
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex items-center space-x-3 border-b pb-4 border-gray-200">
          <div className="bg-blue-500 p-2 rounded-full text-white">
            <Briefcase className="h-6 w-6"/>
          </div>
          <h2 className="text-2xl font-bold mb-4">Select Test Type</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-sm font-medium text-gray-800">Test Type</label>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className={clsx('relative flex p-4 border rounded-lg cursor-pointer hover:bg-blue-50 transition', {
                'bg-blue-50 border-blue-500 ring-2 ring-blue-500': testType === 'Practice'
              })}>
                <input type="radio" {...register('testType', { required: 'Please select a test type' })} value="Practice" className="sr-only" />
                <div className="flex-1">
                  <span className="font-medium text-gray-800">Practice Module</span>
                  <p className="text-sm text-gray-500">Low-stakes module for student practice.</p>
                </div>
                {testType === 'Practice' && <CheckCircle className="h-5 w-5 text-blue-500 absolute top-2 right-2" />}
              </label>
              <label className={clsx('relative flex p-4 border rounded-lg cursor-pointer hover:bg-blue-50 transition', {
                'bg-blue-50 border-blue-500 ring-2 ring-blue-500': testType === 'Online'
              })}>
                <input type="radio" {...register('testType', { required: 'Please select a test type' })} value="Online" className="sr-only" />
                <div className="flex-1">
                  <span className="font-medium text-gray-800">Online Exam</span>
                  <p className="text-sm text-gray-500">Formal, graded assessment.</p>
                </div>
                {testType === 'Online' && <CheckCircle className="h-5 w-5 text-blue-500 absolute top-2 right-2" />}
              </label>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-8 border-t mt-8 border-gray-200">
          <button type="button" onClick={prevStep} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-gray-800 bg-gray-100 hover:bg-gray-200 transition-colors">
            <ChevronLeft className="h-5 w-5 mr-1" /> Back
          </button>
          <button type="submit" className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105">
            Next: Select Module and Level <ChevronRight className="h-5 w-5 ml-2" />
          </button>
        </div>
      </form>
    </motion.div>
  )
}

const Step3TestName = ({ nextStep, prevStep, updateTestData, testData }) => {
  const [module, setModule] = useState(testData.module || '');
  const [level, setLevel] = useState(testData.level || '');
  const [subcategory, setSubcategory] = useState(testData.subcategory || '');
  const [testName, setTestName] = useState(testData.testName || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [levels, setLevels] = useState([]);
  const [grammarCategories, setGrammarCategories] = useState([]);
  const { error: showError } = useNotification();

  // Fetch levels and grammar categories when component mounts
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await api.get('/test-management/get-test-data');
        if (response.data.success) {
          setLevels(response.data.data.levels || []);
          setGrammarCategories(response.data.data.grammar_categories || []);
        }
      } catch (error) {
        console.error('Error fetching levels:', error);
        showError('Failed to fetch levels');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter levels based on selected module
  const getFilteredLevels = () => {
    if (!module) return [];
    if (module === 'GRAMMAR') {
      return grammarCategories;
    } else if (module === 'CRT') {
      return [
        { id: 'Aptitude', name: 'Aptitude' },
        { id: 'Reasoning', name: 'Reasoning' },
        { id: 'Technical', name: 'Technical' }
      ];
    } else {
      // Find all levels for this module from backend
      const moduleLevels = levels.filter(level =>
        level && level.id && level.name && level.id.startsWith(module)
      );
      if (moduleLevels.length > 0) {
        return moduleLevels;
      }
      // Fallback to default levels
      return [
        { id: `${module}_BEGINNER`, name: 'Beginner' },
        { id: `${module}_INTERMEDIATE`, name: 'Intermediate' },
        { id: `${module}_ADVANCED`, name: 'Advanced' }
      ];
    }
  };

  const handleModuleChange = (e) => {
    setModule(e.target.value);
    setLevel(''); // Reset level when module changes
    setSubcategory(''); // Reset subcategory when module changes
  };

  const handleLevelChange = (e) => {
    setLevel(e.target.value);
  };

  const handleSubcategoryChange = (e) => {
    setSubcategory(e.target.value);
  };

  const handleNext = () => {
    if (!module) {
      setError('Please select a module.');
      return;
    }
    
    if (module === 'GRAMMAR' && !subcategory) {
      setError('Please select a grammar category.');
      return;
    } else if (module !== 'GRAMMAR' && !level) {
      setError('Please select a level.');
      return;
    }
    
    if (!testName.trim()) {
      setError('Please enter a test name.');
      return;
    }
    
    setError('');
    updateTestData({ 
      module, 
      level: module === 'GRAMMAR' ? subcategory : level, 
      subcategory: module === 'GRAMMAR' ? subcategory : null,
      testName 
    });
    nextStep();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="bg-blue-500 p-2 rounded-full text-white">
          <FileQuestion className="h-6 w-6"/>
        </div>
        <h2 className="text-2xl font-bold">Select Module, Level, and Enter Test Name</h2>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div>
          <label className="block font-semibold mb-2">Module</label>
          <select 
            value={module} 
            onChange={handleModuleChange} 
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Module</option>
            {Object.entries(MODULE_CONFIG).map(([key, mod]) => (
              <option key={key} value={key}>{mod.label}</option>
            ))}
          </select>
        </div>

        {module && module === 'GRAMMAR' && (
          <div>
            <label className="block font-semibold mb-2">Grammar Category</label>
            <select 
              value={subcategory} 
              onChange={handleSubcategoryChange} 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value="">Select Grammar Category</option>
              {grammarCategories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
        )}

        {module && module !== 'GRAMMAR' && (
          <div>
            <label className="block font-semibold mb-2">Level</label>
            <select 
              value={level} 
              onChange={handleLevelChange} 
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value="">Select Level</option>
              {getFilteredLevels().map(lvl => (
                <option key={lvl.id} value={lvl.id}>{lvl.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block font-semibold mb-2">Test Name</label>
          <input 
            value={testName} 
            onChange={e => setTestName(e.target.value)} 
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
            placeholder="Enter test name" 
          />
        </div>

        {error && <div className="text-red-600 p-3 bg-red-50 border border-red-200 rounded-lg">{error}</div>}

        <div className="flex justify-between items-center pt-4">
          <button 
            onClick={prevStep} 
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Back
          </button>
          <button 
            onClick={handleNext} 
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

const Step4AudienceSelection = ({ nextStep, prevStep, updateTestData, testData }) => {
  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm({
    defaultValues: {
      campus_id: testData.campus?.value || '',
      batch_ids: testData.batches?.map(b => b.value) || [],
      course_ids: testData.courses?.map(c => c.value) || [],
    }
  })
  const { error } = useNotification()

  const [campuses, setCampuses] = useState([])
  const [batches, setBatches] = useState([])
  const [courses, setCourses] = useState([])
  
  const [loadingStates, setLoadingStates] = useState({
    campuses: true,
    batches: false,
    courses: false,
  })

  const selectedCampusId = watch('campus_id')
  const selectedBatchIds = watch('batch_ids')

  // Fetch Campuses on mount
  useEffect(() => {
    const fetchCampuses = async () => {
      setLoadingStates(prev => ({ ...prev, campuses: true }))
      try {
        const res = await api.get('/campus-management/')
        setCampuses(res.data.data.map(c => ({ label: c.name, value: c.id })))
      } catch (err) {
        error("Failed to fetch campuses")
      } finally {
        setLoadingStates(prev => ({ ...prev, campuses: false }))
      }
    }
    fetchCampuses()
  }, [error])

  // Fetch Batches when Campus changes
  useEffect(() => {
    const fetchBatches = async (campusId) => {
      setLoadingStates(prev => ({ ...prev, batches: true, courses: false }))
      try {
        const res = await api.get(`/batch-management/campus/${campusId}/batches`)
        setBatches(res.data.data.map(b => ({ label: b.name, value: b.id })))
      } catch (err) {
        error("Failed to fetch batches")
        setBatches([])
      } finally {
        setLoadingStates(prev => ({ ...prev, batches: false }))
      }
    }

    if (selectedCampusId) {
      setValue('batch_ids', [])
      setValue('course_ids', [])
      setCourses([])
      fetchBatches(selectedCampusId)
    } else {
      setBatches([])
      setValue('batch_ids', [])
      setValue('course_ids', [])
      setCourses([])
    }
  }, [selectedCampusId, setValue, error])

  // Fetch Courses when Batches change
  useEffect(() => {
    const fetchCoursesForBatches = async (batchIds) => {
      if (!batchIds || batchIds.length === 0) {
        setCourses([])
        setValue('course_ids', [])
        return
      }
      setLoadingStates(prev => ({ ...prev, courses: true }))
      try {
        const coursePromises = batchIds.map(batchId =>
          api.get(`/course-management/batch/${batchId}/courses`)
        )
        const courseResults = await Promise.all(coursePromises)
        const allCourses = courseResults.flatMap(res => res.data.data)
        const uniqueCourses = [...new Map(allCourses.map(item => [item.id, item])).values()]
        setCourses(uniqueCourses.map(c => ({ label: c.name, value: c.id })))
      } catch (err) {
        error("Failed to fetch courses")
        setCourses([])
      } finally {
        setLoadingStates(prev => ({ ...prev, courses: false }))
      }
    }

    fetchCoursesForBatches(selectedBatchIds)
  }, [selectedBatchIds, setValue, error])

  const onSubmit = (data) => {
    // Validate that we have the required selections
    if (!data.campus_id) {
      error("Please select a campus");
      return;
    }
    
    if (!data.batch_ids || data.batch_ids.length === 0) {
      error("Please select at least one batch");
      return;
    }
    
    if (!data.course_ids || data.course_ids.length === 0) {
      error("Please select at least one course");
      return;
    }
    
    const selectedCampus = campuses.find(c => c.value === data.campus_id);
    const selectedBatches = batches.filter(b => data.batch_ids.includes(b.value));
    const selectedCourses = courses.filter(c => data.course_ids.includes(c.value));
    
    updateTestData({
      campus: selectedCampus,
      batches: selectedBatches,
      courses: selectedCourses,
    });
    nextStep();
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex items-center space-x-3 border-b pb-4 border-gray-200">
          <div className="bg-blue-500 p-2 rounded-full text-white">
            <Briefcase className="h-6 w-6"/>
          </div>
          <h2 className="text-2xl font-bold mb-4">Select Audience</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Column 1: Campus */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-gray-800">1. Select Campus</h3>
            {loadingStates.campuses ? <LoadingSpinner/> : (
              <>
                <select 
                  {...register('campus_id', { required: 'Please select a campus' })}
                  className="w-full p-2 border border-gray-200 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition"
                >
                  <option value="" disabled>Choose a campus</option>
                  {campuses.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                {errors.campus_id && <p className="text-red-500 text-xs mt-1">{errors.campus_id.message}</p>}
              </>
            )}
          </div>

          {/* Column 2: Batches */}
          <div className={clsx("space-y-4", { 'opacity-50': !selectedCampusId })}>
            <h3 className="font-semibold text-lg text-gray-800">2. Select Batches</h3>
            {loadingStates.batches ? <LoadingSpinner/> : (
              batches.length > 0 ? (
                <Controller
                  name="batch_ids"
                  control={control}
                  rules={{ required: 'Please select at least one batch.' }}
                  render={({ field }) => (
                    <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2 border-gray-200">
                      {batches.map(batch => (
                        <CheckboxCard
                          key={batch.value}
                          id={`batch-${batch.value}`}
                          label={batch.label}
                          checked={field.value.includes(batch.value)}
                          onChange={(isChecked) => {
                            const newValue = isChecked
                              ? [...field.value, batch.value]
                              : field.value.filter(id => id !== batch.value);
                            field.onChange(newValue);
                          }}
                        />
                      ))}
                    </div>
                  )}
                />
              ) : <p className="text-sm text-gray-500 italic">{selectedCampusId ? 'No batches found.' : 'Select a campus to see batches.'}</p>
            )}
            {errors.batch_ids && <p className="text-red-500 text-xs mt-1">{errors.batch_ids.message}</p>}
          </div>

          {/* Column 3: Courses */}
          <div className={clsx("space-y-4", { 'opacity-50': !selectedBatchIds || selectedBatchIds.length === 0 })}>
            <h3 className="font-semibold text-lg text-gray-800">3. Select Courses</h3>
            {loadingStates.courses ? <LoadingSpinner/> : (
              courses.length > 0 ? (
                <Controller
                  name="course_ids"
                  control={control}
                  rules={{ required: 'Please select at least one course.' }}
                  render={({ field }) => (
                    <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2 border-gray-200">
                      {courses.map(course => (
                        <CheckboxCard
                          key={course.value}
                          id={`course-${course.value}`}
                          label={course.label}
                          checked={field.value.includes(course.value)}
                          onChange={(isChecked) => {
                            const newValue = isChecked
                              ? [...field.value, course.value]
                              : field.value.filter(id => id !== course.value);
                            field.onChange(newValue);
                          }}
                        />
                      ))}
                    </div>
                  )}
                />
              ) : <p className="text-sm text-gray-500 italic">{selectedBatchIds?.length > 0 ? 'No courses found.' : 'Select one or more batches to see courses.'}</p>
            )}
            {errors.course_ids && <p className="text-red-500 text-xs mt-1">{errors.course_ids.message}</p>}
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-8 border-t mt-8 border-gray-200">
          <button type="button" onClick={prevStep} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-gray-800 bg-gray-100 hover:bg-gray-200 transition-colors">
            <ChevronLeft className="h-5 w-5 mr-1" /> Back
          </button>
          <button type="submit" className="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105">
            Next: Upload Questions <ChevronRight className="h-5 w-5 ml-2" />
          </button>
        </div>
      </form>
    </motion.div>
  )
}

const CheckboxCard = ({ id, label, checked, onChange }) => {
  return (
    <label
      htmlFor={id}
      className={clsx(
        'flex items-center p-3 w-full rounded-md cursor-pointer transition-all duration-200 ease-in-out border',
        {
          'bg-blue-100 border-blue-500 ring-1 ring-blue-500': checked,
          'bg-white hover:bg-gray-50 border-gray-200': !checked,
        }
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
      />
      <span className={clsx('ml-3 text-sm font-medium', {'text-blue-900': checked, 'text-gray-800': !checked})}>
        {label}
      </span>
    </label>
  );
}

const Step5QuestionUpload = ({ nextStep, prevStep, updateTestData, testData }) => {
  const module = testData.module;
  const UploadComponent = MODULE_CONFIG[module]?.uploadComponent || (() => <div>Unknown module</div>);
  const [questions, setQuestions] = useState(testData.questions || []);
  const [error, setError] = useState('');
  const [questionSource, setQuestionSource] = useState('manual'); // 'manual' or 'bank'
  const [bankQuestions, setBankQuestions] = useState([]);
  const [selectedBankQuestions, setSelectedBankQuestions] = useState([]);
  const [loadingBankQuestions, setLoadingBankQuestions] = useState(false);
  const [showQuestionCountModal, setShowQuestionCountModal] = useState(false);
  const [questionCount, setQuestionCount] = useState(10);
  const [showQuestionPreview, setShowQuestionPreview] = useState(false);
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const { error: showError } = useNotification();

  // Fetch questions from bank when source changes
  useEffect(() => {
    if (questionSource === 'bank') {
      fetchQuestionsFromBank();
    }
  }, [questionSource, testData.module, testData.level, testData.subcategory]);

  const fetchQuestionsFromBank = async (count = 50) => {
    setLoadingBankQuestions(true);
    try {
      // Determine the correct level_id based on module type
      let levelId = testData.level;
      let subcategory = testData.subcategory;
      
      if (testData.module === 'CRT') {
        // Map CRT levels to proper backend categories
        const crtLevelMapping = {
          'Aptitude': 'CRT_APTITUDE',
          'Reasoning': 'CRT_REASONING', 
          'Technical': 'CRT_TECHNICAL'
        };
        levelId = crtLevelMapping[testData.level] || testData.level;
      } else if (testData.module === 'GRAMMAR') {
        // For Grammar, use subcategory as level_id
        levelId = testData.subcategory;
        subcategory = testData.subcategory;
      } else {
        // For other modules (VOCABULARY, READING, LISTENING, SPEAKING, WRITING)
        levelId = testData.level;
        subcategory = null;
      }
      
      console.log('Fetching questions for:', {
        module_id: testData.module,
        level_id: levelId,
        subcategory: subcategory,
        count: count
      });
      
      const response = await api.post('/test-management/question-bank/fetch-for-test', {
        module_id: testData.module,
        level_id: levelId,
        subcategory: subcategory,
        count: count
      });
      
      if (response.data.success) {
        setBankQuestions(response.data.questions);
        console.log('Fetched questions:', response.data.questions.length);
        return response.data.questions;
      } else {
        console.error('Failed to fetch questions:', response.data.message);
        setError('Failed to fetch questions from bank');
        return [];
      }
    } catch (error) {
      console.error('Error fetching questions from bank:', error);
      setError('Failed to fetch questions from bank');
      return [];
    } finally {
      setLoadingBankQuestions(false);
    }
  };

  const handleQuestionBankSelect = async () => {
    setShowQuestionCountModal(true);
  };

  const handleQuestionCountConfirm = async () => {
    setShowQuestionCountModal(false);
    // Sample with replacement
    const fetchedQuestions = await fetchQuestionsFromBank(questionCount * 2); // fetch more to allow repeats
    if (fetchedQuestions.length > 0) {
      // Sample with replacement
      const selectedQuestions = [];
      for (let i = 0; i < questionCount; i++) {
        const idx = Math.floor(Math.random() * fetchedQuestions.length);
        selectedQuestions.push(fetchedQuestions[idx]);
      }
      setPreviewQuestions(selectedQuestions);
      setShowQuestionPreview(true);
    } else {
      setError('No questions found in the bank for the selected criteria');
      showError('No questions found in the bank for the selected criteria');
    }
  };

  const handlePreviewConfirm = () => {
    setQuestions(previewQuestions);
    setSelectedBankQuestions(previewQuestions);
    setShowQuestionPreview(false);
    setQuestionSource('bank');
  };

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const handleQuestionSourceChange = (source) => {
    setQuestionSource(source);
    setError(''); // Clear any previous errors
    if (source === 'manual') {
      setQuestions([]);
      setSelectedBankQuestions([]);
    } else {
      setQuestions([]);
    }
  };

  const handleBankQuestionToggle = (question) => {
    setSelectedBankQuestions(prev => {
      const isSelected = prev.find(q => q._id === question._id);
      if (isSelected) {
        return prev.filter(q => q._id !== question._id);
      } else {
        return [...prev, question];
      }
    });
  };

  const handleConfirmBankQuestions = () => {
    setQuestions(selectedBankQuestions);
    setQuestionSource('manual'); // Switch back to manual view to show selected questions
  };

  const handleNext = () => {
    if (questions.length === 0) {
      setError('Please add at least one question.');
      return;
    }
    setError('');
    updateTestData({ questions });
    nextStep();
  };

  // Get display names for module and level
  const getModuleDisplayName = () => {
    const moduleNames = {
      'GRAMMAR': 'Grammar',
      'VOCABULARY': 'Vocabulary', 
      'READING': 'Reading',
      'LISTENING': 'Listening',
      'SPEAKING': 'Speaking',
      'WRITING': 'Writing',
      'CRT': 'CRT'
    };
    return moduleNames[testData.module] || testData.module;
  };

  const getLevelDisplayName = () => {
    if (testData.module === 'GRAMMAR') {
      return testData.subcategory || 'Unknown Category';
    } else if (testData.module === 'CRT') {
      return testData.level || 'Unknown Level';
    } else {
      return testData.level || 'Unknown Level';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="bg-blue-500 p-2 rounded-full text-white">
          <FileQuestion className="h-6 w-6"/>
        </div>
        <h2 className="text-2xl font-bold">Question Upload</h2>
      </div>

      {/* Selected Module and Level Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-blue-800">Module:</span>
            <span className="text-sm text-blue-900 bg-blue-100 px-2 py-1 rounded">{getModuleDisplayName()}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-blue-800">Level:</span>
            <span className="text-sm text-blue-900 bg-blue-100 px-2 py-1 rounded">{getLevelDisplayName()}</span>
          </div>
          {testData.module === 'GRAMMAR' && testData.subcategory && (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-blue-800">Category:</span>
              <span className="text-sm text-blue-900 bg-blue-100 px-2 py-1 rounded">{testData.subcategory}</span>
            </div>
          )}
        </div>
      </div>

      {/* Question Source Selection */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Choose Question Source</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => handleQuestionSourceChange('manual')}
            className={`p-4 border-2 rounded-lg text-left transition-colors ${
              questionSource === 'manual'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Upload className="h-6 w-6 text-blue-500" />
              <div>
                <h4 className="font-semibold">Manual Upload</h4>
                <p className="text-sm text-gray-600">Upload questions manually via file or form</p>
              </div>
            </div>
          </button>

          <button
            onClick={handleQuestionBankSelect}
            className={`p-4 border-2 rounded-lg text-left transition-colors ${
              questionSource === 'bank'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Briefcase className="h-6 w-6 text-blue-500" />
              <div>
                <h4 className="font-semibold">Question Bank</h4>
                <p className="text-sm text-gray-600">Select questions from existing question bank</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Question Bank Selection */}
      {questionSource === 'bank' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Selected Questions from Bank</h3>
            <div className="text-sm text-gray-600">
              {questions.length} questions selected
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No questions selected from the bank.</p>
              <p className="text-sm mt-2">Click on "Question Bank" to select questions.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-800 font-medium">
                    {questions.length} questions randomly selected from the question bank
                  </span>
                </div>
                <p className="text-green-700 text-sm mt-1">
                  Questions have been shuffled for randomization. Click "Next" to proceed.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {questions.map((question, index) => {
                  const isTechnicalQuestion = question.question_type === 'technical' || 
                    (testData.module === 'CRT' && testData.level === 'Technical');
                  
                  return (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm mb-2">
                            Q{index + 1}: {question.question.substring(0, 100)}...
                          </h4>
                          
                          {isTechnicalQuestion ? (
                            <div className="text-xs text-gray-600 space-y-1">
                              <div className="font-medium">Test Cases:</div>
                              <pre className="text-xs bg-gray-100 p-1 rounded">{question.testCases || 'N/A'}</pre>
                              <div className="font-medium">Expected Output:</div>
                              <pre className="text-xs bg-gray-100 p-1 rounded">{question.expectedOutput || 'N/A'}</pre>
                              <div className="font-medium">Language: {question.language || 'python'}</div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-600 space-y-1">
                              <div>A: {question.optionA}</div>
                              <div>B: {question.optionB}</div>
                              <div>C: {question.optionC}</div>
                              <div>D: {question.optionD}</div>
                              <div className="font-medium text-green-600">
                                Answer: {question.answer}
                              </div>
                            </div>
                          )}
                        </div>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Random</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Upload */}
      {questionSource === 'manual' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Manual Question Upload</h3>
          <TestQuestionUpload
            questions={questions}
            setQuestions={setQuestions}
            moduleName={MODULE_CONFIG[module]?.label}
            levelId={testData.module === 'CRT' ? 
              (testData.level === 'Aptitude' ? 'CRT_APTITUDE' : 
               testData.level === 'Reasoning' ? 'CRT_REASONING' : 
               testData.level === 'Technical' ? 'CRT_TECHNICAL' : testData.level) : 
              testData.level}
          />
        </div>
      )}

      {/* Selected Questions Summary */}
      {questions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Selected Questions ({questions.length})</h3>
          <div className="space-y-2">
            {questions.map((question, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded border">
                <div className="font-medium">Q{index + 1}: {question.question}</div>
                {question.optionA && (
                  <div className="text-sm text-gray-600 mt-1">
                    A: {question.optionA} | B: {question.optionB} | C: {question.optionC} | D: {question.optionD}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={prevStep}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Previous
        </button>
        <button
          onClick={handleNext}
          disabled={questions.length === 0}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>

      {/* Question Count Modal */}
      {showQuestionCountModal && (
        <Modal
          isOpen={showQuestionCountModal}
          onClose={() => setShowQuestionCountModal(false)}
          title="Select Number of Questions"
        >
          <div className="space-y-4">
            <p className="text-gray-600">
              How many questions would you like to select from the question bank?
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of Questions
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={questionCount}
                onChange={(e) => setQuestionCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter number of questions"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => setShowQuestionCountModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleQuestionCountConfirm}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Confirm
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Question Preview Modal */}
      {showQuestionPreview && (
        <Modal
          isOpen={showQuestionPreview}
          onClose={() => setShowQuestionPreview(false)}
          title={`Preview Questions (${previewQuestions.length} selected)`}
          size="lg"
        >
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {(() => {
              // Count repeats
              const counts = {};
              previewQuestions.forEach(q => {
                const key = q._id || q.question;
                counts[key] = (counts[key] || 0) + 1;
              });
              return previewQuestions.map((question, index) => {
                const key = question._id || question.question;
                const repeatCount = counts[key];
                // Only show the badge the first time this question appears
                const isFirst = previewQuestions.findIndex(q => (q._id || q.question) === key) === index;
                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-medium text-gray-500">Question {index + 1}</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Randomly Selected</span>
                      {isFirst && repeatCount > 1 && (
                        <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Repeated x{repeatCount}</span>
                      )}
                    </div>
                    <p className="text-gray-800 mb-3">{question.question}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-gray-50 p-2 rounded">
                        <span className="font-medium">A:</span> {question.optionA}
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <span className="font-medium">B:</span> {question.optionB}
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <span className="font-medium">C:</span> {question.optionC}
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <span className="font-medium">D:</span> {question.optionD}
                      </div>
                    </div>
                    <div className="mt-2 text-sm">
                      <span className="font-medium text-green-600">Answer:</span> {question.answer}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowQuestionPreview(false)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handlePreviewConfirm}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              Use These Questions
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

const Step4ConfirmAndGenerate = ({ prevStep, testData, onTestCreated }) => {
  const [studentCount, setStudentCount] = useState(null);
  const [studentList, setStudentList] = useState([]);
  useEffect(() => {
    const fetchStudentCount = async () => {
      try {
        const res = await getStudentCount({
          campus: testData.campus?.value,
          batches: testData.batches?.map(b => b.value),
          courses: testData.courses?.map(c => c.value),
        });
        setStudentCount(res.data.count);
        setStudentList(res.data.students || []);
      } catch {
        setStudentCount('N/A');
        setStudentList([]);
      }
    };
    fetchStudentCount();
  }, [testData.campus, testData.batches, testData.courses]);

  const { success, error } = useNotification()
  const [loading, setLoading] = useState(false)
  const { control, handleSubmit } = useForm({
    defaultValues: {
      accent: testData.accent,
      speed: testData.speed,
    }
  })

  // Check if this is an MCQ module
  const isMcqModule = testData.module && ['GRAMMAR', 'VOCABULARY', 'CRT'].includes(testData.module)

  // Helper to format date/time
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Validation for online test
  const isOnline = testData.testType?.toLowerCase() === 'online';
  const missingDate = isOnline && (!testData.startDateTime || !testData.endDateTime);

  const accentOptions = [
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-GB', label: 'English (UK)' },
    { value: 'en-AU', label: 'English (Australia)' },
  ]

  const speedOptions = [
    { value: 0.75, label: 'Slow (0.75x)' },
    { value: 1.0, label: 'Normal (1.0x)' },
    { value: 1.25, label: 'Fast (1.25x)' },
  ]

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const payload = {
        test_name: testData.testName,
        test_type: testData.testType?.toLowerCase(),
        module_id: testData.module,
        campus_id: testData.campus?.value,
        course_ids: testData.courses.map(c => c.value),
        batch_ids: testData.batches.map(b => b.value),
        questions: testData.questions,
        audio_config: isMcqModule ? {} : { accent: data.accent, speed: data.speed },
        assigned_student_ids: studentList.map(s => s.id), // Only assign to confirmed students
      };
      if (testData.testType?.toLowerCase() === 'online') {
        // Always send ISO strings for startDateTime and endDateTime
        if (!testData.startDateTime || !testData.endDateTime) {
          error('Start and end date/time are required for online tests.');
          setLoading(false);
          return;
        }
        payload.startDateTime = new Date(testData.startDateTime).toISOString();
        payload.endDateTime = new Date(testData.endDateTime).toISOString();
        payload.duration = Number(testData.duration);
      }
      if (testData.module === 'GRAMMAR') {
        payload.subcategory = testData.subcategory;
        payload.level_id = null;
      } else if (testData.module === 'VOCABULARY') {
        payload.subcategory = null;
        payload.level_id = null;
      } else if (testData.module === 'CRT') {
        // For CRT modules, map the level to the appropriate CRT category
        const crtLevelMapping = {
          'Aptitude': 'CRT_APTITUDE',
          'Reasoning': 'CRT_REASONING', 
          'Technical': 'CRT_TECHNICAL'
        };
        payload.level_id = crtLevelMapping[testData.level] || testData.level;
        payload.subcategory = null;
      } else {
        payload.level_id = testData.level;
        payload.subcategory = null;
      }
      // Debug log
      console.log('Submitting test creation payload:', payload);
      const res = await api.post('/test-management/create-test', payload)
      const newTestId = res.data?.data?.test_id;
      if (isMcqModule) {
        success("MCQ module created successfully!")
      } else {
        success("Test creation started! Audio generation is in progress.")
      }
      if (onTestCreated) onTestCreated(newTestId)
    } catch(err) {
      const errorMessage = err.response?.data?.message || "An unexpected error occurred while creating the test."
      if (err.response?.status === 409) {
        error(errorMessage);
      } else if (errorMessage.includes("E11000")) {
        error("A test with this ID already exists. Please try creating it again.")
      } else {
        error(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {loading && <LoadingSpinner message={isMcqModule ? "Creating MCQ module..." : "Generating audio and creating test..."} />}
        <div className="flex items-center space-x-3">
          <div className="bg-blue-500 p-2 rounded-full text-white">
            <Sparkles className="h-6 w-6"/>
          </div>
          <h2 className="text-2xl font-bold mb-4">Final Confirmation</h2>
        </div>
        {missingDate && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Start and end date/time are required for online tests.</strong>
          </div>
        )}
        <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg space-y-4">
          <h3 className="font-semibold text-lg text-gray-800 border-b border-gray-200 pb-3 mb-4">Test Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div><strong className="text-gray-500 block">Name:</strong><p className="text-gray-800">{testData.testName}</p></div>
            <div><strong className="text-gray-500 block">Type:</strong><p className="text-gray-800">{testData.testType}</p></div>
            <div><strong className="text-gray-500 block">Module:</strong><p className="text-gray-800">{typeof testData.module === 'object' ? testData.module.name || testData.module.label : testData.module}</p></div>
            {testData.subcategory ? (
              <div><strong className="text-gray-500 block">Category:</strong><p className="text-gray-800">{testData.subcategory}</p></div>
            ) : testData.level ? (
              <div><strong className="text-gray-500 block">Level:</strong><p className="text-gray-800">{testData.level}</p></div>
            ) : null}
            <div><strong className="text-gray-500 block">Campus:</strong><p className="text-gray-800">{testData.campus?.label}</p></div>
            <div><strong className="text-gray-500 block">Batches:</strong><p className="text-gray-800">{testData.batches?.map(b => b.label).join(', ')}</p></div>
            <div><strong className="text-gray-500 block">Courses:</strong><p className="text-gray-800">{testData.courses?.map(c => c.label).join(', ')}</p></div>
            {isOnline && (
              <>
                <div><strong className="text-gray-500 block">Start Date & Time:</strong><p className="text-gray-800">{formatDateTime(testData.startDateTime)}</p></div>
                <div><strong className="text-gray-500 block">End Date & Time:</strong><p className="text-gray-800">{formatDateTime(testData.endDateTime)}</p></div>
              </>
            )}
            <div><strong className="text-gray-500 block">Student Count:</strong><p className="text-gray-800">{studentCount === null ? 'Loading...' : studentCount}</p></div>
            <div className="col-span-full"><strong className="text-gray-500 block">Total Questions:</strong><p className="text-gray-800">{testData.questions?.length}</p></div>
          </div>
          {/* Student List Table */}
          <div className="mt-6">
            <h4 className="font-semibold text-gray-700 mb-2">Students who will get access:</h4>
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded bg-white">
              {studentList.length === 0 ? (
                <div className="text-gray-500 text-sm p-4">No students found for the selected criteria.</div>
              ) : (
                <table className="min-w-full text-sm border-separate border-spacing-0">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700 border-b">Name</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-700 border-b">Email</th>
                      <th className="px-4 py-2 text-center font-semibold text-gray-700 border-b">Mobile</th>
                      <th className="px-4 py-2 text-center font-semibold text-gray-700 border-b">Test Status</th>
                      <th className="px-4 py-2 text-center font-semibold text-gray-700 border-b">Email Notification</th>
                      <th className="px-4 py-2 text-center font-semibold text-gray-700 border-b">SMS Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentList.map((s, idx) => (
                      <tr key={s.id} className={idx % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'}>
                        <td className="px-4 py-2 text-gray-900 border-b align-middle">{s.name}</td>
                        <td className="px-4 py-2 text-gray-900 border-b align-middle">{s.email}</td>
                        <td className="px-4 py-2 text-gray-900 border-b align-middle text-center">{s.mobile_number || '-'}</td>
                        <td className="px-4 py-2 text-gray-900 border-b align-middle text-center">{s.test_status === 'completed' ? <span className="text-green-600 font-semibold">Completed</span> : <span className="text-yellow-600 font-semibold">Pending</span>}</td>
                        <td className="px-4 py-2 text-gray-900 border-b align-middle text-center">{s.notify_status === 'sent' ? <span className="text-green-700">Sent</span> : s.notify_status === 'skipped' ? <span className="text-gray-500">Skipped</span> : s.notify_status === 'pending' ? <span className="text-blue-500">Pending</span> : s.notify_status === 'failed' ? <span className="text-red-600">Failed</span> : <span className="text-gray-400">-</span>}</td>
                        <td className="px-4 py-2 text-gray-900 border-b align-middle text-center">{s.sms_status === 'sent' ? <span className="text-green-700">Sent</span> : s.sms_status === 'failed' ? <span className="text-red-600">Failed</span> : s.sms_status === 'no_mobile' ? <span className="text-gray-500">No Mobile</span> : <span className="text-gray-400">-</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
        {!isMcqModule && (
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">Audio Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Voice Accent</label>
                <Controller
                  name="accent"
                  control={control}
                  render={({ field }) => (
                    <select {...field} className="mt-1 block w-full rounded-md border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition">
                      {accentOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-800 mb-1">Speech Speed</label>
                <Controller
                  name="speed"
                  control={control}
                  render={({ field }) => (
                    <select {...field} className="mt-1 block w-full rounded-md border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition">
                      {speedOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  )}
                />
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-between items-center pt-4">
          <button type="button" onClick={prevStep} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-gray-800 bg-gray-100 hover:bg-gray-200 transition-colors">
            <ChevronLeft className="h-5 w-5 mr-1" /> Back
          </button>
          <button type="submit" disabled={loading || missingDate} className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed transition-transform transform hover:scale-105">
            <CheckCircle className="h-6 w-6 mr-2" />
            {loading ? 'Processing...' : (isMcqModule ? 'Create MCQ Module' : 'Confirm and Generate Audio')}
          </button>
        </div>
      </form>
    </motion.div>
  )
}

// ModuleQuestionUpload component
const ModuleQuestionUpload = ({ onBack }) => {
  const [selectedModule, setSelectedModule] = useState(null);
  const [levelId, setLevelId] = useState('');
  const [questions, setQuestions] = useState([]);
  const [modules, setModules] = useState([]);
  const [levels, setLevels] = useState([]);
  const [currentStep, setCurrentStep] = useState('modules'); // 'modules' or 'levels'
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { success, error } = useNotification();
  const [loading, setLoading] = useState(false);
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [notifyResults, setNotifyResults] = useState([]);
  const [notifyLoading, setNotifyLoading] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await api.get('/test-management/get-test-data');
        setModules(res.data.data.modules || []);
        setLevels(res.data.data.levels || []);
      } catch (err) {
        error('Failed to fetch modules and levels');
      }
    };
    fetchOptions();
  }, [error]);

  const handleModuleSelect = (module) => {
    setSelectedModule(module);
    setCurrentStep('levels');
  };

  const handleBackToModules = () => {
    setSelectedModule(null);
    setLevelId('');
    setCurrentStep('modules');
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let parsedQuestions = [];
        if (fileExtension === 'csv') {
          const result = Papa.parse(e.target.result, { header: true, skipEmptyLines: true });
          parsedQuestions = result.data.map(row => ({
            question: row.question || row.Question || '',
            instructions: row.instructions || row.Instructions || '',
          }));
        } else {
          const workbook = XLSX.read(e.target.result, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          parsedQuestions = jsonData.map(row => ({
            question: row.question || row.Question || '',
            instructions: row.instructions || row.Instructions || '',
          }));
        }
        setQuestions(parsedQuestions.filter(q => q && q.question && q.question.trim() !== ''));
        success(`Loaded ${parsedQuestions.length} questions.`);
      } catch (err) {
        error('Failed to parse file.');
      }
    };
    if (fileExtension === 'csv') {
      reader.readAsText(file, 'UTF-8');
    } else {
      reader.readAsArrayBuffer(file);
    }
    event.target.value = null;
  };

  const handleUpload = async () => {
    if (!selectedModule || !levelId || questions.length === 0) {
      error('Please select module, level, and upload questions.');
      return;
    }
    setLoading(true);
    try {
      await uploadModuleQuestions(selectedModule.id, levelId, questions);
      success('Questions uploaded to module bank!');
      setQuestions([]);
      // Reset to modules view after successful upload
      setSelectedModule(null);
      setLevelId('');
      setCurrentStep('modules');
    } catch (err) {
      error('Failed to upload questions.');
    } finally {
      setLoading(false);
    }
  };

  const handleNotifyStudents = async () => {
    setNotifyModalOpen(true);
    setNotifyLoading(true);
    try {
      if (!selectedModule || !levelId) {
        error('Please select a module and level.');
        setNotifyLoading(false);
        return;
      }
      // Find the test for this module/level (assume you have a way to get testId for the selected module/level)
      // If you have a test list, find the matching testId. Otherwise, you may need to fetch it.
      // For now, let's assume you have a function getTestIdForModuleLevel(selectedModule.id, levelId)
      const testId = await getTestIdForModuleLevel(selectedModule.id, levelId);
      if (!testId) {
        error('No test found for this module and level.');
        setNotifyLoading(false);
        return;
      }
      const res = await api.post(`/test-management/notify-students/${testId}`);
      const notifyResults = res.data.results || [];
      setNotifyResults(notifyResults);
    } catch (e) {
      error('Failed to notify students.');
      setNotifyResults([]);
    } finally {
      setNotifyLoading(false);
    }
  };

  // Render modules selection view
  if (currentStep === 'modules') {
    // Sort modules: Grammar, Vocabulary, then others
    const moduleOrder = ['Grammar', 'Vocabulary', 'Listening', 'Speaking', 'Reading', 'Writing'];
    const sortedModules = [
      ...moduleOrder
        .map(name => modules.find(m => m.name.toLowerCase() === name.toLowerCase()))
        .filter(Boolean),
      ...modules.filter(m => !moduleOrder.map(n => n.toLowerCase()).includes(m.name.toLowerCase())),
    ];
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Select Module for Question Upload</h1>
          <button onClick={onBack} className="text-sm font-medium text-gray-500 hover:text-green-600">&larr; Back</button>
      </div>
        
      <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Available Modules</h2>
            <p className="text-gray-600 mb-6">Click on a module to proceed with question upload for that module.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedModules.map((module) => (
              <motion.div
                key={module.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-gradient-to-br from-green-50 to-green-100 border border-green-300 rounded-xl p-6 cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-green-500"
                onClick={() => handleModuleSelect(module)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="bg-green-600 p-2 rounded-lg">
                    <FileQuestion className="h-6 w-6 text-white" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{module.name}</h3>
                <p className="text-sm text-gray-600">Click to upload questions for this module</p>
              </motion.div>
            ))}
          </div>
          
          {modules.length === 0 && (
            <div className="text-center py-12">
              <FileQuestion className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No modules available</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Render levels selection and upload view
  // For Grammar module, show grammar-specific levels
  const grammarLevels = [
    { id: 'noun', name: 'Noun' },
    { id: 'verb', name: 'Verb' },
    { id: 'adjective', name: 'Adjective' },
    { id: 'adverb', name: 'Adverb' },
    { id: 'preposition', name: 'Preposition' },
    { id: 'conjunction', name: 'Conjunction' },
    { id: 'interjection', name: 'Interjection' },
    { id: 'pronoun', name: 'Pronoun' },
  ];
  const isGrammar = selectedModule && selectedModule.name.toLowerCase() === 'grammar';
  const levelOptions = isGrammar ? grammarLevels : levels;

  // Dropdown animation state
  const selectedLevel = levelOptions.find(l => l.id === levelId);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <div className="flex justify-between items-center mb-8">
          <div>
          <h1 className="text-3xl font-bold text-gray-800">Upload Questions</h1>
          <p className="text-gray-600 mt-2">Module: <span className="font-semibold text-green-700">{selectedModule?.name}</span></p>
          </div>
        <button onClick={handleBackToModules} className="text-sm font-medium text-gray-500 hover:text-green-600 transition-colors">&larr; Back to Modules</button>
        </div>
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ duration: 0.4 }}
        className="bg-gradient-to-br from-green-50 to-white rounded-2xl shadow-xl border border-green-200 p-8 max-w-3xl mx-auto"
      >
        {/* Level Dropdown */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:space-x-8 space-y-4 md:space-y-0">
          <div className="w-full md:w-1/2">
            <label className="block text-sm font-semibold text-gray-800 mb-2">Select Level</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(o => !o)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all duration-200 bg-white text-gray-800 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-green-200 ${dropdownOpen ? 'border-green-600' : 'border-green-300 hover:border-green-500'}`}
              >
                <span>{selectedLevel ? selectedLevel.name : 'Select Level'}</span>
                <motion.span animate={{ rotate: dropdownOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="h-5 w-5 text-green-600" />
                </motion.span>
              </button>
              {dropdownOpen && (
                <motion.ul
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-10 mt-2 w-full bg-white border border-green-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                >
                  {levelOptions.map(l => (
                    <li
                      key={l.id}
                      onClick={() => { setLevelId(l.id); setDropdownOpen(false); }}
                      className={`px-4 py-2 cursor-pointer hover:bg-green-50 transition-colors ${levelId === l.id ? 'bg-green-100 text-green-700 font-semibold' : 'text-gray-800'}`}
                    >
                      {l.name}
                    </li>
                  ))}
                </motion.ul>
              )}
        </div>
        </div>
          {/* File Upload */}
          <div className="w-full md:w-1/2">
            <label className="block text-sm font-semibold text-gray-800 mb-2">Upload Questions (CSV/XLSX)</label>
            <label className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 border-2 border-green-300 hover:bg-green-100 hover:border-green-500 cursor-pointer transition-all duration-200 shadow-sm font-medium text-green-700">
              <Upload className="h-5 w-5 mr-2 text-green-600" />
              <span>Choose File</span>
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <span className="block mt-2 text-xs text-gray-500">{questions.length === 0 ? 'No file chosen' : `${questions.length} questions loaded.`}</span>
          </div>
        </div>
        <hr className="my-6 border-green-100" />
        {/* Questions Status & Upload Button */}
        <div className="flex flex-col items-center space-y-4">
          <p className="text-gray-700">
            {questions.length > 0 ? (
              <span className="text-green-700 font-medium">{questions.length} questions ready to upload.</span>
            ) : (
              <span className="text-gray-500">No questions loaded yet. Please upload a file.</span>
            )}
          </p>
          <motion.button
            whileHover={{ scale: questions.length > 0 && levelId ? 1.04 : 1, boxShadow: questions.length > 0 && levelId ? '0 4px 16px 0 rgba(22, 163, 74, 0.15)' : 'none' }}
            whileTap={{ scale: questions.length > 0 && levelId ? 0.98 : 1 }}
            onClick={handleUpload}
            disabled={loading || !levelId || questions.length === 0}
            className={`w-full md:w-auto px-8 py-3 rounded-lg font-semibold transition-all duration-200 text-white ${loading || !levelId || questions.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-lg'}`}
          >
            {loading ? 'Uploading...' : 'Upload to Module Bank'}
          </motion.button>
      </div>
      </motion.div>
    </motion.div>
  );
};

// Helper function to get testId for a module and level (implement as needed)
async function getTestIdForModuleLevel(moduleId, levelId) {
  // You may need to fetch all tests and find the one matching moduleId and levelId
  try {
    const res = await api.get('/test-management/tests');
    const tests = res.data.data || [];
    const test = tests.find(t => t.module_id === moduleId && t.level_id === levelId);
    return test ? test._id || test.id : null;
  } catch {
    return null;
  }
}

export default TestManagement 