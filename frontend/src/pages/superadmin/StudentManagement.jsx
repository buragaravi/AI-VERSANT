import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNotification } from '../../contexts/NotificationContext';
import Header from '../../components/common/Header';
import SuperAdminSidebar from '../../components/common/SuperAdminSidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../services/api';
import { Users, Filter, Search, Trash2, ListChecks, CheckCircle, BookOpen, Lock, Unlock } from 'lucide-react';
import Modal from '../../components/common/Modal';
import { getStudentAccessStatus, authorizeStudentModule, lockStudentModule, authorizeStudentLevel } from '../../services/api';

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
    const [accessStatus, setAccessStatus] = useState([]);
    const [showLevelsModal, setShowLevelsModal] = useState(false);
    const [levelsModalData, setLevelsModalData] = useState({ module: null, levels: [] });
    const [levelPercentages, setLevelPercentages] = useState({}); // { levelId: { practice: %, online: % } }

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
        setAccessStatus([]);
        try {
            // Fetch access status for modules and levels
            const res = await getStudentAccessStatus(student._id);
            setAccessStatus(res.data.data || []);
        } catch (e) {
            setProgressError('Failed to load access status.');
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

    const handleModuleLockToggle = async (studentId, moduleId, unlocked) => {
        try {
            if (unlocked) {
                await lockStudentModule(studentId, moduleId);
                setUnlockMsg('Module locked!');
            } else {
                await authorizeStudentModule(studentId, moduleId);
                setUnlockMsg('Module unlocked!');
            }
            // Refresh access status for the modal UI
            const res = await getStudentAccessStatus(studentId);
            setAccessStatus(res.data.data || []);
        } catch (e) {
            setUnlockMsg('Failed to update module access.');
        } finally {
            setTimeout(() => setUnlockMsg(''), 2000);
        }
    };

    const handleLevelLockToggle = async (studentId, levelId, unlocked) => {
        try {
            if (unlocked) {
                // Lock: remove from authorized_levels (not implemented, but could be added)
                setUnlockMsg('Level lock not implemented!');
            } else {
                await authorizeStudentLevel(studentId, levelId);
                setUnlockMsg('Level unlocked!');
            }
            // Refresh access status
            const res = await getStudentAccessStatus(studentId);
            setAccessStatus(res.data.data || []);
        } catch (e) {
            setUnlockMsg('Failed to update level access.');
        } finally {
        setTimeout(() => setUnlockMsg(''), 2000);
        }
    };

    // Helper to fetch percentages for all levels in a module
    const fetchLevelPercentages = async (student, module) => {
        const percentages = {};
        for (const lvl of module.levels) {
            let practice = 0;
            let online = 0;
            try {
                // Fetch practice results
                const practiceRes = await api.get(`/superadmin/student-practice-results?student=${encodeURIComponent(student.email)}&module=${module.module_id}&level=${lvl.level_id}`);
                if (practiceRes.data.data && practiceRes.data.data.length > 0) {
                    const scores = practiceRes.data.data.map(r => r.average_score || 0);
                    practice = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
                }
                // Fetch online results
                const onlineRes = await api.get(`/superadmin/student-online-results?student=${encodeURIComponent(student.email)}&module=${module.module_id}&level=${lvl.level_id}`);
                if (onlineRes.data.data && onlineRes.data.data.length > 0) {
                    const scores = onlineRes.data.data.map(r => r.average_score || 0);
                    online = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
                }
            } catch {}
            percentages[lvl.level_id] = { practice, online };
        }
        setLevelPercentages(percentages);
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

    // Sort modules: Grammar, Vocabulary first, then others
    const sortedAccessStatus = useMemo(() => {
        if (!accessStatus) return [];
        const priority = ['GRAMMAR', 'VOCABULARY'];
        const priorityModules = accessStatus.filter(m => priority.includes(m.module_id));
        const otherModules = accessStatus.filter(m => !priority.includes(m.module_id));
        return [...priorityModules, ...otherModules];
    }, [accessStatus]);

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
                                                <tr key={student._id} className="hover:bg-blue-50 cursor-pointer" onClick={() => handleStudentClick(student)}>
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
                <Modal isOpen={isProgressModalOpen} onClose={() => { setIsProgressModalOpen(false); setSelectedStudent(null); setSelectedModule(null); setShowLevelsModal(false); setLevelsModalData({ module: null, levels: [] }); }} title={`Student Details: ${selectedStudent.name}`}>
                    <div className="p-6">
                        <h3 className="text-lg font-semibold mb-2">Module Access Control</h3>
                        {progressLoading ? (
                            <LoadingSpinner />
                        ) : progressError ? (
                            <div className="text-red-500">{progressError}</div>
                        ) : (
                            <div>
                                {accessStatus.length === 0 && !progressError && (
                                    <div className="text-gray-500">No modules found for this student.</div>
                                )}
                                {sortedAccessStatus.map((mod) => (
                                    <div key={mod.module_id} className="mb-4 p-4 border rounded-lg bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-blue-100 transition"
                                        onClick={async () => {
                                            setLevelsModalData({ module: mod, levels: mod.levels });
                                            setShowLevelsModal(true);
                                            setLevelPercentages({});
                                            await fetchLevelPercentages(selectedStudent, mod);
                                        }}>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-lg">{mod.module_name}</span>
                                            {mod.unlocked ? <Unlock className="text-green-600" /> : <Lock className="text-gray-400" />}
                                        </div>
                                        <button
                                            className={`ml-2 px-3 py-1 rounded ${mod.unlocked ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}
                                            onClick={e => { e.stopPropagation(); handleModuleLockToggle(selectedStudent._id, mod.module_id, mod.unlocked); }}
                                        >
                                            {mod.unlocked ? 'Lock Module' : 'Unlock Module'}
                                        </button>
                                    </div>
                                ))}
                                {unlockMsg && <div className="mt-2 text-center text-sm text-green-600">{unlockMsg}</div>}
                            </div>
                        )}
                    </div>
                </Modal>
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
            {/* Levels Modal */}
            {showLevelsModal && levelsModalData.module && levelsModalData.module.unlocked && (
                <Modal isOpen={showLevelsModal} onClose={() => { setShowLevelsModal(false); setLevelsModalData({ module: null, levels: [] }); }} title={`${levelsModalData.module.module_name} Levels`}>
                    <div className="p-4">
                        <div className="mb-4 text-lg font-semibold">Levels for {levelsModalData.module.module_name}</div>
                        {levelsModalData.levels.length === 0 ? (
                            <div className="text-gray-500">No levels found for this module.</div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {levelsModalData.levels.map(lvl => (
                                    <div key={lvl.level_id} className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-white rounded shadow border">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">{lvl.level_name}</span>
                                            {lvl.unlocked ? <Unlock className="text-green-600" /> : <Lock className="text-gray-400" />}
                                        </div>
                                        <div className="flex flex-col md:flex-row gap-2 mt-2 md:mt-0">
                                            <span className="text-xs text-blue-700">Practice: <b>{levelPercentages[lvl.level_id]?.practice?.toFixed(1) ?? '--'}%</b></span>
                                            <span className="text-xs text-green-700">Online: <b>{levelPercentages[lvl.level_id]?.online?.toFixed(1) ?? '--'}%</b></span>
                                        </div>
                                        <button
                                            className={`ml-2 px-2 py-1 rounded ${lvl.unlocked ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}
                                            onClick={() => handleLevelLockToggle(selectedStudent._id, lvl.level_id, lvl.unlocked)}
                                            disabled={lvl.unlocked}
                                        >
                                            {lvl.unlocked ? 'Unlocked' : 'Unlock'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
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