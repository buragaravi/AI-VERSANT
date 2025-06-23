import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '../../contexts/NotificationContext';
import Header from '../../components/common/Header';
import SuperAdminSidebar from '../../components/common/SuperAdminSidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../services/api';
import { Users, Building, BookOpen, ChevronRight, X, ArrowLeft, Mail, Phone, KeyRound, Milestone, Search, Edit, Trash2, Save, XCircle } from 'lucide-react';

const StatCard = ({ title, count, icon, color, onClick }) => (
    <motion.div
        onClick={onClick}
        className={`p-6 rounded-2xl shadow-lg cursor-pointer text-white ${color}`}
        whileHover={{ scale: 1.03, y: -5 }}
        transition={{ type: 'spring', stiffness: 300 }}
    >
        <div className="flex justify-between items-start">
            <div>
                <p className="text-lg font-semibold">{title}</p>
                <p className="text-4xl font-bold">{count}</p>
            </div>
            <div className="p-3 bg-white bg-opacity-20 rounded-xl">{icon}</div>
        </div>
        <div className="mt-4 flex items-center justify-end text-sm opacity-80">
            View All <ChevronRight className="ml-1 h-4 w-4" />
        </div>
    </motion.div>
);

const UserManagement = () => {
    const [counts, setCounts] = useState({ campus: 0, course: 0, student: 0 });
    const [data, setData] = useState({ campus: [], course: [], student: [] });
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState({ type: '', data: [] });
    const [selectedUser, setSelectedUser] = useState(null);
    const [fullUserData, setFullUserData] = useState(null);
    const { success, error } = useNotification();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [campusRes, courseRes, studentRes] = await Promise.all([
                    api.get('/campus-management/'),
                    api.get('/course-management/'),
                    api.get('/user-management/students'),
                ]);

                const campusData = campusRes.data?.data;
                const campusAdmins = Array.isArray(campusData)
                    ? campusData.filter(c => c.admin).map(c => ({ ...c.admin, campusName: c.name }))
                    : [];
                
                const courseData = courseRes.data?.data;
                const courseAdmins = Array.isArray(courseData)
                    ? courseData.filter(c => c.admin).map(c => ({ ...c.admin, courseName: c.name, campusName: c.campus?.name }))
                    : [];

                const studentData = studentRes.data?.data;
                const students = Array.isArray(studentData) ? studentData : [];

                setData({ campus: campusAdmins, course: courseAdmins, student: students });
                setCounts({ campus: campusAdmins.length, course: courseAdmins.length, student: students.length });

            } catch (err) {
                error('Failed to fetch user data.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [error]);

    const handleSelectUser = async (user) => {
        setSelectedUser(user);
        setFullUserData(null); 
        try {
            const res = await api.get(`/user-management/${user._id}`);
            setFullUserData(res.data.data);
        } catch (err) {
            error("Failed to fetch user's full details.");
            setFullUserData(user);
        }
    };

    const openModal = (type) => {
        setModalContent({
            type: type,
            data: data[type]
        });
        setIsModalOpen(true);
    };
    
    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedUser(null);
        setFullUserData(null);
    };

    const cardDetails = {
        campus: { title: "Campus Admins", icon: <Building size={28} />, color: "bg-gradient-to-br from-blue-500 to-indigo-600", dataKey: "campus" },
        course: { title: "Course Admins", icon: <BookOpen size={28} />, color: "bg-gradient-to-br from-green-500 to-emerald-600", dataKey: "course" },
        student: { title: "Students", icon: <Users size={28} />, color: "bg-gradient-to-br from-purple-500 to-violet-600", dataKey: "student" },
    };

    const handleUserUpdate = (updatedUser) => {
        setFullUserData(updatedUser);
        const updateUserInList = (userList) => 
            userList.map(u => u._id === updatedUser._id ? {...u, ...updatedUser} : u);

        setData(prevData => ({
            campus: updateUserInList(prevData.campus),
            course: updateUserInList(prevData.course),
            student: updateUserInList(prevData.student),
        }));
        setSelectedUser(updatedUser);
        success('User updated successfully!');
    }

    const handleUserDelete = (userId) => {
        const deleteUserFromList = (userList) => userList.filter(u => u._id !== userId);

        setData(prevData => ({
            campus: deleteUserFromList(prevData.campus),
            course: deleteUserFromList(prevData.course),
            student: deleteUserFromList(prevData.student),
        }));

        setCounts(prevCounts => ({
            campus: data.campus.length,
            course: data.course.length,
            student: data.student.length,
        }));
        
        setSelectedUser(null);
        setFullUserData(null);
        success('User deleted successfully!');
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <SuperAdminSidebar />
            <div className="flex-1 lg:pl-64">
                <Header />
                <main className="px-6 lg:px-10 py-12">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                        <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">User Management</h1>
                        <p className="text-gray-600 mb-10 text-lg">A centralized hub for managing all user roles.</p>
                        
                        {loading ? <LoadingSpinner /> : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {Object.values(cardDetails).map(details => (
                                    <StatCard 
                                        key={details.dataKey}
                                        title={details.title}
                                        count={counts[details.dataKey]}
                                        icon={details.icon}
                                        color={details.color}
                                        onClick={() => openModal(details.dataKey)}
                                    />
                                ))}
                            </div>
                        )}
                    </motion.div>
                </main>
            </div>
            <AnimatePresence>
                {isModalOpen && (
                     <UserListModal 
                        closeModal={closeModal} 
                        content={modalContent}
                        selectedUser={selectedUser}
                        onSelectUser={handleSelectUser}
                        fullUserData={fullUserData}
                        onUserUpdate={handleUserUpdate}
                        onUserDelete={handleUserDelete}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

const UserListModal = ({ closeModal, content, selectedUser, onSelectUser, fullUserData, onUserUpdate, onUserDelete }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const title = `All ${content.type.charAt(0).toUpperCase() + content.type.slice(1)}s`;

    const filteredData = useMemo(() => {
        if (!searchTerm) return content.data;
        return content.data.filter(user => 
            (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [content.data, searchTerm]);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.9, opacity: 0 }} 
                className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden"
            >
               <div className="flex justify-between items-center p-5 border-b bg-gray-50 rounded-t-2xl">
                 <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                 <button onClick={closeModal} className="p-2 rounded-full hover:bg-gray-200 transition-colors"><X className="text-gray-600"/></button>
               </div>
               <div className="flex-1 flex overflow-hidden">
                    <div className="w-1/3 border-r overflow-y-auto p-4">
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                            />
                        </div>
                        <ul className="space-y-2">
                            {filteredData.map(user => (
                                <li 
                                    key={user.id || user._id || user.email} 
                                    onClick={() => onSelectUser(user)} 
                                    className={`p-3 flex items-center justify-between rounded-lg cursor-pointer transition-colors ${selectedUser && (selectedUser.id === user.id || selectedUser._id === user._id) ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                                >
                                        <div>
                                        <p className="font-semibold text-gray-800">{user.name}</p>
                                            <p className="text-sm text-gray-500">{user.email}</p>
                                        </div>
                                        <ChevronRight className="text-gray-400" />
                                    </li>
                                ))}
                        </ul>
                    </div>
                    <div className="w-2/3 overflow-y-auto p-8">
                        <AnimatePresence mode="wait">
                           {selectedUser ? (
                                fullUserData ? (
                                    <UserDetails 
                                        key={fullUserData._id} 
                                        user={fullUserData} 
                                        type={content.type} 
                                        onUserUpdate={onUserUpdate}
                                        onUserDelete={onUserDelete}
                                    />
                                ) : <LoadingSpinner />
                           ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                                    <Users size={48} className="mb-4" />
                                    <h3 className="text-xl font-semibold">Select a user</h3>
                                    <p>User details will be displayed here.</p>
                                </div>
                        )}
                    </AnimatePresence>
                    </div>
               </div>
            </motion.div>
        </motion.div>
    );
}

const UserDetails = ({ user, type, onUserUpdate, onUserDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState(user);
    const { success, error } = useNotification();

    const handleInputChange = (e) => {
        setEditData({...editData, [e.target.name]: e.target.value});
    };

    const handleSave = async () => {
        try {
            await api.put(`/user-management/${user._id}`, editData);
            onUserUpdate(editData);
            setIsEditing(false);
        } catch (err) {
            error("Failed to update user.");
        }
    };

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
            try {
                await api.delete(`/user-management/${user._id}`);
                onUserDelete(user._id);
            } catch (err) {
                error("Failed to delete user.");
            }
        }
    };
    
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
        >
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-3xl font-bold mr-6">
                        {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                    </div>
        <div>
                        <h3 className="text-3xl font-bold text-gray-900">{user.name}</h3>
                        <p className="text-md text-gray-500">{user.email}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <>
                            <button onClick={handleSave} className="p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200"><Save size={20}/></button>
                            <button onClick={() => setIsEditing(false)} className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"><XCircle size={20}/></button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setIsEditing(true)} className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200"><Edit size={20}/></button>
                            <button onClick={handleDelete} className="p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200"><Trash2 size={20}/></button>
                        </>
                    )}
                </div>
            </div>
            <div className="space-y-5">
                <DetailItem isEditing={isEditing} icon={<Users size={20} />} label="Name" name="name" value={editData.name} onChange={handleInputChange} />
                <DetailItem isEditing={isEditing} icon={<Mail size={20} />} label="Email" name="email" value={editData.email} onChange={handleInputChange} />
                <DetailItem isEditing={isEditing} icon={<Users size={20} />} label="Username" name="username" value={editData.username || ''} onChange={handleInputChange} placeholder="Enter username" />
                {user.role === 'student' && <DetailItem isEditing={isEditing} icon={<Milestone size={20} />} label="Roll Number" name="roll_number" value={editData.roll_number} onChange={handleInputChange} />}
                {user.campusName && <DetailItem isEditing={false} icon={<Building size={20} />} label="Campus" value={user.campusName} />}
                {user.courseName && <DetailItem isEditing={false} icon={<BookOpen size={20} />} label="Course" value={user.courseName || user.course_name} />}
                {user.batch_name && <DetailItem isEditing={false} icon={<Users size={20} />} label="Batch" value={user.batch_name} />}
                <DetailItem isEditing={isEditing} icon={<KeyRound size={20}/>} label="Password" name="password" type="password" value={isEditing ? (editData.password || '') : user.password} onChange={handleInputChange} placeholder="Leave blank to keep unchanged" />
            </div>
        </motion.div>
    )
}

const DetailItem = ({ isEditing, icon, label, ...props }) => (
    <div className="flex items-center p-4 bg-gray-50 rounded-xl">
        <div className="p-3 bg-gray-200 text-gray-600 rounded-full mr-4">{icon}</div>
        <div className="flex-1">
            <p className="text-sm text-gray-500 font-medium">{label}</p>
            {isEditing ? (
                <input
                    {...props}
                    className="w-full bg-transparent text-lg text-gray-800 font-semibold outline-none"
                />
            ) : (
                <p className={`font-semibold text-lg text-gray-800 ${props.label === 'Password' ? 'font-mono text-sm' : ''}`}>{props.value || 'N/A'}</p>
            )}
        </div>
    </div>
);

export default UserManagement; 