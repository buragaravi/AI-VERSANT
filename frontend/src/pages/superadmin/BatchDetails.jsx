import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useNotification } from '../../contexts/NotificationContext';
import Header from '../../components/common/Header';
import SuperAdminSidebar from '../../components/common/SuperAdminSidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import UploadPreviewModal from '../../components/common/UploadPreviewModal';
import CredentialsDisplayModal from '../../components/common/CredentialsDisplayModal';
import api from '../../services/api';
import { Users, ArrowLeft, Upload } from 'lucide-react';

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
        const headers = ['Campus Name', 'Course Name', 'Student Name', 'Roll Number', 'Email', 'Mobile Number'];
        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\r\n"
            + `${batchInfo?.campus_name},${batchInfo?.course_name},John Doe,ROLL001,john.doe@example.com,1234567890`;

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `student_upload_template_${batchInfo?.name}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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
                                <div>
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
                                <div className="w-full max-w-4xl">
                                    <div className="p-6 flex justify-between items-center">
                                        <h3 className="text-xl font-semibold flex items-center gap-2">
                                            <Users />
                                            Students in this Batch ({students.length})
                                        </h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200 rounded-xl overflow-hidden">
                                            <thead className="bg-gradient-to-r from-indigo-500 to-blue-500">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Student Name</th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Roll Number</th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Email</th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Campus</th>
                                                    <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Course</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {students.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="5" className="px-6 py-8 text-center text-gray-400 text-lg font-medium bg-gray-50">No students found in this batch.</td>
                                                    </tr>
                                                ) : (
                                                    students.map((student, idx) => (
                                                        <tr key={student.id} className={
                                                            `transition-colors ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-blue-50`
                                                        }>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">{student.name}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{student.roll_number}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-700">{student.email}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{student.campus_name}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{student.course_name}</td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </main>
                </div>
            </div>
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
        </>
    );
};

export default BatchDetails; 