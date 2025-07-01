import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '../../contexts/NotificationContext';
import Header from '../../components/common/Header';
import SuperAdminSidebar from '../../components/common/SuperAdminSidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../services/api';
import { Layers, PlusCircle, Search, Trash2, Edit, X, User, Mail, Key, Building, Book, Upload, FileText, ArrowRight, ArrowLeft, Users, FileUp, Download } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useNavigate, Link } from 'react-router-dom';

const BatchCard = ({ batch, onDelete, onEdit }) => (
    <motion.div 
        className="bg-secondary rounded-2xl shadow-lg overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        layout
    >
        <div className="p-6">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-xl font-bold text-black">{batch.name}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {batch.campuses.map(c => <span key={c.id} className="text-xs font-semibold bg-highlight text-black px-2 py-1 rounded-full">{c.name}</span>)}
                        {batch.courses.map(c => <span key={c.id} className="text-xs font-semibold bg-tertiary text-black px-2 py-1 rounded-full">{c.name}</span>)}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => onEdit(batch)} className="p-2 rounded-full text-highlight hover:bg-highlight hover:text-highlight transition-colors">
                        <Edit size={18} />
                    </button>
                    <button onClick={() => onDelete(batch.id)} className="p-2 rounded-full text-highlight hover:bg-highlight hover:text-highlight transition-colors">
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
            <div className="mt-6 flex justify-between items-center">
                <div className="flex items-center gap-2 text-black">
                    <Users size={16} />
                    <span className="text-sm font-medium">{batch.student_count} Students</span>
                </div>
                <Link to={`/superadmin/batches/${batch.id}`} className="text-sm font-semibold text-highlight hover:text-highlight">View Details</Link>
            </div>
        </div>
    </motion.div>
);

