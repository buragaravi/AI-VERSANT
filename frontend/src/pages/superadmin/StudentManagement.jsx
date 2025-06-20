import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, User, Edit, Trash2, X, Check, Mail, Phone, BookUser, Building, Milestone, KeyRound } from 'lucide-react';
import Header from '../../components/common/Header';
import SuperAdminSidebar from '../../components/common/SuperAdminSidebar';
import { getBatchStudents, getStudentDetails, updateStudent, deleteStudent } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';

const DetailItem = ({ icon, label, value }) => (
  <motion.div 
    className="flex items-start space-x-4"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <div className="bg-blue-100 text-blue-600 rounded-full p-2">
      {icon}
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="text-md font-semibold text-gray-800">{value}</p>
    </div>
  </motion.div>
);

const StudentManagement = () => {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('course_id');
  const { success, error } = useNotification();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [batchInfo, setBatchInfo] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    mobile_number: ''
  });

  useEffect(() => {
    fetchStudents();
  }, [batchId, courseId]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await getBatchStudents(batchId, courseId);
      setStudents(res.data.data);
      setBatchInfo(res.data.batch_info);
    } catch (e) {
      error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentClick = async (student) => {
    try {
      setLoadingDetails(true);
      setSelectedStudent(true); // Open modal immediately
      const res = await getStudentDetails(student.id);
      setSelectedStudent(res.data.data);
      setEditForm({
        name: res.data.data.name,
        email: res.data.data.email,
        mobile_number: res.data.data.mobile_number
      });
      setEditMode(false);
    } catch (e) {
      error('Failed to fetch student details');
      setSelectedStudent(null); // Close modal on error
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleUpdateStudent = async () => {
    try {
      const res = await updateStudent(selectedStudent.id, editForm);
      if (res.data.success) {
        success('Student updated successfully');
        const updatedStudent = await getStudentDetails(selectedStudent.id);
        setSelectedStudent(updatedStudent.data.data);
        setEditMode(false);
        fetchStudents(); // Refresh the list
      }
    } catch (e) {
      error(e.response?.data?.message || 'Failed to update student');
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    
    try {
      const res = await deleteStudent(studentId);
      if (res.data.success) {
        success('Student deleted successfully');
        setSelectedStudent(null);
        fetchStudents(); // Refresh the list
      }
    } catch (e) {
      error(e.response?.data?.message || 'Failed to delete student');
    }
  };

  const StudentCard = ({ student }) => (
    <div 
      onClick={() => handleStudentClick(student)}
      className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
    >
      <div className="flex items-center space-x-3">
        <User className="w-6 h-6 text-blue-500" />
        <div>
          <h3 className="font-medium text-gray-900">{student.name}</h3>
          <p className="text-sm text-gray-500">{student.roll_number}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SuperAdminSidebar />
      <div className="flex-1 lg:pl-64">
        <Header />
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Campus
              </button>
              {batchInfo && (
                <div className="mt-4">
                  <h1 className="text-2xl font-bold text-gray-900">{batchInfo.name}</h1>
                  <div className="mt-2 space-y-1">
                    <p className="text-gray-600">Campus: {batchInfo.campus_name}</p>
                    <p className="text-gray-600">Course: {batchInfo.course_name}</p>
                    <p className="text-blue-600">Total Students: {students.length}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {students.map(student => (
                <StudentCard key={student.id} student={student} />
              ))}
            </div>
          )}

          {/* Student Details Modal */}
          <AnimatePresence>
            {selectedStudent && (
              <motion.div 
                className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div 
                  className="bg-gray-50 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto"
                  initial={{ scale: 0.9, y: 50 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 50 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h2 className="text-3xl font-bold text-gray-800">Student Details</h2>
                        <p className="text-gray-500">Comprehensive overview of the student's profile.</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!editMode && !loadingDetails && (
                          <>
                            <button
                              onClick={() => setEditMode(true)}
                              className="p-2 rounded-full text-gray-500 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                              title="Edit Student"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(selectedStudent.id)}
                              className="p-2 rounded-full text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                              title="Delete Student"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => setSelectedStudent(null)}
                          className="p-2 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
                          title="Close"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                    
                    {loadingDetails ? (
                      <div className="flex justify-center items-center p-16">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                      </div>
                    ) : editMode ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Name</label>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email</label>
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
                          <input
                            type="text"
                            value={editForm.mobile_number}
                            onChange={(e) => setEditForm({...editForm, mobile_number: e.target.value})}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex justify-end space-x-2 mt-4">
                          <button
                            onClick={() => setEditMode(false)}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleUpdateStudent}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <motion.div 
                        className="space-y-8"
                        initial="hidden"
                        animate="visible"
                        variants={{
                          visible: { transition: { staggerChildren: 0.1 } }
                        }}
                      >
                        {/* Personal Information */}
                        <div className="border-b border-gray-200 pb-6">
                           <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center"><User className="mr-3 text-blue-500"/> Personal Information</h3>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                              <DetailItem icon={<User size={20}/>} label="Name" value={selectedStudent.name} />
                              <DetailItem icon={<BookUser size={20}/>} label="Roll Number" value={selectedStudent.roll_number} />
                              <DetailItem icon={<Mail size={20}/>} label="Email" value={selectedStudent.email} />
                              <DetailItem icon={<Phone size={20}/>} label="Mobile Number" value={selectedStudent.mobile_number} />
                           </div>
                        </div>

                        {/* Course & Campus Details */}
                        <div className="border-b border-gray-200 pb-6">
                          <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center"><Building className="mr-3 text-blue-500"/> Academic Details</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <DetailItem icon={<BookUser size={20}/>} label="Course Name" value={selectedStudent.course_name} />
                            <DetailItem icon={<Building size={20}/>} label="Campus" value={selectedStudent.campus_name} />
                            <DetailItem icon={<Milestone size={20}/>} label="Batch" value={selectedStudent.batch_name} />
                          </div>
                        </div>
                        
                        {/* Login Credentials */}
                        <div>
                          <h3 className="text-xl font-semibold text-gray-700 mb-4 flex items-center"><KeyRound className="mr-3 text-blue-500"/> Login Credentials</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <DetailItem icon={<User size={20}/>} label="Username" value={selectedStudent.username || selectedStudent.roll_number} />
                            <DetailItem icon={<KeyRound size={20}/>} label="Password" value={
                              selectedStudent.name && selectedStudent.roll_number
                                ? `${selectedStudent.name.split(' ')[0].slice(0, 4).toLowerCase()}${selectedStudent.roll_number.slice(-4)}`
                                : 'Not available'
                            } />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default StudentManagement; 