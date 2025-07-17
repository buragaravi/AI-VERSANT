import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNotification } from '../../contexts/NotificationContext';
import Header from '../../components/common/Header';
import SuperAdminSidebar from '../../components/common/SuperAdminSidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../services/api';
import { BookOpen, User, Calendar, Percent, Filter, Building, Briefcase, GraduationCap, ChevronDown, ChevronUp, Volume2, CheckCircle, XCircle } from 'lucide-react';

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
        batch: ''
    });
    const { error } = useNotification();
    const [expandedAttempt, setExpandedAttempt] = useState(null);

    useEffect(() => {
        const fetchResults = async () => {
            try {
                setLoading(true);
                setErrorMsg("");
                const practiceRes = await api.get('/superadmin/student-practice-results');
                const onlineRes = await api.get('/superadmin/student-online-results');
                setResults([...(practiceRes.data.data || []), ...(onlineRes.data.data || [])]);
            } catch (err) {
                setErrorMsg('Failed to fetch test results. Please check your login status and try again.');
                error('Failed to fetch test results.');
                console.error('Error fetching results:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, [error]);

    const filteredResults = useMemo(() => {
        return results.filter(result => {
            const moduleMatch = filters.module ? result.module_name === filters.module : true;
            const typeMatch = filters.test_type ? result.test_type === filters.test_type : true;
            const campusMatch = filters.campus ? result.campus_name === filters.campus : true;
            const courseMatch = filters.course ? result.course_name === filters.course : true;
            const batchMatch = filters.batch ? result.batch_name === filters.batch : true;
            return moduleMatch && typeMatch && campusMatch && courseMatch && batchMatch;
        });
    }, [results, filters]);

    const moduleOptions = useMemo(() => [...new Set(results.map(r => r.module_name))], [results]);
    const typeOptions = useMemo(() => [...new Set(results.map(r => r.test_type))], [results]);
    const campusOptions = useMemo(() => [...new Set(results.map(r => r.campus_name).filter(Boolean))], [results]);
    const courseOptions = useMemo(() => [...new Set(results.map(r => r.course_name).filter(Boolean))], [results]);
    const batchOptions = useMemo(() => [...new Set(results.map(r => r.batch_name).filter(Boolean))], [results]);

    const handleFilterChange = (e) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleExpand = (resultIdx, attemptIdx) => {
        const key = `${resultIdx}-${attemptIdx}`;
        setExpandedAttempt(expandedAttempt === key ? null : key);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <SuperAdminSidebar />
            <div className="flex-1">
                <Header />
                <main className="px-6 lg:px-10 py-12">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <h1 className="text-3xl font-bold text-headline">Test Results</h1>
                        <p className="mt-2 text-paragraph">View and analyze results from all student test submissions.</p>

                        <div className="mt-8 bg-secondary rounded-2xl shadow-lg">
                            <div className="p-6 border-b border-stroke">
                                <h3 className="text-xl font-semibold text-gray-800 flex items-center"><Filter className="mr-3 h-5 w-5 text-gray-400" /> Filters</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
                                    <select name="module" value={filters.module} onChange={handleFilterChange} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                                        <option value="">All Modules</option>
                                        {moduleOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                    <select name="test_type" value={filters.test_type} onChange={handleFilterChange} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                                        <option value="">All Types</option>
                                        {typeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                    <select name="campus" value={filters.campus} onChange={handleFilterChange} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                                        <option value="">All Campuses</option>
                                        {campusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                    <select name="course" value={filters.course} onChange={handleFilterChange} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                                        <option value="">All Courses</option>
                                        {courseOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                    <select name="batch" value={filters.batch} onChange={handleFilterChange} className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                                        <option value="">All Batches</option>
                                        {batchOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto">
                                {loading ? <LoadingSpinner /> : errorMsg ? (
                                    <div className="text-red-600 text-center py-8 font-semibold">{errorMsg}</div>
                                ) : filteredResults.length === 0 ? (
                                    <div className="text-gray-500 text-center py-8">No results found.</div>
                                ) : (
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campus</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Name</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted At</th>
                                                <th className="px-6 py-3"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredResults.map((result, resultIdx) => (
                                                result.attempts.map((attempt, attemptIdx) => {
                                                    const key = `${resultIdx}-${attemptIdx}`;
                                                    return (
                                                        <React.Fragment key={key}>
                                                            <tr>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{result.student_name}</div>
                                                                    <div className="text-sm text-gray-500">{result.student_email}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{result.campus_name || 'N/A'}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{attempt.test_name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 capitalize">{result.test_type}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">{attempt.score?.toFixed(2) || 0.00}%</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{attempt.submitted_at}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                                    <button onClick={() => handleExpand(resultIdx, attemptIdx)} className="text-indigo-600 hover:text-indigo-900">
                                                                        {expandedAttempt === key ? <ChevronUp /> : <ChevronDown />}
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                            {expandedAttempt === key && (
                                                                <tr>
                                                                    <td colSpan={7} className="bg-gray-50 px-6 py-4">
                                                                        <div className="space-y-4">
                                                                            {attempt.detailed_results && attempt.detailed_results.length > 0 ? (
                                                                                attempt.detailed_results.map((q, qIdx) => (
                                                                                    <div key={qIdx} className="border rounded-lg p-4 bg-white shadow-sm">
                                                                                        <div className="font-semibold mb-2">Q{qIdx + 1}: {q.question || q.original_text}</div>
                                                                                        {q.question_type === 'mcq' ? (
                                                                                            <div>
                                                                                                <div className="mb-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                                                    {q.options && Object.entries(q.options).map(([key, value]) => {
                                                                                                        const isCorrect = key === q.correct_answer;
                                                                                                        const isStudent = key === q.student_answer;
                                                                                                        return (
                                                                                                            <div
                                                                                                                key={key}
                                                                                                                className={`flex items-center p-3 rounded-lg border-2 text-base font-medium transition-all
                                                                                                                    ${isCorrect ? 'border-green-500 bg-green-50 text-green-800' :
                                                                                                                        isStudent ? 'border-red-500 bg-red-50 text-red-800' :
                                                                                                                        'border-gray-200 bg-white text-gray-700'}`}
                                                                                                            >
                                                                                                                <span className="font-bold mr-2">{key}.</span>
                                                                                                                <span>{value}</span>
                                                                                                                {isCorrect && <span className="ml-2 text-green-600 font-bold">(Correct)</span>}
                                                                                                                {isStudent && !isCorrect && <span className="ml-2 text-red-600 font-bold">(Your Answer)</span>}
                                                                                                            </div>
                                                                                                        );
                                                                                                    })}
                                                                                                </div>
                                                                                                <div className="mt-2 text-sm">
                                                                                                    <span className="font-semibold">Your Answer:</span> <span className={q.is_correct ? 'text-green-700' : 'text-red-700'}>{q.student_answer || 'N/A'}</span>
                                                                                                    <span className="ml-4 font-semibold">Correct Answer:</span> <span className="text-green-700">{q.correct_answer}</span>
                                                                                                    {q.is_correct ? (
                                                                                                        <span className="ml-4 flex items-center text-green-600"><CheckCircle className="h-5 w-5 mr-1" /> Correct</span>
                                                                                                    ) : (
                                                                                                        <span className="ml-4 flex items-center text-red-600"><XCircle className="h-5 w-5 mr-1" /> Incorrect</span>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div>
                                                                                                <div className="mb-1">Transcript: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{q.student_text}</span></div>
                                                                                                <div className="mb-1">Similarity Score: <span className="font-semibold">{q.similarity_score?.toFixed(2) || 0}%</span></div>
                                                                                                <div className="mb-1">Missing Words: <span className="text-yellow-700">{q.missing_words && q.missing_words.join(', ')}</span></div>
                                                                                                <div className="mb-1">Extra Words: <span className="text-blue-700">{q.extra_words && q.extra_words.join(', ')}</span></div>
                                                                                                {q.student_audio_url && (
                                                                                                    <audio controls src={`https://<YOUR_S3_BUCKET_URL>/${q.student_audio_url}`} className="mt-2">
                                                                                                        Your browser does not support the audio element.
                                                                                                    </audio>
                                                                                                )}
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                ))
                                                                            ) : (
                                                                                <div className="text-gray-500">No detailed results available.</div>
                                                                            )}
                                                                        </div>
                                                    </td>
                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </main>
            </div>
        </div>
    );
};

export default ResultsManagement; 