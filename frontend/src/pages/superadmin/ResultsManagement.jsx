import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    BarChart3, 
    TrendingUp, 
    Target, 
    Users, 
    Download, 
    Eye, 
    ChevronUp, 
    ChevronDown,
    BookOpen,
    Activity,
    Building,
    Clock,
    Award,
    CheckCircle,
    AlertTriangle,
    XCircle,
    X
} from 'lucide-react';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../services/api';

const ResultsManagement = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);
    
    const [tests, setTests] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [currentView, setCurrentView] = useState('tests'); // 'tests' or 'results'
    const [selectedTest, setSelectedTest] = useState(null);
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

        const fetchTests = async () => {
            try {
                setLoading(true);
                setErrorMsg("");
                // First fetch all uploaded tests
                const testsResponse = await api.get('/test-management/tests');
                if (testsResponse.data.success) {
                    const allTests = testsResponse.data.data || [];
                    
                    // Then fetch test results to get statistics
                    const resultsResponse = await api.get('/superadmin/all-test-results');
                    if (resultsResponse.data.success) {
                        const allResults = resultsResponse.data.data || [];
                        
                        // Group results by test_id to calculate statistics
                        const testStats = {};
                        allResults.forEach(result => {
                            const testId = result.test_id;
                            if (!testStats[testId]) {
                                testStats[testId] = {
                                    total_attempts: 0,
                                    unique_students: new Set(),
                                    scores: [],
                                    highest_score: 0
                                };
                            }
                            testStats[testId].total_attempts++;
                            testStats[testId].unique_students.add(result.student_id);
                            const score = result.average_score || result.score_percentage || 0;
                            testStats[testId].scores.push(score);
                            testStats[testId].highest_score = Math.max(testStats[testId].highest_score, score);
                        });
                        
                        // Combine test data with statistics
                        const testsWithStats = allTests.map(test => {
                            const stats = testStats[test._id] || {
                                total_attempts: 0,
                                unique_students: new Set(),
                                scores: [],
                                highest_score: 0
                            };
                            
                            return {
                                ...test,
                                total_attempts: stats.total_attempts,
                                unique_students: stats.unique_students.size,
                                average_score: stats.scores.length > 0 ? 
                                    (stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length) : 0,
                                highest_score: stats.highest_score,
                                pass_rate: stats.scores.length > 0 ? 
                                    (stats.scores.filter(score => score >= 60).length / stats.scores.length) * 100 : 0
                            };
                        });
                        
                        setTests(testsWithStats);
                        calculateAnalyticsFromTests(testsWithStats);
                    } else {
                        // If results fetch fails, just show tests without stats
                        setTests(allTests.map(test => ({
                            ...test,
                            total_attempts: 0,
                            unique_students: 0,
                            average_score: 0,
                            highest_score: 0,
                            pass_rate: 0
                        })));
                    }
                } else {
                    setErrorMsg(testsResponse.data.message || 'Failed to fetch tests.');
                    error(testsResponse.data.message || 'Failed to fetch tests.');
                }
            } catch (err) {
                setErrorMsg('Failed to fetch tests overview. Please check your login status and try again.');
                error('Failed to fetch tests overview.');
                console.error('Error fetching tests:', err);
            } finally {
                setLoading(false);
            }
        };

        const fetchTestResults = async (testId) => {
            try {
                setLoading(true);
                setErrorMsg("");
                // Use the existing superadmin endpoint and filter by test_id
                const response = await api.get('/superadmin/all-test-results');
                if (response.data.success) {
                    // Filter results for the specific test
                    const filteredResults = (response.data.data || []).filter(result => 
                        result.test_id === testId || result._id === testId
                    );
                    
                    console.log('Filtered results for test:', testId, filteredResults.length);
                    
                    // Group results by student to show student performance
                    const studentResults = {};
                    filteredResults.forEach(result => {
                        const studentId = result.student_id;
                        
                        // Ensure studentId is a string for consistent grouping
                        const studentKey = String(studentId);
                        
                        if (!studentResults[studentKey]) {
                            studentResults[studentKey] = {
                                student_id: studentId,
                                student_name: result.student_name || 'Unknown Student',
                                student_email: result.student_email || 'unknown@example.com',
                                campus_name: result.campus_name || 'Unknown Campus',
                                course_name: result.course_name || 'Unknown Course',
                                batch_name: result.batch_name || 'Unknown Batch',
                                attempts: [],
                                total_attempts: 0,
                                highest_score: 0,
                                average_score: 0,
                                latest_attempt: null
                            };
                        }
                        
                        const score = result.average_score || result.score_percentage || 0;
                        studentResults[studentKey].attempts.push({
                            ...result,
                            score: score
                        });
                        studentResults[studentKey].total_attempts++;
                        studentResults[studentKey].highest_score = Math.max(studentResults[studentKey].highest_score, score);
                        
                        // Keep track of latest attempt
                        if (!studentResults[studentKey].latest_attempt || 
                            new Date(result.submitted_at) > new Date(studentResults[studentKey].latest_attempt.submitted_at)) {
                            studentResults[studentKey].latest_attempt = result;
                        }
                    });
                    
                    console.log('Grouped students:', Object.keys(studentResults).length);
                    
                    // Calculate average scores for each student
                    Object.values(studentResults).forEach(student => {
                        if (student.attempts.length > 0) {
                            student.average_score = student.attempts.reduce((sum, attempt) => sum + attempt.score, 0) / student.attempts.length;
                        }
                    });
                    
                    // Convert to array and sort by highest score
                    const studentResultsArray = Object.values(studentResults).sort((a, b) => b.highest_score - a.highest_score);
                    
                    setResults(studentResultsArray);
                    setCurrentView('results');
                } else {
                    setErrorMsg(response.data.message || 'Failed to fetch test results.');
                    error(response.data.message || 'Failed to fetch test results.');
                }
            } catch (err) {
                setErrorMsg('Failed to fetch test results. Please check your login status and try again.');
                error('Failed to fetch test results.');
                console.error('Error fetching test results:', err);
            } finally {
                setLoading(false);
            }
        };

        // Load filter options and tests overview
        fetchFilterOptions();
        fetchTests();
    }, [error]);

    const calculateAnalyticsFromTests = (testsData) => {
        if (!testsData.length) return;

        const totalTests = testsData.length;
        const totalAttempts = testsData.reduce((sum, test) => sum + (test.total_attempts || 0), 0);
        const totalScore = testsData.reduce((sum, test) => sum + (test.average_score || 0), 0);
        const averageScore = totalScore / totalTests;
        const totalPassed = testsData.reduce((sum, test) => sum + (test.pass_count || 0), 0);
        const passRate = totalAttempts > 0 ? (totalPassed / totalAttempts) * 100 : 0;
        
        // Find top module by average score
        const moduleScores = {};
        testsData.forEach(test => {
            if (!moduleScores[test.module_id]) {
                moduleScores[test.module_id] = { total: 0, count: 0 };
            }
            moduleScores[test.module_id].total += test.average_score || 0;
            moduleScores[test.module_id].count++;
        });
        
        const topModule = Object.keys(moduleScores).reduce((a, b) => 
            moduleScores[a].total / moduleScores[a].count > moduleScores[b].total / moduleScores[b].count ? a : b, 
            Object.keys(moduleScores)[0] || ''
        );
        
        setAnalytics({
            totalTests,
            averageScore: averageScore.toFixed(1),
            passRate: passRate.toFixed(1),
            totalStudents: testsData.reduce((sum, test) => sum + (test.unique_students || 0), 0),
            topModule,
            recentActivity: []
        });
    };

    const handleFilterChange = (e) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleTestClick = (test) => {
        console.log('Test clicked:', test);
        setSelectedTest(test);
        fetchTestResults(test._id);
    };

    const handleBackToTests = () => {
        setCurrentView('tests');
        setSelectedTest(null);
        setResults([]);
    };

    const handleExpand = (resultIdx, attemptIdx) => {
        const key = `${resultIdx}-${attemptIdx}`;
        setExpandedAttempt(expandedAttempt === key ? null : key);
    };

    const handleViewDetail = async (result) => {
        try {
            setSelectedResult(result);
            setShowDetailModal(true);
        } catch (err) {
            console.error('Error fetching detailed results:', err);
            error('Failed to fetch detailed results');
        }
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

    // Filter results based on current filters
    const filteredResults = results.filter(result => {
        if (filters.module && result.module_name !== filters.module) return false;
        if (filters.test_type && result.test_type !== filters.test_type) return false;
        if (filters.campus && result.campus_name !== filters.campus) return false;
        if (filters.course && result.course_name !== filters.course) return false;
        if (filters.batch && result.batch_name !== filters.batch) return false;
        return true;
    });

    if (loading) {
        return <LoadingSpinner size="lg" />;
    }

    return (
        <main className="px-6 lg:px-10 py-12">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            {currentView === 'tests' ? 'Tests Overview' : 'Test Results'}
                        </h1>
                        <p className="mt-2 text-gray-600">
                            {currentView === 'tests' 
                                ? 'Overview of all tests with attempt statistics' 
                                : selectedTest ? `Results for: ${selectedTest.test_name}` : 'Student test results with detailed analysis'
                            }
                        </p>
                        {currentView === 'results' && (
                            <button
                                onClick={handleBackToTests}
                                className="mt-2 flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                            >
                                <ChevronUp className="w-4 h-4" />
                                Back to Tests Overview
                            </button>
                        )}
                    </div>
                    {currentView === 'results' && (
                        <button
                            onClick={handleExportResults}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Export Results
                        </button>
                    )}
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

                {/* Advanced Filters */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 mb-8">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex items-center gap-2 mb-4">
                            <Activity className="w-5 h-5 text-gray-600" />
                            <h3 className="text-lg font-semibold text-gray-800">Advanced Filters</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Module</label>
                                <select
                                    name="module"
                                    value={filters.module}
                                    onChange={handleFilterChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">All Modules</option>
                                    {filterOptions.modules?.map(module => (
                                        <option key={typeof module === 'object' ? module.id : module} value={typeof module === 'object' ? module.name : module}>
                                            {typeof module === 'object' ? module.name : module}
                                        </option>
                                    )) || []}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Test Type</label>
                                <select
                                    name="test_type"
                                    value={filters.test_type}
                                    onChange={handleFilterChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">All Types</option>
                                    {filterOptions.test_types?.map(type => (
                                        <option key={typeof type === 'object' ? type.id : type} value={typeof type === 'object' ? type.name : type}>
                                            {typeof type === 'object' ? type.name : type}
                                        </option>
                                    )) || []}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Campus</label>
                                <select
                                    name="campus"
                                    value={filters.campus}
                                    onChange={handleFilterChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">All Campuses</option>
                                    {filterOptions.campuses?.map(campus => (
                                        <option key={typeof campus === 'object' ? campus.id : campus} value={typeof campus === 'object' ? campus.name : campus}>
                                            {typeof campus === 'object' ? campus.name : campus}
                                        </option>
                                    )) || []}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
                                <select
                                    name="course"
                                    value={filters.course}
                                    onChange={handleFilterChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">All Courses</option>
                                    {filterOptions.courses?.map(course => (
                                        <option key={typeof course === 'object' ? course.id : course} value={typeof course === 'object' ? course.name : course}>
                                            {typeof course === 'object' ? course.name : course}
                                        </option>
                                    )) || []}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Batch</label>
                                <select
                                    name="batch"
                                    value={filters.batch}
                                    onChange={handleFilterChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">All Batches</option>
                                    {filterOptions.batches?.map(batch => (
                                        <option key={typeof batch === 'object' ? batch.id : batch} value={typeof batch === 'object' ? batch.name : batch}>
                                            {typeof batch === 'object' ? batch.name : batch}
                                        </option>
                                    )) || []}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                                <select
                                    name="dateRange"
                                    value={filters.dateRange}
                                    onChange={handleFilterChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="all">All Time</option>
                                    <option value="today">Today</option>
                                    <option value="week">This Week</option>
                                    <option value="month">This Month</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="p-6">
                        {currentView === 'tests' ? (
                            // Tests Overview
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-lg font-semibold text-gray-800">
                                        Tests Overview ({tests.length} tests)
                                    </h4>
                                    <div className="text-sm text-gray-500">
                                        Click on a test to view detailed results
                                    </div>
                                </div>

                                {errorMsg && (
                                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                        <p className="text-red-700">{errorMsg}</p>
                                    </div>
                                )}

                                {tests.length === 0 ? (
                                    <div className="text-center py-12">
                                        <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No tests found</h3>
                                        <p className="text-gray-500">No tests are available in the system.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {tests.map((test, index) => (
                                            <motion.div
                                                key={test._id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                onClick={() => handleTestClick(test)}
                                                className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl hover:border-blue-300 cursor-pointer transition-all duration-200"
                                            >
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                                                            {test.test_name?.charAt(0)?.toUpperCase() || 'T'}
                                                        </div>
                                                        <div>
                                                            <h5 className="font-semibold text-gray-900">{test.test_name}</h5>
                                                            <p className="text-sm text-gray-600">{test.module_id}</p>
                                                        </div>
                                                    </div>
                                                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        test.test_type === 'practice' ? 'bg-green-100 text-green-800' :
                                                        test.test_type === 'online' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {test.test_type}
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Total Attempts:</span>
                                                        <span className="font-semibold text-gray-900">{test.total_attempts}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Highest Score:</span>
                                                        <span className="font-semibold text-green-600">{test.highest_score.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Average Score:</span>
                                                        <span className="font-semibold text-blue-600">{test.average_score.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Pass Rate:</span>
                                                        <span className="font-semibold text-purple-600">{test.pass_rate.toFixed(1)}%</span>
                                                    </div>
                                                </div>

                                                <div className="mt-4 pt-4 border-t border-gray-200">
                                                    <div className="flex items-center justify-center text-blue-600 text-sm font-medium">
                                                        <Eye className="w-4 h-4 mr-1" />
                                                        Click to view results
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Test Results - Student Performance
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-lg font-semibold text-gray-800">
                                        Student Performance ({filteredResults.length} students)
                                    </h4>
                                    <div className="text-sm text-gray-500">
                                        Showing {filteredResults.length} students who attempted this test
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
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
                                        <p className="text-gray-500">No students have attempted this test yet.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredResults.map((student, studentIdx) => (
                                            <motion.div
                                                key={student.student_id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: studentIdx * 0.1 }}
                                                className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow"
                                            >
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                                                            {student.student_name?.charAt(0)?.toUpperCase() || 'S'}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-lg font-semibold text-gray-900">
                                                                {student.student_name}
                                                            </h4>
                                                            <p className="text-sm text-gray-600">{student.student_email}</p>
                                                        </div>
                                                    </div>
                                                    <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getScoreColor(student.highest_score)}`}>
                                                        {getScoreIcon(student.highest_score)}
                                                        {student.highest_score.toFixed(1)}%
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Total Attempts:</span>
                                                        <span className="font-semibold text-gray-900">{student.total_attempts}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Highest Score:</span>
                                                        <span className="font-semibold text-green-600">{student.highest_score.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Average Score:</span>
                                                        <span className="font-semibold text-blue-600">{student.average_score.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">Campus:</span>
                                                        <span className="font-semibold text-purple-600">{student.campus_name}</span>
                                                    </div>
                                                </div>

                                                <div className="mt-4 pt-4 border-t border-gray-200">
                                                    <div className="flex items-center justify-between">
                                                        <div className="text-sm text-gray-600">
                                                            {student.course_name} • {student.batch_name}
                                                        </div>
                                                        <button
                                                            onClick={() => handleViewDetail(student.latest_attempt)}
                                                            className="flex items-center gap-1 text-blue-600 text-sm font-medium hover:text-blue-800 transition-colors"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                            View Details
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </main>
    );
};

export default ResultsManagement;