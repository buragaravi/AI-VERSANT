import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../services/api';
import { 
  BookOpen, 
  User, 
  Calendar, 
  Percent, 
  Filter, 
  Building, 
  Briefcase, 
  GraduationCap, 
  ChevronDown, 
  ChevronUp, 
  Volume2, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Download,
  Eye,
  Clock,
  Award,
  AlertTriangle,
  Users,
  Target,
  Activity
} from 'lucide-react';

const ResultsManagement = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);
    
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [filters, setFilters] = useState({ 
        module: '', 
        test_type: '',
        campus: '',
        course: '',
        batch: '',
        dateRange: 'all',
        scoreRange: 'all'
    });
    const { error, success } = useNotification();
    const [expandedAttempt, setExpandedAttempt] = useState(null);
    const [selectedResult, setSelectedResult] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [filterOptions, setFilterOptions] = useState({
        modules: [],
        test_types: [],
        campuses: [],
        courses: [],
        batches: []
    });
    const [analytics, setAnalytics] = useState({
        totalTests: 0,
        averageScore: 0,
        passRate: 0,
        totalStudents: 0,
        topModule: '',
        recentActivity: []
    });

    useEffect(() => {
        const fetchFilterOptions = async () => {
            try {
                const response = await api.get('/superadmin/filter-options');
                if (response.data.success) {
                    setFilterOptions(response.data.data);
                }
            } catch (err) {
                console.error('Error fetching filter options:', err);
            }
        };

        const fetchResults = async () => {
            try {
                setLoading(true);
                setErrorMsg("");
                const practiceRes = await api.get('/superadmin/student-practice-results');
                const onlineRes = await api.get('/superadmin/student-online-results');
                const allResults = [...(practiceRes.data.data || []), ...(onlineRes.data.data || [])];
                setResults(allResults);
                
                // Calculate analytics
                calculateAnalytics(allResults);
            } catch (err) {
                setErrorMsg('Failed to fetch test results. Please check your login status and try again.');
                error('Failed to fetch test results.');
                console.error('Error fetching results:', err);
            } finally {
                setLoading(false);
            }
        };

        // Load both filter options and results
        fetchFilterOptions();
        fetchResults();
    }, [error]);

    const calculateAnalytics = (resultsData) => {
        if (!resultsData.length) return;

        const totalTests = resultsData.length;
        const totalScore = resultsData.reduce((sum, result) => sum + (result.average_score || 0), 0);
        const averageScore = totalScore / totalTests;
        const passedTests = resultsData.filter(result => (result.average_score || 0) >= 60).length;
        const passRate = (passedTests / totalTests) * 100;
        
        // Get unique students
        const uniqueStudents = new Set(resultsData.map(r => r.student_id)).size;
        
        // Find top module by average score
        const moduleScores = {};
        resultsData.forEach(result => {
            if (!moduleScores[result.module_name]) {
                moduleScores[result.module_name] = { total: 0, count: 0 };
            }
            moduleScores[result.module_name].total += result.average_score || 0;
            moduleScores[result.module_name].count += 1;
        });
        
        const topModule = Object.entries(moduleScores)
            .map(([module, data]) => ({ module, avg: data.total / data.count }))
            .sort((a, b) => b.avg - a.avg)[0]?.module || 'N/A';

        // Recent activity (last 10 results)
        const recentActivity = resultsData
            .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
            .slice(0, 10);

        setAnalytics({
            totalTests,
            averageScore: Math.round(averageScore * 100) / 100,
            passRate: Math.round(passRate * 100) / 100,
            totalStudents: uniqueStudents,
            topModule,
            recentActivity
        });
    };

    const filteredResults = useMemo(() => {
        return results.filter(result => {
            const moduleMatch = filters.module ? result.module_name === filters.module : true;
            const typeMatch = filters.test_type ? result.test_type === filters.test_type : true;
            const campusMatch = filters.campus ? result.campus_name === filters.campus : true;
            const courseMatch = filters.course ? result.course_name === filters.course : true;
            const batchMatch = filters.batch ? result.batch_name === filters.batch : true;
            
            // Date range filter
            let dateMatch = true;
            if (filters.dateRange !== 'all') {
                const resultDate = new Date(result.submitted_at);
                const now = new Date();
                const daysDiff = (now - resultDate) / (1000 * 60 * 60 * 24);
                
                switch (filters.dateRange) {
                    case 'today':
                        dateMatch = daysDiff < 1;
                        break;
                    case 'week':
                        dateMatch = daysDiff < 7;
                        break;
                    case 'month':
                        dateMatch = daysDiff < 30;
                        break;
                }
            }
            
            // Score range filter
            let scoreMatch = true;
            if (filters.scoreRange !== 'all') {
                const score = result.average_score || 0;
                switch (filters.scoreRange) {
                    case 'excellent':
                        scoreMatch = score >= 90;
                        break;
                    case 'good':
                        scoreMatch = score >= 70 && score < 90;
                        break;
                    case 'average':
                        scoreMatch = score >= 50 && score < 70;
                        break;
                    case 'poor':
                        scoreMatch = score < 50;
                        break;
                }
            }
            
            return moduleMatch && typeMatch && campusMatch && courseMatch && batchMatch && dateMatch && scoreMatch;
        });
    }, [results, filters]);

    const handleFilterChange = (e) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleExpand = (resultIdx, attemptIdx) => {
        const key = `${resultIdx}-${attemptIdx}`;
        setExpandedAttempt(expandedAttempt === key ? null : key);
    };

    const handleViewDetail = (result) => {
        setSelectedResult(result);
        setShowDetailModal(true);
    };

    const handleExportResults = async () => {
        try {
            const response = await api.get('/superadmin/export-results', {
                params: filters,
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `test-results-${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            
            success('Results exported successfully!');
        } catch (err) {
            error('Failed to export results');
        }
    };

    const getScoreColor = (score) => {
        if (score >= 90) return 'text-green-600 bg-green-100';
        if (score >= 70) return 'text-blue-600 bg-blue-100';
        if (score >= 50) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    const getScoreIcon = (score) => {
        if (score >= 90) return <Award className="w-4 h-4" />;
        if (score >= 70) return <CheckCircle className="w-4 h-4" />;
        if (score >= 50) return <AlertTriangle className="w-4 h-4" />;
        return <XCircle className="w-4 h-4" />;
    };

    if (loading) {
        return <LoadingSpinner size="lg" />;
    }

    return (
        <main className="px-6 lg:px-10 py-12">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Test Results Dashboard</h1>
                        <p className="mt-2 text-gray-600">Comprehensive analysis and management of student test results</p>
                    </div>
                    <button
                        onClick={handleExportResults}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export Results
                    </button>
                </div>

                {/* Analytics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Tests</p>
                                <p className="text-2xl font-bold text-gray-900">{analytics.totalTests}</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <BarChart3 className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Average Score</p>
                                <p className="text-2xl font-bold text-gray-900">{analytics.averageScore}%</p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-lg">
                                <TrendingUp className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Pass Rate</p>
                                <p className="text-2xl font-bold text-gray-900">{analytics.passRate}%</p>
                            </div>
                            <div className="p-3 bg-yellow-100 rounded-lg">
                                <Target className="w-6 h-6 text-yellow-600" />
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Active Students</p>
                                <p className="text-2xl font-bold text-gray-900">{analytics.totalStudents}</p>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-lg">
                                <Users className="w-6 h-6 text-purple-600" />
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Filters Section */}
                <div className="bg-white rounded-2xl shadow-lg mb-8">
                    <div className="p-6 border-b border-gray-200">
                        <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                            <Filter className="w-5 h-5 text-gray-400" />
                            Advanced Filters
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                            <select 
                                name="module" 
                                value={filters.module} 
                                onChange={handleFilterChange} 
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All Modules</option>
                                {filterOptions.modules.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                            </select>
                            
                            <select 
                                name="test_type" 
                                value={filters.test_type} 
                                onChange={handleFilterChange} 
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All Types</option>
                                {filterOptions.test_types.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                            </select>
                            
                            <select 
                                name="campus" 
                                value={filters.campus} 
                                onChange={handleFilterChange} 
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All Campuses</option>
                                {filterOptions.campuses.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                            </select>
                            
                            <select 
                                name="course" 
                                value={filters.course} 
                                onChange={handleFilterChange} 
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All Courses</option>
                                {filterOptions.courses.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                            </select>
                            
                            <select 
                                name="batch" 
                                value={filters.batch} 
                                onChange={handleFilterChange} 
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">All Batches</option>
                                {filterOptions.batches.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                            </select>
                            
                            <select 
                                name="dateRange" 
                                value={filters.dateRange} 
                                onChange={handleFilterChange} 
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                            </select>
                            
                            <select 
                                name="scoreRange" 
                                value={filters.scoreRange} 
                                onChange={handleFilterChange} 
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="all">All Scores</option>
                                <option value="excellent">Excellent (90%+)</option>
                                <option value="good">Good (70-89%)</option>
                                <option value="average">Average (50-69%)</option>
                                <option value="poor">Poor (50% or less)</option>
                            </select>
                        </div>
                    </div>

                    {/* Results Table */}
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-lg font-semibold text-gray-800">
                                Test Results ({filteredResults.length} found)
                            </h4>
                            <div className="text-sm text-gray-500">
                                Showing {filteredResults.length} of {results.length} results
                            </div>
                        </div>

                        {errorMsg && (
                            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-700">{errorMsg}</p>
                            </div>
                        )}

                        {filteredResults.length === 0 ? (
                            <div className="text-center py-12">
                                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                                <p className="text-gray-500">Try adjusting your filters to see more results.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredResults.map((result, resultIdx) => (
                                    <motion.div
                                        key={result._id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                                                    {result.student_name?.charAt(0)?.toUpperCase() || 'S'}
                                                </div>
                                                <div>
                                                    <h4 className="text-lg font-semibold text-gray-900">
                                                        {result.student_name}
                                                    </h4>
                                                    <p className="text-sm text-gray-600">{result.student_email}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-4">
                                                <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getScoreColor(result.average_score)}`}>
                                                    {getScoreIcon(result.average_score)}
                                                    {result.average_score}%
                                                </div>
                                                
                                                <button
                                                    onClick={() => handleViewDetail(result)}
                                                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                
                                                <button
                                                    onClick={() => handleExpand(resultIdx, 0)}
                                                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    {expandedAttempt === `${resultIdx}-0` ? 
                                                        <ChevronUp className="w-4 h-4" /> : 
                                                        <ChevronDown className="w-4 h-4" />
                                                    }
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm text-gray-600">{result.module_name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Activity className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm text-gray-600">{result.test_type}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Building className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm text-gray-600">{result.campus_name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm text-gray-600">
                                                    {new Date(result.submitted_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Expanded Details */}
                                        {expandedAttempt === `${resultIdx}-0` && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="mt-4 pt-4 border-t border-gray-200"
                                            >
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <h5 className="font-medium text-gray-900 mb-2">Test Details</h5>
                                                        <div className="space-y-2 text-sm">
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Course:</span>
                                                                <span className="font-medium">{result.course_name}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Batch:</span>
                                                                <span className="font-medium">{result.batch_name}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Duration:</span>
                                                                <span className="font-medium">{result.duration || 'N/A'} min</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Questions:</span>
                                                                <span className="font-medium">{result.total_questions || 'N/A'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div>
                                                        <h5 className="font-medium text-gray-900 mb-2">Performance</h5>
                                                        <div className="space-y-2 text-sm">
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Correct Answers:</span>
                                                                <span className="font-medium">{result.correct_answers || 'N/A'}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Time Taken:</span>
                                                                <span className="font-medium">{result.time_taken || 'N/A'} min</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Status:</span>
                                                                <span className={`font-medium ${result.average_score >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                                                                    {result.average_score >= 60 ? 'Passed' : 'Failed'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Detail Modal */}
            {showDetailModal && selectedResult && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-semibold text-gray-900">Test Result Details</h3>
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-4">Student Information</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Name:</span>
                                            <span className="font-medium">{selectedResult.student_name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Email:</span>
                                            <span className="font-medium">{selectedResult.student_email}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Campus:</span>
                                            <span className="font-medium">{selectedResult.campus_name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Course:</span>
                                            <span className="font-medium">{selectedResult.course_name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Batch:</span>
                                            <span className="font-medium">{selectedResult.batch_name}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <h4 className="font-medium text-gray-900 mb-4">Test Information</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Module:</span>
                                            <span className="font-medium">{selectedResult.module_name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Test Type:</span>
                                            <span className="font-medium">{selectedResult.test_type}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Score:</span>
                                            <span className={`font-medium ${getScoreColor(selectedResult.average_score)}`}>
                                                {selectedResult.average_score}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Submitted:</span>
                                            <span className="font-medium">
                                                {new Date(selectedResult.submitted_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Duration:</span>
                                            <span className="font-medium">{selectedResult.duration || 'N/A'} min</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default ResultsManagement; 