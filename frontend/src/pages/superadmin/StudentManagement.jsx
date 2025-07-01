import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNotification } from '../../contexts/NotificationContext';
import Header from '../../components/common/Header';
import SuperAdminSidebar from '../../components/common/SuperAdminSidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../services/api';
import { Users, Filter, Search, Trash2, ListChecks, CheckCircle, BookOpen, Lock, Unlock } from 'lucide-react';
import Modal from '../../components/common/Modal';

const StudentManagement = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { success, error } = useNotification();
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
    const [progressLoading, setProgressLoading] = useState(false);
    const [progressError, setProgressError] = useState(null);
    const [moduleProgress, setModuleProgress] = useState([]);
    const [authorizing, setAuthorizing] = useState(false);
    const [authorizeMsg, setAuthorizeMsg] = useState('');
    const [availableModules, setAvailableModules] = useState([]);
    const [selectedModule, setSelectedModule] = useState(null);
    const [levelProgress, setLevelProgress] = useState([]);
    const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
    const [modalSelectedModule, setModalSelectedModule] = useState(null);
    const [levelTestModal, setLevelTestModal] = useState({ open: false, module: null, level: null });
    const [levelTests, setLevelTests] = useState({ loading: false, practice: [], online: [] });
    const [unlockMsg, setUnlockMsg] = useState('');
    const [onlineExamResults, setOnlineExamResults] = useState([]);
    const [practiceResults, setPracticeResults] = useState([]);
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [selectedLevelResults, setSelectedLevelResults] = useState([]);
    const [levelResultsLoading, setLevelResultsLoading] = useState(false);
    const [showLevelResultsPanel, setShowLevelResultsPanel] = useState(false);
    const [selectedLevelPracticeResults, setSelectedLevelPracticeResults] = useState([]);
    const [batches, setBatches] = useState([]);
    const [courses, setCourses] = useState([]);
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [selectedCourse, setSelectedCourse] = useState(null);

    const fetchStudents = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/user-management/students');
            setStudents(res.data.data);
        } catch (err) {
            error('Failed to fetch students.');
        } finally {
            setLoading(false);
        }
    }, [error]);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);
    
    const handleDeleteStudent = async (studentId) => {
        if (window.confirm('Are you sure you want to delete this student? This action is permanent.')) {
            try {
                await api.delete(`/user-management/${studentId}`);
                success('Student deleted successfully.');
                fetchStudents(); // Refresh the list
            } catch (err) {
                error(err.response?.data?.message || 'Failed to delete student.');
            }
        }
    };

    const filteredStudents = useMemo(() => {
        return students.filter(student =>
            (student.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (student.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (student.campus_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (student.course_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (student.batch_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (student.roll_number?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        );
    }, [students, searchTerm]);

    const handleStudentClick = async (student) => {
        setSelectedStudent(student);
        setIsProgressModalOpen(true);
        setProgressLoading(true);
        setProgressError(null);
        setModuleProgress([]);
        setAvailableModules([]);
        setAuthorizeMsg('');
        try {
            // 1. Fetch available modules (superadmin endpoint)
            const modulesRes = await api.get(`/superadmin/student-modules?student_email=${encodeURIComponent(student.email)}`);
            setAvailableModules(modulesRes.data.data || []);
            // 2. Fetch practice (module-level) results
            const practiceRes = await api.get(`/superadmin/student-practice-results?student=${encodeURIComponent(student.email)}`);
            setPracticeResults(practiceRes.data.data || []);
            // 3. Fetch online exam results
            const onlineRes = await api.get(`/superadmin/student-online-results?student=${encodeURIComponent(student.email)}`);
            setOnlineExamResults(onlineRes.data.data || []);
        } catch (e) {
            setProgressError('Failed to load module/online exam results.');
        } finally {
            setProgressLoading(false);
        }
    };

    const handleAuthorizeNext = async (moduleId, nextLevel) => {
        if (!selectedStudent) return;
        setAuthorizing(true);
        setAuthorizeMsg('');
        try {
            const res = await api.post(`/batch-management/student/${selectedStudent._id}/authorize-level`, { level: nextLevel });
            setAuthorizeMsg(res.data.message || 'Authorized!');
        } catch (e) {
            setAuthorizeMsg('Failed to authorize next level.');
        } finally {
            setAuthorizing(false);
        }
    };

    const handleModuleCardClick = async (student, module) => {
        setSelectedStudent(student);
        setSelectedModule(module);
        setIsLevelModalOpen(true);
        setLevelProgress([]);
        try {
            // Fetch level progress for this student/module
            const res = await api.get(`/superadmin/student-practice-results?student=${encodeURIComponent(student.email)}&module=${module.id}`);
            setLevelProgress(res.data.data || []);
        } catch (e) {
            setLevelProgress([]);
        }
    };

    const handleLevelClick = async (mod, lvl) => {
        setLevelTestModal({ open: true, module: mod, level: lvl });
        setLevelTests({ loading: true, practice: [], online: [] });
        try {
            const res = await api.get('/test-management/tests');
            const allTests = res.data.data || [];
            // Filter by module and level
            const practice = allTests.filter(t => t.module_name === mod.module_name && t.level_name === lvl.level_name && t.test_type === 'practice');
            const online = allTests.filter(t => t.module_name === mod.module_name && t.level_name === lvl.level_name && t.test_type === 'online_exam');
            setLevelTests({ loading: false, practice, online });
        } catch (e) {
            setLevelTests({ loading: false, practice: [], online: [] });
        }
    };

    const handleModuleLockToggle = async (studentId, moduleId, locked) => {
        // Call backend to lock/unlock module (implement endpoint as needed)
        // For now, just show a toast
        setUnlockMsg(locked ? 'Module locked!' : 'Module unlocked!');
        setTimeout(() => setUnlockMsg(''), 2000);
        // Optionally, refresh students
        fetchStudents();
    };

    const handleLevelLockToggle = async (studentId, levelId, locked) => {
        // Call backend to lock/unlock level (implement endpoint as needed)
        setUnlockMsg(locked ? 'Level locked!' : 'Level unlocked!');
        setTimeout(() => setUnlockMsg(''), 2000);
        fetchStudents();
    };

    useEffect(() => {
        // Fetch batches and courses for selection
        const fetchBatchCourse = async () => {
            try {
                const batchRes = await api.get('/batch-management/batches');
                setBatches(batchRes.data.data || []);
                const courseRes = await api.get('/course-management/courses');
                setCourses(courseRes.data.data || []);
            } catch (err) {
                // handle error
            }
        };
        fetchBatchCourse();
    }, []);

    // Filter courses for selected batch if needed
    const filteredCourses = selectedBatch ? courses.filter(c => c.batch_ids?.includes(selectedBatch.id)) : courses;

    // In student assignment logic (e.g. handleAssignStudent or handleCreateStudent):
    const handleAssignStudent = async (studentId) => {
        if (!selectedBatch || !selectedCourse) {
            // show error
            return;
        }
        // Get or create batch_course_instance_id from backend
        const res = await api.post('/superadmin/batch-course-instance', {
            batch_id: selectedBatch.id,
            course_id: selectedCourse.id
        });
        const batchCourseInstanceId = res.data.instance_id;
        // Assign student to this instance
        await api.post('/students/assign', {
            student_id: studentId,
            batch_course_instance_id: batchCourseInstanceId
        });
        // refresh students or show success
    };

    return (
        <div className="min-h-screen bg-background flex">
            <SuperAdminSidebar />
            <div className="flex-1 lg:pl-64">
                <Header />
                <main className="px-6 lg:px-10 py-12">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-4xl font-extrabold text-headline tracking-tight">Student Management</h1>
                                <p className="mt-2 text-lg text-paragraph">View and manage student information across the system.</p>
                            </div>
                        </div>

                        <div className="mb-6 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-tertiary" />
                            <input
                                type="text"
                                placeholder="Search by name, email, campus, course, batch, or roll number..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 border border-stroke rounded-lg shadow-sm focus:ring-1 focus:ring-highlight"
                            />
                        </div>

                        <div className="bg-secondary rounded-2xl shadow-lg">
                            <div className="overflow-x-auto">
                                {loading ? <LoadingSpinner /> : (
                                    <table className="min-w-full divide-y divide-stroke">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campus</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course & Batch</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modules</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-stroke">
                                            {filteredStudents.map(student => (
                                                <tr key={student._id} className="hover:bg-blue-50 cursor-pointer" onClick={() => setSelectedStudent(student)}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                                        <div className="text-sm text-gray-500">{student.email}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{student.campus_name || 'N/A'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">{student.course_name || 'N/A'}</div>
                                                        <div className="text-sm text-gray-500">{student.batch_name || 'N/A'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.username}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {/* Optionally, show a summary like '6 modules' or leave blank */}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button onClick={() => handleDeleteStudent(student._id)} className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </main>
            </div>
            {/* Student Info & Access Control Modal */}
            {selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-3xl w-full relative">
                        <button onClick={() => { setSelectedStudent(null); setModalSelectedModule(null); }} className="absolute top-4 right-4 text-gray-400 hover:text-red-600 text-3xl font-bold">&times;</button>
                        <h2 className="text-3xl font-extrabold mb-8 text-center text-blue-900">Student Details: <span className="text-blue-700">{selectedStudent.name}</span></h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            {/* Section 1: Modules as cards */}
                            <div>
                                <h3 className="text-xl font-bold mb-6 text-blue-800">Modules</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {selectedStudent.modules && selectedStudent.modules.length > 0 ? (
                                        selectedStudent.modules.map((mod) => (
                                            <div
                                                key={mod.module_id}
                                                className={`cursor-pointer bg-blue-50 border-2 ${modalSelectedModule && modalSelectedModule.module_id === mod.module_id ? 'border-blue-500 shadow-lg' : 'border-blue-100'} rounded-2xl px-8 py-8 transition text-center flex flex-col items-center hover:border-blue-400 hover:shadow-md`}
                                                onClick={() => setModalSelectedModule(mod)}
                                            >
                                                <div className="font-extrabold text-blue-900 text-lg mb-2 tracking-wide">{mod.module_name}</div>
                                                <div className="text-xs text-blue-400 font-semibold">{mod.levels.length} Level{mod.levels.length !== 1 ? 's' : ''}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-gray-400 col-span-2">No modules found for this student.</div>
                                    )}
                                </div>
                            </div>
                            {/* Section 2: Access Control */}
                            <div className="flex flex-col h-full">
                                <div className="border-b-2 border-blue-100 mb-6"></div>
                                <h3 className="text-xl font-bold mb-6 text-blue-800">Access Control</h3>
                                {modalSelectedModule && (
                                    <>
                                        <div className="mt-10 mb-0">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
                                                {modalSelectedModule.levels && modalSelectedModule.levels.length > 0 ? (
                                                    modalSelectedModule.levels.map((lvl, idx) => (
                                                        <div
                                                            key={lvl.level_id}
                                                            className={`rounded-3xl p-6 shadow-lg flex flex-col justify-between min-h-[140px] border transition ${lvl.locked ? 'bg-gray-50 border-gray-200 opacity-70' : 'bg-white border-blue-200'} ${!lvl.locked ? 'hover:shadow-2xl' : ''}`}
                                                            onClick={async () => {
                                                                setSelectedLevel(lvl);
                                                                setShowLevelResultsPanel(true);
                                                                setLevelResultsLoading(true);
                                                                try {
                                                                    // Fetch online exam results for this level from the new endpoint
                                                                    const onlineRes = await api.get(`/superadmin/student-online-results?student=${encodeURIComponent(selectedStudent.email)}&module=${modalSelectedModule.module_id}&level=${lvl.level_id}`);
                                                                    setSelectedLevelResults(onlineRes.data.data || []);
                                                                    // Fetch practice results for this level from the new endpoint
                                                                    const practiceRes = await api.get(`/superadmin/student-practice-results?student=${encodeURIComponent(selectedStudent.email)}&module=${modalSelectedModule.module_id}&level=${lvl.level_id}`);
                                                                    setSelectedLevelPracticeResults(practiceRes.data.data || []);
                                                                } catch (e) {
                                                                    setSelectedLevelResults([]);
                                                                    setSelectedLevelPracticeResults([]);
                                                                } finally {
                                                                    setLevelResultsLoading(false);
                                                                }
                                                            }}
                                                            style={{ cursor: lvl.locked ? 'not-allowed' : 'pointer' }}
                                                        >
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <span className={`font-bold text-lg ${lvl.locked ? 'text-gray-400' : 'text-blue-900'}`}>{lvl.level_name}</span>
                                                                {lvl.locked ? <Lock size={20} className="text-gray-400" /> : <Unlock size={20} className="text-green-500" />}
                                                            </div>
                                                            <div className="flex-1 flex flex-col justify-center">
                                                                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                                                                    <div
                                                                        className={`h-2 rounded-full ${lvl.locked ? 'bg-gray-300' : 'bg-green-400'}`}
                                                                        style={{ width: `${lvl.percentage}%` }}
                                                                    ></div>
                                                                </div>
                                                                <div className={`text-xs font-semibold ${lvl.locked ? 'text-gray-400' : 'text-green-700'}`}>Highest Score: {lvl.percentage}%</div>
                                                                {lvl.locked && (
                                                                    <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 rounded px-2 py-1">
                                                                        Complete the previous part with 60% or more to unlock.
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="mt-4 flex justify-end">
                                                                <button
                                                                    className={`px-5 py-2 rounded-full text-xs font-bold shadow ${lvl.locked ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        handleLevelLockToggle(selectedStudent._id, lvl.level_id, lvl.locked);
                                                                    }}
                                                                >
                                                                    {lvl.locked ? 'Unlock' : 'Lock'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-gray-400 col-span-2">No levels for this module.</div>
                                                )}
                                            </div>
                                        </div>
                                        {/* Centered modal popup for level results */}
                                        {showLevelResultsPanel && (
                                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                                                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full relative animate-fade-in">
                                                    <button
                                                        className="absolute top-4 right-4 text-gray-400 hover:text-red-600 text-3xl font-bold"
                                                        onClick={() => setShowLevelResultsPanel(false)}
                                                    >
                                                        &times;
                                                    </button>
                                                    <h4 className="text-2xl font-bold mb-4 text-blue-800 text-center">Results for {selectedLevel?.level_name}</h4>
                                                    {levelResultsLoading ? (
                                                        <div className="flex justify-center items-center h-32"><LoadingSpinner /></div>
                                                    ) : (
                                                        <>
                                                            {/* Practice Module Results */}
                                                            <div className="mb-6">
                                                                <h5 className="text-lg font-bold mb-2 text-green-800">Practice Module Results</h5>
                                                                {selectedLevelPracticeResults.length === 0 ? (
                                                                    <div className="bg-green-50 rounded-2xl p-4 shadow-inner text-center text-gray-500">
                                                                        No practice module results for this level.
                                                                    </div>
                                                                ) : (
                                                                    <div className="space-y-3">
                                                                        {selectedLevelPracticeResults.map((res, idx) => (
                                                                            <div key={res._id || idx} className="rounded-xl border-2 border-green-400 bg-green-50 p-3 shadow flex flex-col gap-1">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="font-bold text-green-900">{res.test_name}</span>
                                                                                    <span className="ml-auto px-2 py-0.5 rounded bg-green-200 text-xs font-semibold">Practice</span>
                                                                                </div>
                                                                                <div className="text-xs text-gray-700">Score: <span className="font-bold text-green-700">{res.average_score}%</span></div>
                                                                                <div className="text-xs text-gray-500">Submitted: {res.submitted_at ? new Date(res.submitted_at).toLocaleString() : 'N/A'}</div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {/* Online Exam Results */}
                                                            <div>
                                                                <h5 className="text-lg font-bold mb-2 text-blue-800">Online Exam Results</h5>
                                                                {selectedLevelResults.length === 0 ? (
                                                                    <div className="bg-blue-50 rounded-2xl p-4 shadow-inner text-center text-gray-500">
                                                                        No online exam results for this level.
                                                                    </div>
                                                                ) : (
                                                                    <div className="space-y-3">
                                                                        {selectedLevelResults.map((res, idx) => (
                                                                            <div key={res._id || idx} className="rounded-xl border-2 border-blue-400 bg-blue-50 p-3 shadow flex flex-col gap-1">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="font-bold text-blue-900">{res.test_name}</span>
                                                                                    <span className="ml-auto px-2 py-0.5 rounded bg-blue-200 text-xs font-semibold">Online Exam</span>
                                                                                </div>
                                                                                <div className="text-xs text-gray-700">Score: <span className="font-bold text-blue-700">{res.average_score}%</span></div>
                                                                                <div className="text-xs text-gray-500">Submitted: {res.submitted_at ? new Date(res.submitted_at).toLocaleString() : 'N/A'}</div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Level Tests Modal */}
            {levelTestModal.open && (
                <Modal title={`Tests for ${levelTestModal.level.level_name} in ${levelTestModal.module.module_name}`} onClose={() => setLevelTestModal({ open: false, module: null, level: null })}>
                    {levelTests.loading ? (
                        <div className="flex justify-center items-center h-32"><LoadingSpinner /></div>
                    ) : (
                        <div className="space-y-6">
                            <div>
                                <h4 className="font-bold text-blue-700 mb-2">Practice Tests</h4>
                                {levelTests.practice.length === 0 ? (
                                    <div className="text-gray-400">No practice tests found.</div>
                                ) : (
                                    <ul className="space-y-2">
                                        {levelTests.practice.map(test => (
                                            <li key={test._id} className="bg-blue-50 rounded px-4 py-2 flex flex-col">
                                                <span className="font-semibold text-blue-900">{test.name}</span>
                                                <span className="text-xs text-blue-600">Questions: {test.question_count}</span>
                                                <span className="text-xs text-gray-500">Created: {test.created_at}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div>
                                <h4 className="font-bold text-blue-700 mb-2">Online Tests</h4>
                                {levelTests.online.length === 0 ? (
                                    <div className="text-gray-400">No online tests found.</div>
                                ) : (
                                    <ul className="space-y-2">
                                        {levelTests.online.map(test => (
                                            <li key={test._id} className="bg-green-50 rounded px-4 py-2 flex flex-col">
                                                <span className="font-semibold text-green-900">{test.name}</span>
                                                <span className="text-xs text-green-600">Questions: {test.question_count}</span>
                                                <span className="text-xs text-gray-500">Created: {test.created_at}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </Modal>
            )}
            {/* Unlock message toast */}
            {unlockMsg && (
                <div className="fixed top-8 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg z-50 text-lg font-semibold animate-fade-in">{unlockMsg}</div>
            )}
        </div>
    );
};

export default StudentManagement; 