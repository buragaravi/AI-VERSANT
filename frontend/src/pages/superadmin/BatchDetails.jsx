import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '../../contexts/NotificationContext';
import Header from '../../components/common/Header';
import SuperAdminSidebar from '../../components/common/SuperAdminSidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import UploadPreviewModal from '../../components/common/UploadPreviewModal';
import CredentialsDisplayModal from '../../components/common/CredentialsDisplayModal';
import api from '../../services/api';
import { Users, ArrowLeft, Upload, Edit, Trash2, Download, X, Save, User, Mail, Key, Building, Book, ListChecks, BarChart2, CheckCircle, XCircle } from 'lucide-react';

const BatchDetails = () => {
    const { batchId } = useParams();
    const [batchInfo, setBatchInfo] = useState(null);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const { success, error } = useNotification();

    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [previewData, setPreviewData] = useState([]);
    const [originalFile, setOriginalFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createdStudents, setCreatedStudents] = useState([]);
    const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
    
    // CRUD states
    const [editingStudent, setEditingStudent] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editFormData, setEditFormData] = useState({});

    // New state for modals
    const [isModulesModalOpen, setIsModulesModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isStudentModulesModalOpen, setIsStudentModulesModalOpen] = useState(false);
    const [studentModulesData, setStudentModulesData] = useState([]);
    const [studentModulesLoading, setStudentModulesLoading] = useState(false);
    const [studentModulesError, setStudentModulesError] = useState(null);
    const [selectedModule, setSelectedModule] = useState(null);
    const [isModuleResultsModalOpen, setIsModuleResultsModalOpen] = useState(false);

    const fetchBatchDetails = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get(`/batch-management/batch/${batchId}/students`);
            setBatchInfo(res.data.batch_info);
            setStudents(res.data.data);
        } catch (err) {
            error('Failed to fetch batch details.');
        } finally {
            setLoading(false);
        }
    }, [batchId, error]);

    useEffect(() => {
        fetchBatchDetails();
    }, [fetchBatchDetails]);

    const handleFileDrop = async (acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file) return;
        
        setOriginalFile(file);
        const formData = new FormData();
        formData.append('file', file);
        if (batchInfo?.campus_id) { // This might need adjustment if batch has multiple campuses
            formData.append('campus_id', batchInfo.campus_id);
        }

        try {
            const res = await api.post('/batch-management/validate-student-upload', formData);
            if(res.data.success){
                setPreviewData(res.data.data);
                setIsUploadModalOpen(true);
            } else {
                error(res.data.message || 'File validation failed.');
            }
        } catch (err) {
            error(err.response?.data?.message || 'An error occurred during file validation.');
        }
    };

    const handleConfirmUpload = async () => {
        const validStudents = previewData.filter(student => student.errors.length === 0);
        if (validStudents.length === 0) {
            error("No valid students to upload.");
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await api.post(`/batch-management/${batchId}/add-students`, {
                students: validStudents,
            });

            if (response.data.success || response.status === 207) {
                success(response.data.message || "Students added successfully.");
                setCreatedStudents(response.data.data.created_students);
                setIsCredentialsModalOpen(true);
                setIsUploadModalOpen(false);
                fetchBatchDetails(); // Refresh student list
            } else {
                error(response.data.message || 'Failed to add students.');
            }
        } catch (err) {
            error(err.response?.data?.message || 'An error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDownloadTemplate = () => {
        // Get campus and course information for the template
        const campusName = batchInfo?.campus_name || 'Campus Name';
        const courseName = batchInfo?.course_name || 'Course Name';
        
        const headers = ['Campus Name', 'Course Name', 'Student Name', 'Roll Number', 'Email', 'Mobile Number'];
        const exampleRow = [campusName, courseName, 'John Doe', 'ROLL001', 'john.doe@example.com', '1234567890'];
        
        let csvRows = [headers, exampleRow];
        let csvString = csvRows.map(row => row.map(val => `"${val}"`).join(',')).join('\r\n');
        
        const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvString);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `student_upload_template_${batchInfo?.name || 'batch'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        success('Template downloaded successfully!');
    };

    // CRUD Operations
    const handleEditStudent = (student) => {
        setEditingStudent(student);
        setEditFormData({
            name: student.name,
            roll_number: student.roll_number,
            email: student.email,
            mobile_number: student.mobile_number || ''
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateStudent = async () => {
        try {
            await api.put(`/batch-management/student/${editingStudent.id}`, editFormData);
            success('Student updated successfully!');
            setIsEditModalOpen(false);
            setEditingStudent(null);
            fetchBatchDetails();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to update student.');
        }
    };

    const handleDeleteStudent = async (studentId) => {
        if (window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
            try {
                await api.delete(`/batch-management/student/${studentId}`);
                success('Student deleted successfully!');
                fetchBatchDetails();
            } catch (err) {
                error(err.response?.data?.message || 'Failed to delete student.');
            }
        }
    };

    // Fetch per-student modules when modal opens (use new endpoint)
    useEffect(() => {
        if (isStudentModulesModalOpen && selectedStudent) {
            setStudentModulesLoading(true);
            setStudentModulesError(null);
            api.get(`/superadmin/student-assigned-modules?student=${encodeURIComponent(selectedStudent.email)}&batch=${batchId}`)
                .then(res => {
                    setStudentModulesData(res.data.data || []);
                })
                .catch(() => setStudentModulesError('Failed to load module analytics.'))
                .finally(() => setStudentModulesLoading(false));
        }
    }, [isStudentModulesModalOpen, selectedStudent, batchId]);

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><LoadingSpinner /></div>;
    }

    return (
        <>
            <div className="min-h-screen bg-gray-50 flex">
                <SuperAdminSidebar />
                <div className="flex-1 lg:pl-64">
                    <Header />
                    <main className="px-6 lg:px-10 py-12">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <Link to="/superadmin/batches" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-2">
                                        <ArrowLeft size={16} />
                                        Back to Batches
                                    </Link>
                                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">{batchInfo?.name}</h1>
                                    <p className="mt-1 text-lg text-gray-600">
                                        {batchInfo?.campus_name} &bull; {batchInfo?.course_name}
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setIsModulesModalOpen(true)}
                                        className="inline-flex items-center justify-center px-4 py-2 border border-blue-300 text-sm font-medium rounded-md shadow-sm text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        <BarChart2 className="mr-2 h-5 w-5" />
                                        Assigned Modules
                                    </button>
                                    <button
                                        onClick={handleDownloadTemplate}
                                        className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        <Download className="mr-2 h-5 w-5" />
                                        Download Template
                                    </button>
                                    <button
                                        onClick={() => document.getElementById('student-upload-input').click()}
                                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        <Upload className="mr-2 h-5 w-5" />
                                        Add Students
                                    </button>
                                    <input
                                        type="file"
                                        id="student-upload-input"
                                        className="hidden"
                                        onChange={(e) => handleFileDrop(e.target.files)}
                                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                    />
                                </div>
                            </div>

                            <div className="bg-white rounded-2xl shadow-lg flex justify-center">
                                <div className="w-full max-w-6xl">
                                    <div className="p-6 flex justify-between items-center">
                                        <h3 className="text-xl font-semibold flex items-center gap-2">
                                            <Users />
                                            Students in this Batch ({students.length})
                                        </h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 rounded-xl overflow-hidden mt-6">
                                            <thead className="bg-gradient-to-r from-blue-700 to-black">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Student Name</th>
                                                    <th className="px-4 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Roll Number</th>
                                                    <th className="px-4 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Email</th>
                                                    <th className="px-4 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Mobile</th>
                                                    <th className="px-4 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Campus</th>
                                                    <th className="px-4 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Course</th>
                                                    <th className="px-4 py-2 text-center text-xs font-bold text-white uppercase tracking-wider">Actions</th>
                                                    <th className="px-4 py-2 text-center text-xs font-bold text-white uppercase tracking-wider">Modules</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {students.length === 0 ? (
                                                    <tr><td colSpan="8" className="text-center text-gray-500 py-8">No students found.</td></tr>
                                                ) : students.map((student, idx) => (
                                                    <tr key={student.id} className={idx % 2 === 0 ? 'bg-blue-50' : 'bg-white'}>
                                                        <td className="px-4 py-2 text-sm font-bold text-blue-900">{student.name}</td>
                                                        <td className="px-4 py-2 text-sm text-black">{student.roll_number}</td>
                                                        <td className="px-4 py-2 text-sm text-blue-700">{student.email}</td>
                                                        <td className="px-4 py-2 text-sm text-blue-600">{student.mobile_number}</td>
                                                        <td className="px-4 py-2 text-sm text-black">{student.campus_name}</td>
                                                        <td className="px-4 py-2 text-sm text-black">{student.course_name}</td>
                                                        <td className="px-4 py-2 text-center">
                                                            <button onClick={() => handleEditStudent(student)} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 mr-2"><Edit size={14}/> Edit</button>
                                                            <button onClick={() => handleDeleteStudent(student.id)} className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"><Trash2 size={14}/> Delete</button>
                                                        </td>
                                                        <td className="px-4 py-2 text-center">
                                                            <button onClick={() => { setSelectedStudent(student); setIsStudentModulesModalOpen(true); }} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-700 text-white rounded hover:bg-blue-900"><ListChecks size={14}/> View Modules</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </main>
                </div>
            </div>
            
            {/* Edit Student Modal */}
            <AnimatePresence>
                {isEditModalOpen && (
                    <motion.div 
                        className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div 
                            initial={{ y: -50, opacity: 0 }} 
                            animate={{ y: 0, opacity: 1 }} 
                            exit={{ y: 50, opacity: 0 }} 
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200"
                        >
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-2xl font-bold text-gray-800">Edit Student</h2>
                                    <button onClick={() => setIsEditModalOpen(false)} className="p-2 rounded-full hover:bg-gray-100">
                                        <X className="text-gray-600"/>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
                                    <input
                                        type="text"
                                        value={editFormData.name}
                                        onChange={(e) => setEditFormData(prev => ({...prev, name: e.target.value}))}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Student Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
                                    <input
                                        type="text"
                                        value={editFormData.roll_number}
                                        onChange={(e) => setEditFormData(prev => ({...prev, roll_number: e.target.value}))}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Roll Number"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={editFormData.email}
                                        onChange={(e) => setEditFormData(prev => ({...prev, email: e.target.value}))}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Email"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                                    <input
                                        type="text"
                                        value={editFormData.mobile_number}
                                        onChange={(e) => setEditFormData(prev => ({...prev, mobile_number: e.target.value}))}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Mobile Number"
                                    />
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                                <button 
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleUpdateStudent}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                                >
                                    <Save size={16} />
                                    Save Changes
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {isUploadModalOpen && (
                <UploadPreviewModal
                    isOpen={isUploadModalOpen}
                    onClose={() => setIsUploadModalOpen(false)}
                    previewData={previewData}
                    onConfirm={handleConfirmUpload}
                    isSubmitting={isSubmitting}
                    fileName={originalFile?.name}
                    onDownloadTemplate={handleDownloadTemplate}
                />
            )}
            {isCredentialsModalOpen && (
                <CredentialsDisplayModal
                    isOpen={isCredentialsModalOpen}
                    onClose={() => setIsCredentialsModalOpen(false)}
                    credentials={createdStudents}
                    entityName="Students"
                />
            )}
            {/* Assigned Modules Modal (stub) */}
            <AnimatePresence>
                {isModulesModalOpen && (
                    <motion.div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-blue-200">
                            <div className="p-6 border-b flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-blue-900">Assigned Modules (Coming Soon)</h2>
                                <button onClick={() => setIsModulesModalOpen(false)} className="p-2 rounded-full hover:bg-gray-100"><X className="text-gray-600"/></button>
                            </div>
                            <div className="p-6">
                                <p className="text-gray-600">This will show all assigned modules for students in this batch, with filters and analytics.</p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Per-Student Modules Modal (analytics) */}
            <AnimatePresence>
                {isStudentModulesModalOpen && selectedStudent && (
                    <motion.div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-blue-200">
                            <div className="p-6 border-b flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-blue-900 flex items-center gap-2"><ListChecks className="text-blue-600"/> {selectedStudent.name}'s Modules</h2>
                                <button onClick={() => setIsStudentModulesModalOpen(false)} className="p-2 rounded-full hover:bg-gray-100"><X className="text-gray-600"/></button>
                            </div>
                            <div className="p-6 min-h-[200px]">
                                {studentModulesLoading ? (
                                    <div className="flex justify-center items-center h-32"><LoadingSpinner /></div>
                                ) : studentModulesError ? (
                                    <div className="text-red-600 text-center">{studentModulesError}</div>
                                ) : (
                                    <table className="min-w-full divide-y divide-gray-200 rounded-xl overflow-hidden">
                                        <thead className="bg-gradient-to-r from-blue-700 to-black">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Module</th>
                                                <th className="px-4 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Attempts</th>
                                                <th className="px-4 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Best %</th>
                                                <th className="px-4 py-2 text-left text-xs font-bold text-white uppercase tracking-wider">Avg %</th>
                                                <th className="px-4 py-2 text-center text-xs font-bold text-white uppercase tracking-wider">Status</th>
                                                <th className="px-4 py-2 text-center text-xs font-bold text-white uppercase tracking-wider">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {studentModulesData.length === 0 ? (
                                                <tr><td colSpan="6" className="text-center text-gray-500 py-8">No modules assigned.</td></tr>
                                            ) : studentModulesData.map((row, idx) => (
                                                <tr key={row.test_id} className={idx % 2 === 0 ? 'bg-blue-50' : 'bg-white'}>
                                                    <td className="px-4 py-2 text-sm font-bold text-blue-900">{row.module_display_name} - {row.test_name}</td>
                                                    <td className="px-4 py-2 text-sm text-black">{row.total_attempts > 0 ? row.total_attempts : '-'}</td>
                                                    <td className="px-4 py-2 text-sm font-bold text-blue-700">{row.total_attempts > 0 ? row.best_score.toFixed(1) : '-'}</td>
                                                    <td className="px-4 py-2 text-sm text-blue-600">{row.total_attempts > 0 ? row.avg_score.toFixed(1) : '-'}</td>
                                                    <td className="px-4 py-2 text-center">
                                                        {row.status === 'completed' ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded-full text-xs font-semibold"><CheckCircle size={14}/> Completed</span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-semibold"><XCircle size={14}/> Pending</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2 text-center">
                                                        {row.status === 'completed' ? (
                                                            <button onClick={() => { setSelectedModule(row); setIsModuleResultsModalOpen(true); }} className="px-3 py-1.5 bg-blue-700 text-white rounded-lg hover:bg-blue-900 text-xs font-semibold">View Results</button>
                                                        ) : (
                                                            <span className="text-xs text-gray-500">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Module Results Modal (detailed) */}
            <AnimatePresence>
                {isModuleResultsModalOpen && selectedModule && (
                    <motion.div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-blue-200">
                            <div className="p-6 border-b flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-blue-900 flex items-center gap-2"><BarChart2 className="text-blue-600"/> {selectedModule.module_display_name} Results</h2>
                                <button onClick={() => setIsModuleResultsModalOpen(false)} className="p-2 rounded-full hover:bg-gray-100"><X className="text-gray-600"/></button>
                            </div>
                            <div className="p-6 min-h-[200px]">
                                {selectedModule && selectedModule.attempts && selectedModule.attempts.length > 0 ? (
                                    selectedModule.attempts.map((attempt, idx) => (
                                        <tr key={idx} className={idx % 2 === 0 ? 'bg-blue-50' : 'bg-white'}>
                                            <td className="px-4 py-2 text-sm font-bold text-blue-900">Attempt {idx + 1}</td>
                                            <td className="px-4 py-2 text-sm text-black">{attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : '-'}</td>
                                            <td className="px-4 py-2 text-sm font-bold text-blue-700">{attempt.score?.toFixed(1) ?? '-'}</td>
                                            <td className="px-4 py-2 text-sm text-blue-600">{attempt.correct_answers ?? '-'} / {attempt.total_questions ?? '-'}</td>
                                            <td className="px-4 py-2 text-center">
                                                {attempt.score >= 60 ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded-full text-xs font-semibold"><CheckCircle size={14}/> Passed</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-semibold"><XCircle size={14}/> Incomplete</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="5" className="text-center text-gray-500 py-8">No attempts found for this test.</td></tr>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default BatchDetails; 