const CredentialsDisplayModal = ({ credentials, batchName, onClose }) => {
    
    const handleDownload = () => {
        const headers = ['Student Name', 'Username', 'Password', 'Email'];
        let csvRows = [headers];

        credentials.forEach(cred => {
            csvRows.push([cred.student_name, cred.username, cred.password, cred.email]);
        });

        let csvString = csvRows.map(row => row.map(val => `"${val}"`).join(',')).join('\r\n');
        const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvString);

        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${batchName}_credentials.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
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
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl border border-stroke"
            >
                <div className="p-6 border-b">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-black">Student Credentials for "{batchName}"</h2>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-highlight"><X className="text-black"/></button>
                    </div>
                     <p className="text-sm text-black mt-2 font-semibold">For security reasons, this is the only time you will see these passwords. Please download and store them securely.</p>
                </div>
                
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    <table className="min-w-full divide-y divide-stroke">
                        <thead className="bg-highlight">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Student Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Username</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Password</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-stroke">
                            {credentials.map((cred, index) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-black">{cred.student_name}</div>
                                        <div className="text-sm text-black">{cred.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">{cred.username}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono bg-highlight rounded-md text-black">{cred.password}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 bg-highlight rounded-b-2xl flex justify-end">
                    <button onClick={handleDownload} className="flex items-center gap-2 bg-highlight text-black font-semibold px-4 py-2 rounded-lg shadow-md hover:bg-highlight hover:text-highlight transition">
                        <Download size={18} />
                        Download Credentials
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

const StudentPreviewModal = ({ students, onClose }) => (
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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-stroke text-center"
        >
            <div className="p-8 border-b flex flex-col items-center justify-center gap-2">
                <h2 className="text-2xl font-bold text-black mb-2">File Validated!</h2>
                <div className="text-5xl font-extrabold text-black mb-2">{students.length}</div>
                <div className="text-lg text-black">students ready to be added</div>
            </div>
            <div className="px-8 py-6 bg-highlight rounded-b-2xl flex justify-center">
                <button onClick={onClose} className="bg-highlight text-black font-semibold px-6 py-2 rounded-lg shadow hover:bg-highlight hover:text-highlight transition">Close</button>
            </div>
        </motion.div>
    </motion.div>
);

const BatchManagement = () => {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editBatchData, setEditBatchData] = useState(null);
    
    const { success, error } = useNotification();
    const navigate = useNavigate();

    const fetchBatches = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/batch-management/');
            const batchesWithCounts = await Promise.all(res.data.data.map(async b => {
                 try {
                     const studentsRes = await api.get(`/batch-management/batch/${b.id}/students`);
                     b.student_count = studentsRes.data.data.length;
                 } catch {
                     b.student_count = 0;
                 }
                 return b;
            }));
            setBatches(batchesWithCounts);
        } catch (err) {
            error('Failed to fetch batches.');
        } finally {
            setLoading(false);
        }
    }, [error]);

    useEffect(() => {
        fetchBatches();
    }, [fetchBatches]);

    const filteredBatches = useMemo(() => {
        return batches.filter(batch =>
            (batch.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        );
    }, [batches, searchTerm]);

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => {
        setIsModalOpen(false);
        setEditBatchData(null);
    };
    
    const handleDelete = async (batchId) => {
        if(window.confirm('Are you sure you want to delete this batch? This is irreversible.')) {
            try {
                await api.delete(`/batch-management/${batchId}`);
                success('Batch deleted successfully!');
                fetchBatches();
            } catch (err) {
                error(err.response?.data?.message || 'Failed to delete batch.');
            }
        }
    };

    const handleEditClick = (batch) => {
        setEditBatchData(batch);
        setIsModalOpen(true);
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
                                <h1 className="text-4xl font-extrabold text-black tracking-tight">Batch Management</h1>
                                <p className="mt-2 text-lg text-black">Create, manage, and populate student batches.</p>
                            </div>
                            <button onClick={openModal} className="flex items-center gap-2 bg-highlight text-paragraph font-semibold px-5 py-3 rounded-xl shadow-lg hover:bg-highlight hover:text-highlight transition-transform hover:scale-105">
                                <PlusCircle size={20} />
                                Create Batch
                            </button>
                        </div>

                        <div className="mb-8 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-paragraph" />
                            <input
                                type="text"
                                placeholder="Search by batch name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 border border-stroke rounded-xl shadow-sm focus:ring-2 focus:ring-highlight focus:border-highlight transition-shadow text-black"
                            />
                        </div>
                        
                        {loading ? <LoadingSpinner /> : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                <AnimatePresence>
                                    {filteredBatches.map(batch => (
                                        <BatchCard key={batch.id} batch={batch} onDelete={handleDelete} onEdit={handleEditClick} />
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                         {!loading && filteredBatches.length === 0 && (
                            <div className="text-center py-20">
                                <Layers size={48} className="mx-auto text-paragraph" />
                                <h3 className="mt-4 text-lg font-semibold text-black">No batches found</h3>
                                <p className="mt-1 text-black">Create a new batch to get started.</p>
                            </div>
                        )}
                    </motion.div>
                </main>
            </div>
            <AnimatePresence>
                {isModalOpen && !editBatchData && <CreateBatchModal closeModal={closeModal} onBatchCreated={fetchBatches}/>}
                {isModalOpen && editBatchData && <EditBatchModal batch={editBatchData} closeModal={closeModal} onBatchUpdated={fetchBatches}/>}
            </AnimatePresence>
        </div>
    );
};

const CreateBatchModal = ({ closeModal, onBatchCreated }) => {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({ name: '', campus_ids: [], course_ids: [], student_file: null });
    const [campuses, setCampuses] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [previewData, setPreviewData] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { success, error } = useNotification();
    const [createdCredentials, setCreatedCredentials] = useState(null);
    const navigate = useNavigate();
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    const handleDownloadTemplate = () => {
        // Check if campus and courses are selected
        if (formData.campus_ids.length === 0 || formData.course_ids.length === 0) {
            error("Please select a campus and at least one course before downloading the template.");
            return;
        }

        // Get selected campus and course names
        const selectedCampus = campuses.find(c => c.id === formData.campus_ids[0]);
        const selectedCourses = courses.filter(c => formData.course_ids.includes(c.id));
        
        const headers = ['Campus Name', 'Course Name', 'Student Name', 'Roll Number', 'Email', 'Mobile Number'];
        
        let csvRows = [];
        csvRows.push(headers); // Header row

        selectedCourses.forEach((course, index) => {
            const exampleRow = [
                selectedCampus.name,
                course.name,
                `Student ${index + 1}`,
                `ROLL${String(index + 1).padStart(3, '0')}`,
                `student${index + 1}@example.com`,
                `123456789${index + 1}`
            ];
            csvRows.push(exampleRow);
        });

        // Convert array of arrays to CSV string with CRLF line endings
        let csvString = csvRows.map(row => row.map(val => `"${val}"`).join(',')).join('\r\n');

        const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvString);
        
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `student_template_${selectedCampus.name}_${selectedCourses.length}_courses.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        success(`Template downloaded with ${selectedCourses.length} course(s) for ${selectedCampus.name}`);
    };

    useEffect(() => {
        const fetchCampuses = async () => {
            try {
                const res = await api.get('/batch-management/campuses');
                setCampuses(res.data.data);
                setLoading(false);
            } catch(err) { error("Failed to load campuses."); }
        }
        fetchCampuses();
    }, [error]);

    useEffect(() => {
        if (formData.campus_ids.length > 0) {
            const fetchCourses = async () => {
                try {
                    const params = new URLSearchParams();
                    formData.campus_ids.forEach(id => params.append('campus_ids', id));
                    const res = await api.get(`/batch-management/courses`, { params });
                    setCourses(res.data.data);
                } catch(err) { error("Failed to load courses."); }
            }
            fetchCourses();
        } else { setCourses([]); }
    }, [formData.campus_ids, error]);
    
    const handleCampusToggle = (id) => setFormData(prev => ({...prev, campus_ids: prev.campus_ids[0] === id ? [] : [id], course_ids:[]}));
    const handleCourseToggle = (id) => setFormData(prev => ({...prev, course_ids: prev.course_ids.includes(id) ? prev.course_ids.filter(c => c !== id) : [...prev.course_ids, id]}));

    const onDrop = useCallback(async (acceptedFiles) => {
        if (!formData.campus_ids || formData.campus_ids.length === 0) {
            error("Please go back and select a campus before uploading a file.");
            return;
        }
        const file = acceptedFiles[0];
        setFormData(prev => ({ ...prev, student_file: file }));
        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('campus_id', formData.campus_ids[0]);
        try {
            const res = await api.post('/batch-management/validate-student-upload', uploadData);
            setPreviewData(res.data.data);
            setShowPreviewModal(true);
            success("File validated successfully!");
        } catch (err) {
            error(err.response?.data?.message || 'File validation failed.');
            setFormData(prev => ({ ...prev, student_file: null }));
        }
    }, [formData.campus_ids, success, error]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'text/csv': ['.csv'] } });

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const studentData = previewData.filter(row => !row.errors || row.errors.length === 0);
            const batchData = {
                name: formData.name,
                campus_ids: formData.campus_ids,
                course_ids: formData.course_ids,
                students: studentData
            };
            const res = await api.post('/batch-management/create-with-students', batchData);
            
            success(res.data.message);

            if (res.data.data.created_students && res.data.data.created_students.length > 0) {
                setCreatedCredentials(res.data.data.created_students);
            } else {
                closeModal();
            }
            onBatchCreated();

        } catch(err) {
            error(err.response?.data?.message || 'Failed to create batch.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCloseCredentials = () => {
        setCreatedCredentials(null);
        closeModal();
        navigate('/superadmin/students');
    }

    if (createdCredentials) {
        return <CredentialsDisplayModal credentials={createdCredentials} batchName={formData.name} onClose={handleCloseCredentials} />
    }
    
    if (showPreviewModal && previewData) {
        return <StudentPreviewModal students={previewData} onClose={() => setShowPreviewModal(false)} />;
    }
    
    const steps = [
        // Step 1: Batch Details
        {
            title: "Batch Details",
            content: (
                <div className="space-y-6">
                    <div>
                        <label htmlFor="batchName" className="block text-sm font-semibold text-black mb-1">Batch Name</label>
                        <input
                            type="text"
                            id="batchName"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                            className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-highlight focus:border-highlight transition text-black placeholder-gray-400"
                            placeholder="e.g., Spring 2024 Morning"
                        />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-black mb-2">Select Campus</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {campuses.map(c => (
                                <button key={c.id} onClick={() => handleCampusToggle(c.id)}
                                    className={`p-3 text-center rounded-lg border transition font-semibold text-black ${formData.campus_ids[0] === c.id ? 'bg-highlight border-highlight shadow-lg' : 'bg-gray-100 border-gray-300 hover:bg-highlight/20'}`}
                                >
                                    {c.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    {formData.campus_ids.length > 0 && (
                        <div>
                           <h4 className="text-sm font-semibold text-black mb-2">Select Courses</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {courses.map(c => (
                                    <button key={c.id} onClick={() => handleCourseToggle(c.id)}
                                        className={`p-3 text-center rounded-lg border transition font-semibold text-black ${formData.course_ids.includes(c.id) ? 'bg-highlight border-highlight shadow-lg' : 'bg-gray-100 border-gray-300 hover:bg-highlight/20'}`}
                                    >
                                        {c.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )
        },
        // Step 2: Upload Students
        {
            title: "Upload Students",
            content: (
                <div className="space-y-4">
                     <div className="flex justify-between items-center">
                        <div className="text-sm text-highlight">
                            {formData.campus_ids.length === 0 || formData.course_ids.length === 0 ? 
                                "Please select campus and courses first to download template" : 
                                "Template will include selected campus and courses"
                            }
                        </div>
                        <button 
                            onClick={handleDownloadTemplate}
                            disabled={formData.campus_ids.length === 0 || formData.course_ids.length === 0}
                            className={`flex items-center gap-2 text-sm font-semibold transition-colors ${
                                formData.campus_ids.length === 0 || formData.course_ids.length === 0
                                    ? 'text-highlight cursor-not-allowed'
                                    : 'text-highlight hover:text-highlight'
                            }`}
                        >
                            <Download size={16} />
                            Download Template
                        </button>
                    </div>
                    
                    {formData.campus_ids.length > 0 && formData.course_ids.length > 0 && (
                        <div className="bg-stroke border border-highlight rounded-lg p-4">
                            <h4 className="font-semibold text-highlight mb-2">Template Instructions:</h4>
                            <ul className="text-sm text-highlight space-y-1">
                                <li>• The template includes your selected campus and courses</li>
                                <li>• Keep the Campus Name and Course Name exactly as shown in the template</li>
                                <li>• Fill in Student Name, Roll Number, Email, and Mobile Number for each student</li>
                                <li>• Roll numbers must be unique across the system</li>
                                <li>• Email addresses must be unique and valid</li>
                                <li>• Mobile numbers must be unique and valid</li>
                                <li>• You can add multiple students for the same course</li>
                            </ul>
                        </div>
                    )}
                    <div {...getRootProps()} className={`p-10 border-2 border-dashed rounded-xl text-center cursor-pointer transition ${isDragActive ? 'bg-stroke border-highlight' : 'bg-stroke hover:border-highlight'}`}>
                        <input {...getInputProps()} />
                        <div className="flex flex-col items-center justify-center text-highlight">
                            <FileUp className="mx-auto h-12 w-12 text-highlight" />
                            <p className="mt-2 text-sm font-medium">Drag 'n' drop a CSV file here, or click to select</p>
                            <p className="text-xs text-highlight mt-1">Supports CSV files with Campus Name, Course Name, Student Name, Roll Number, Email, and Mobile Number columns</p>
                        </div>
                    </div>
                </div>
            )
        }
    ];

    const currentStep = steps[step - 1];

    return (
        <motion.div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 text-black">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-black">{currentStep.title}</h2>
                        <button onClick={closeModal}><X className="text-black hover:text-highlight"/></button>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                        <div className="bg-highlight h-1.5 rounded-full" style={{ width: `${(step / steps.length) * 100}%` }}></div>
                    </div>
                </div>

                <div className="p-8">
                    {loading ? <LoadingSpinner /> : currentStep.content}
                </div>

                <div className="px-8 py-4 bg-gray-100 rounded-b-2xl flex justify-between items-center">
                    <button onClick={() => setStep(s => s - 1)} disabled={step === 1} className="px-4 py-2 rounded-lg text-black bg-gray-200 hover:bg-gray-300 disabled:opacity-50">Back</button>
                    {step < steps.length ? (
                        <button onClick={() => setStep(s => s + 1)} disabled={formData.name === '' || formData.course_ids.length === 0} className="px-4 py-2 rounded-lg text-white bg-highlight hover:bg-highlight/80 disabled:bg-gray-300">Next</button>
                    ) : (
                        <button onClick={handleSubmit} disabled={!previewData || isSubmitting} className="px-4 py-2 rounded-lg text-white bg-highlight hover:bg-highlight/80 disabled:bg-gray-300">
                            {isSubmitting ? 'Creating...' : 'Create Batch'}
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

const EditBatchModal = ({ batch, closeModal, onBatchUpdated }) => {
    const [name, setName] = useState(batch.name);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { success, error } = useNotification();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await api.put(`/batch-management/${batch.id}`, { name });
            success('Batch updated successfully!');
            onBatchUpdated();
            closeModal();
        } catch (err) {
            error(err.response?.data?.message || 'Failed to update batch.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-gray-800">Edit Batch</h2>
                            <button type="button" onClick={closeModal}><X className="text-gray-600 hover:text-gray-900"/></button>
                        </div>
                    </div>
                    <div className="p-6">
                        <label htmlFor="batchName" className="block text-sm font-medium text-gray-700 mb-1">Batch Name</label>
                        <input
                            type="text"
                            id="batchName"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            required
                        />
                    </div>
                    <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex justify-end">
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400">
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </motion.div>
    );
};

export default BatchManagement; 