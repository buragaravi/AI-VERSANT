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

                            <div className="bg-white rounded-2xl shadow-lg">
                                <div className="p-6 flex justify-between items-center">
                                    <h3 className="text-xl font-semibold flex items-center gap-2">
                                        <Users />
                                        Students in this Batch ({students.length})
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll Number</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {students.map(student => (
                                                <tr key={student.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.roll_number}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.email}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
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