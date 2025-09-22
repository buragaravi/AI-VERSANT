import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  BrainCircuit, 
  Headphones, 
  Mic, 
  Calculator, 
  Lightbulb,
  Users,
  BarChart3,
  TrendingUp,
  Eye,
  Search,
  Filter,
  X,
  Target,
  Clock,
  Award,
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Activity,
  Zap,
  Brain,
  Star,
  Flame,
  Trophy,
  TrendingDown,
  Minus
} from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import TestProgressChart from '../../components/student/TestProgressChart';
import SuperAdminAttemptDetailsModal from '../../components/superadmin/SuperAdminAttemptDetailsModal';
import api from '../../services/api';

const ProgressTracking = () => {
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedTest, setSelectedTest] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentProgress, setShowStudentProgress] = useState(false);
  const [showAttemptDetails, setShowAttemptDetails] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  
  const [practiceTests, setPracticeTests] = useState({});
  const [testStudents, setTestStudents] = useState({ attempted: [], unattempted: [] });
  const [studentProgress, setStudentProgress] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, attempted, unattempted
  
  const { success, error } = useNotification();

  // Module definitions with icons
  const modules = [
    { id: 'GRAMMAR', name: 'Grammar', icon: BookOpen, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { id: 'VOCABULARY', name: 'Vocabulary', icon: BrainCircuit, color: 'text-green-600', bgColor: 'bg-green-50' },
    { id: 'LISTENING', name: 'Listening', icon: Headphones, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { id: 'SPEAKING', name: 'Speaking', icon: Mic, color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { id: 'APTITUDE', name: 'Aptitude', icon: Calculator, color: 'text-red-600', bgColor: 'bg-red-50' },
    { id: 'REASONING', name: 'Reasoning', icon: Lightbulb, color: 'text-yellow-600', bgColor: 'bg-yellow-50' }
  ];

  useEffect(() => {
    fetchPracticeTests();
  }, []);

  const fetchPracticeTests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/superadmin/practice-tests-by-module');
      if (response.data.success) {
        setPracticeTests(response.data.data);
      } else {
        error('Failed to fetch practice tests');
      }
    } catch (err) {
      console.error('Error fetching practice tests:', err);
      error('Failed to fetch practice tests');
    } finally {
      setLoading(false);
    }
  };

  const fetchTestStudents = async (testId) => {
    try {
      setLoading(true);
      const response = await api.get(`/superadmin/test-assigned-students/${testId}`);
      if (response.data.success) {
        setTestStudents({
          attempted: response.data.data.attempted_students,
          unattempted: response.data.data.unattempted_students,
          test: response.data.data.test,
          summary: response.data.data.summary
        });
      } else {
        error('Failed to fetch test students');
      }
    } catch (err) {
      console.error('Error fetching test students:', err);
      error('Failed to fetch test students');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentProgress = async (studentId, testId) => {
    try {
      setLoading(true);
      const response = await api.get(`/superadmin/student-test-progress/${studentId}/${testId}`);
      if (response.data.success) {
        setStudentProgress(response.data.data);
      } else {
        error('Failed to fetch student progress');
      }
    } catch (err) {
      console.error('Error fetching student progress:', err);
      error('Failed to fetch student progress');
    } finally {
      setLoading(false);
    }
  };

  const handleModuleSelect = (module) => {
    setSelectedModule(module);
    setSelectedTest(null);
    setTestStudents({ attempted: [], unattempted: [] });
    setShowStudentProgress(false);
  };

  const handleTestSelect = (test) => {
    setSelectedTest(test);
    fetchTestStudents(test.test_id);
    setShowStudentProgress(false);
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    fetchStudentProgress(student.student_id, selectedTest.test_id);
    setShowStudentProgress(true);
  };

  const handleAttemptClick = (attempt) => {
    setSelectedAttempt(attempt);
    setShowAttemptDetails(true);
  };

  const handleCloseStudentProgress = () => {
    setShowStudentProgress(false);
    setSelectedStudent(null);
    setStudentProgress(null);
  };

  const handleCloseAttemptDetails = () => {
    setShowAttemptDetails(false);
    setSelectedAttempt(null);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Filter students based on search and filter type
  const getFilteredStudents = () => {
    let students = [];
    
    if (filterType === 'attempted') {
      students = testStudents.attempted || [];
    } else if (filterType === 'unattempted') {
      students = testStudents.unattempted || [];
    } else {
      students = [...(testStudents.attempted || []), ...(testStudents.unattempted || [])];
    }
    
    if (searchTerm) {
      students = students.filter(student => 
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.roll_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return students;
  };

  // Get student behavior insights
  const getStudentBehaviorInsights = (student) => {
    if (!student.latest_score && student.latest_score !== 0) return null;
    
    const insights = {
      performance: 'average',
      trend: 'stable',
      consistency: 'medium',
      engagement: 'low'
    };

    // Performance level
    if (student.latest_score >= 90) insights.performance = 'excellent';
    else if (student.latest_score >= 80) insights.performance = 'very-good';
    else if (student.latest_score >= 70) insights.performance = 'good';
    else if (student.latest_score >= 60) insights.performance = 'average';
    else insights.performance = 'needs-improvement';

    // Trend analysis (if we have multiple attempts)
    if (student.total_attempts > 1) {
      // This would need actual attempt data, for now we'll simulate
      if (student.latest_score > student.highest_score * 0.9) insights.trend = 'improving';
      else if (student.latest_score < student.highest_score * 0.7) insights.trend = 'declining';
    }

    // Engagement level
    if (student.total_attempts >= 5) insights.engagement = 'high';
    else if (student.total_attempts >= 3) insights.engagement = 'medium';
    else insights.engagement = 'low';

    return insights;
  };

  // Get performance badge
  const getPerformanceBadge = (insights) => {
    if (!insights) return null;
    
    const badges = {
      excellent: { icon: Trophy, color: 'text-yellow-600', bg: 'bg-yellow-100', text: 'Excellent' },
      'very-good': { icon: Star, color: 'text-green-600', bg: 'bg-green-100', text: 'Very Good' },
      good: { icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-100', text: 'Good' },
      average: { icon: Target, color: 'text-orange-600', bg: 'bg-orange-100', text: 'Average' },
      'needs-improvement': { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100', text: 'Needs Help' }
    };

    const badge = badges[insights.performance];
    const Icon = badge.icon;
    
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.text}
      </div>
    );
  };

  // Get trend indicator
  const getTrendIndicator = (insights) => {
    if (!insights || insights.trend === 'stable') return null;
    
    const trends = {
      improving: { icon: ArrowUp, color: 'text-green-600', text: 'Improving' },
      declining: { icon: ArrowDown, color: 'text-red-600', text: 'Declining' }
    };

    const trend = trends[insights.trend];
    const Icon = trend.icon;
    
    return (
      <div className={`inline-flex items-center gap-1 text-xs font-medium ${trend.color}`}>
        <Icon className="w-3 h-3" />
        {trend.text}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Modern Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Student Behavior Analytics
              </h1>
              <p className="text-gray-600 text-lg">Track performance patterns and learning insights</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left Sidebar - Module & Test Selection */}
          <div className="xl:col-span-1 space-y-6">
            {/* Module Selection */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Learning Modules</h3>
              </div>
              <div className="space-y-3">
                {modules.map((module) => {
                  const moduleTests = practiceTests[module.id] || [];
                  const Icon = module.icon;
                  const isSelected = selectedModule?.id === module.id;
                  
                  return (
                    <motion.button
                      key={module.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleModuleSelect(module)}
                      className={`w-full p-4 rounded-xl text-left transition-all duration-300 ${
                        isSelected
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg'
                          : 'bg-white/60 hover:bg-white/80 border border-gray-200/50'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-white/20' : module.bgColor}`}>
                          <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : module.color}`} />
                        </div>
                        <div className="flex-1 ml-3">
                          <div className="font-semibold text-sm">{module.name}</div>
                          <div className={`text-xs ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                            {moduleTests.length} test{moduleTests.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        {isSelected && <Zap className="w-4 h-4 text-white" />}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            {/* Test Selection */}
            {selectedModule && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedModule.name} Tests</h3>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {(practiceTests[selectedModule.id] || []).map((test) => (
                    <motion.button
                      key={test.test_id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleTestSelect(test)}
                      className={`w-full p-3 rounded-xl text-left transition-all duration-300 ${
                        selectedTest?.test_id === test.test_id
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                          : 'bg-white/60 hover:bg-white/80 border border-gray-200/50'
                      }`}
                    >
                      <div className="font-medium text-sm">{test.test_name}</div>
                      <div className={`text-xs mt-1 ${
                        selectedTest?.test_id === test.test_id ? 'text-white/80' : 'text-gray-500'
                      }`}>
                        {test.subcategory || 'N/A'} • {test.total_questions} questions
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Main Content - Analytics Dashboard */}
          <div className="xl:col-span-3">
            {selectedTest ? (
              <div className="space-y-6">
                {/* Test Overview Card */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl">
                        <BarChart3 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{selectedTest.test_name}</h2>
                        <p className="text-gray-600">{selectedTest.subcategory || 'Practice Test'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedTest(null);
                        setTestStudents({ attempted: [], unattempted: [] });
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-6 h-6" />
                        <div>
                          <div className="text-2xl font-bold">{testStudents.summary?.attempted_count || 0}</div>
                          <div className="text-sm opacity-90">Attempted</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 text-white">
                      <div className="flex items-center gap-3">
                        <Clock className="w-6 h-6" />
                        <div>
                          <div className="text-2xl font-bold">{testStudents.summary?.unattempted_count || 0}</div>
                          <div className="text-sm opacity-90">Not Started</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl p-4 text-white">
                      <div className="flex items-center gap-3">
                        <Users className="w-6 h-6" />
                        <div>
                          <div className="text-2xl font-bold">{testStudents.summary?.total_assigned || 0}</div>
                          <div className="text-sm opacity-90">Total Students</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Search and Filter */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6"
                >
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          placeholder="Search students by name, email, or roll number..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/60 backdrop-blur-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {[
                        { key: 'all', label: 'All', icon: Users, color: 'blue' },
                        { key: 'attempted', label: 'Attempted', icon: CheckCircle, color: 'green' },
                        { key: 'unattempted', label: 'Not Started', icon: Clock, color: 'orange' }
                      ].map((filter) => {
                        const Icon = filter.icon;
                        const isActive = filterType === filter.key;
                        return (
                          <button
                            key={filter.key}
                            onClick={() => setFilterType(filter.key)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                              isActive
                                ? `bg-gradient-to-r from-${filter.color}-500 to-${filter.color}-600 text-white shadow-lg`
                                : 'bg-white/60 hover:bg-white/80 text-gray-700 border border-gray-200/50'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {filter.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>

                {/* Students Analytics Grid */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl overflow-hidden"
                >
                  <div className="p-6 border-b border-gray-200/50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-900">
                        Student Performance Analytics
                      </h3>
                      <div className="text-sm text-gray-600">
                        {getFilteredStudents().length} students
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 p-6 max-h-96 overflow-y-auto">
                    {getFilteredStudents().map((student) => {
                      const insights = getStudentBehaviorInsights(student);
                      
                      return (
                        <motion.div
                          key={student.student_id}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleStudentSelect(student)}
                          className="bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200/50 p-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-blue-300/50"
                        >
                          {/* Student Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-900 text-lg">{student.name}</h4>
                              <p className="text-sm text-gray-600">
                                {student.email}
                              </p>
                              <p className="text-xs text-gray-500">
                                Roll: {student.roll_number}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {getPerformanceBadge(insights)}
                              {getTrendIndicator(insights)}
                            </div>
                          </div>

                          {/* Performance Metrics */}
                          {student.latest_score !== undefined ? (
                            <div className="space-y-3">
                              {/* Score Display */}
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-600">Latest Score</span>
                                <div className={`text-2xl font-bold ${getScoreColor(student.latest_score)}`}>
                                  {student.latest_score?.toFixed(1)}%
                                </div>
                              </div>

                              {/* Attempts & Engagement */}
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-1">
                                  <Activity className="w-4 h-4 text-blue-500" />
                                  <span className="text-gray-600">{student.total_attempts} attempts</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Award className="w-4 h-4 text-yellow-500" />
                                  <span className="text-gray-600">{student.highest_score?.toFixed(1)}% best</span>
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-500 ${
                                    student.latest_score >= 80 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                                    student.latest_score >= 60 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                                    'bg-gradient-to-r from-red-400 to-red-500'
                                  }`}
                                  style={{ width: `${Math.min(student.latest_score, 100)}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">No attempts yet</p>
                            </div>
                          )}

                          {/* View Details Button */}
                          <div className="mt-4 pt-3 border-t border-gray-200/50">
                            <div className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 transition-colors">
                              <Eye className="w-4 h-4" />
                              <span className="text-sm font-medium">View Details</span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-12 text-center"
              >
                <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl w-20 h-20 mx-auto mb-6">
                  <BarChart3 className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Select a Test to Begin</h3>
                <p className="text-gray-600 text-lg max-w-md mx-auto">
                  Choose a learning module and test to analyze student behavior patterns and performance insights
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Student Progress Modal */}
      {showStudentProgress && studentProgress && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden border border-white/20"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Brain className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">
                      {studentProgress.student.name}
                    </h3>
                    <p className="text-indigo-100 mt-1">
                      {studentProgress.test.test_name} • Roll: {studentProgress.student.roll_number}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseStudentProgress}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto max-h-[80vh] bg-gradient-to-br from-slate-50 to-blue-50">
              <div className="space-y-8">
                {/* Progress Chart */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900">Performance Trend</h4>
                  </div>
                  <div className="h-80">
                    <TestProgressChart 
                      attempts={studentProgress.attempts} 
                      testName={studentProgress.test.test_name}
                    />
                  </div>
                </motion.div>

                {/* Summary Stats */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 md:grid-cols-4 gap-6"
                >
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl p-6 text-white">
                    <div className="flex items-center gap-3">
                      <Activity className="w-8 h-8" />
                      <div>
                        <div className="text-3xl font-bold">{studentProgress.summary.total_attempts}</div>
                        <div className="text-blue-100">Total Attempts</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-6 text-white">
                    <div className="flex items-center gap-3">
                      <Trophy className="w-8 h-8" />
                      <div>
                        <div className="text-3xl font-bold">{studentProgress.summary.highest_score?.toFixed(1)}%</div>
                        <div className="text-yellow-100">Highest Score</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-6 text-white">
                    <div className="flex items-center gap-3">
                      <Target className="w-8 h-8" />
                      <div>
                        <div className="text-3xl font-bold">{studentProgress.summary.average_score?.toFixed(1)}%</div>
                        <div className="text-green-100">Average Score</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-6 text-white">
                    <div className="flex items-center gap-3">
                      <Star className="w-8 h-8" />
                      <div>
                        <div className="text-3xl font-bold">{studentProgress.summary.latest_score?.toFixed(1)}%</div>
                        <div className="text-purple-100">Latest Score</div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Attempts List */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 border-b border-gray-200/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900">Attempt History</h4>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200/50">
                    {studentProgress.attempts.map((attempt, index) => (
                      <motion.div 
                        key={attempt.attempt_id} 
                        whileHover={{ scale: 1.01 }}
                        className="p-6 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 transition-all duration-300"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                  {index + 1}
                                </div>
                                <h5 className="text-lg font-bold text-gray-900">
                                  Attempt {index + 1}
                                </h5>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  attempt.score >= 80 ? 'bg-green-100 text-green-800' :
                                  attempt.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {attempt.score >= 80 ? 'Excellent' : attempt.score >= 60 ? 'Good' : 'Needs Improvement'}
                                </div>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 ml-10">
                              {new Date(attempt.submitted_at).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })} • 
                              {attempt.correct_answers}/{attempt.total_questions} correct answers
                            </p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <div className={`text-2xl font-bold ${getScoreColor(attempt.score)}`}>
                                {attempt.score?.toFixed(1)}%
                              </div>
                              <div className="text-xs text-gray-500">Score</div>
                            </div>
                            <button
                              onClick={() => handleAttemptClick(attempt)}
                              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                            >
                              <Eye className="w-4 h-4" />
                              View Details
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Attempt Details Modal */}
      {showAttemptDetails && selectedAttempt && (
        <SuperAdminAttemptDetailsModal
          isOpen={showAttemptDetails}
          onClose={handleCloseAttemptDetails}
          attempt={selectedAttempt}
          test={studentProgress?.test}
        />
      )}
    </div>
  );
};

export default ProgressTracking;
