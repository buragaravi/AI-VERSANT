import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '../../contexts/NotificationContext';
import Header from '../../components/common/Header';
import SuperAdminSidebar from '../../components/common/SuperAdminSidebar';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../services/api';
import { 
  Shield, Users, Settings, Check, X, Edit, RotateCcw, 
  Building2, BookOpen, GraduationCap, FileText, BarChart3,
  Eye, EyeOff, Save, AlertCircle
} from 'lucide-react';

const AdminPermissions = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [availableModules, setAvailableModules] = useState({});
  const { success, error } = useNotification();

  useEffect(() => {
    fetchAdmins();
    fetchAvailableModules();
  }, []);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await api.get('/access-control/admins');
      setAdmins(response.data.data);
    } catch (err) {
      error('Failed to fetch admins');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableModules = async () => {
    try {
      const response = await api.get('/access-control/modules');
      setAvailableModules(response.data.data);
    } catch (err) {
      error('Failed to fetch available modules');
    }
  };

  const handleEditPermissions = async (admin) => {
    try {
      const response = await api.get(`/access-control/permissions/${admin.id}`);
      setSelectedAdmin(response.data.data);
      setIsPermissionModalOpen(true);
    } catch (err) {
      error('Failed to fetch admin permissions');
    }
  };

  const handleResetPermissions = async (adminId) => {
    try {
      await api.post(`/access-control/reset-permissions/${adminId}`);
      success('Permissions reset successfully');
      fetchAdmins();
    } catch (err) {
      error('Failed to reset permissions');
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'campus_admin':
        return <Building2 className="h-5 w-5" />;
      case 'course_admin':
        return <BookOpen className="h-5 w-5" />;
      default:
        return <Users className="h-5 w-5" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'campus_admin':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'course_admin':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getModuleIcon = (module) => {
    const icons = {
      dashboard: <BarChart3 className="h-4 w-4" />,
      campus_management: <Building2 className="h-4 w-4" />,
      course_management: <BookOpen className="h-4 w-4" />,
      batch_management: <GraduationCap className="h-4 w-4" />,
      user_management: <Users className="h-4 w-4" />,
      student_management: <GraduationCap className="h-4 w-4" />,
      test_management: <FileText className="h-4 w-4" />,
      question_bank_upload: <FileText className="h-4 w-4" />,
      crt_upload: <FileText className="h-4 w-4" />,
      results_management: <BarChart3 className="h-4 w-4" />,
      analytics: <BarChart3 className="h-4 w-4" />,
      reports: <BarChart3 className="h-4 w-4" />
    };
    return icons[module] || <Settings className="h-4 w-4" />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SuperAdminSidebar />
      <div className="flex-1">
        <Header />
        <main className="px-6 lg:px-10 py-12 bg-background min-h-screen">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-extrabold text-headline tracking-tight">Admin Permissions</h1>
                <p className="text-paragraph text-lg">Manage access controls for campus and course administrators</p>
              </div>
            </div>

            {loading ? (
              <LoadingSpinner />
            ) : (
              <div className="grid gap-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Admins</p>
                        <p className="text-3xl font-bold text-gray-900">{admins.length}</p>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-xl">
                        <Users className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Campus Admins</p>
                        <p className="text-3xl font-bold text-gray-900">
                          {admins.filter(a => a.role === 'campus_admin').length}
                        </p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-xl">
                        <Building2 className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Course Admins</p>
                        <p className="text-3xl font-bold text-gray-900">
                          {admins.filter(a => a.role === 'course_admin').length}
                        </p>
                      </div>
                      <div className="p-3 bg-purple-100 rounded-xl">
                        <BookOpen className="h-8 w-8 text-purple-600" />
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Admins List */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Admin List</h2>
                    <p className="text-sm text-gray-600">Manage permissions for each administrator</p>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {admins.map((admin, index) => (
                      <motion.div
                        key={admin.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className="p-6 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              {getRoleIcon(admin.role)}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{admin.name}</h3>
                              <p className="text-sm text-gray-600">{admin.email}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRoleColor(admin.role)}`}>
                                  {admin.role.replace('_', ' ')}
                                </span>
                                {admin.permissions_updated_at && (
                                  <span className="text-xs text-gray-500">
                                    Updated: {new Date(admin.permissions_updated_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">
                                {admin.permissions?.modules?.length || 0} modules
                              </p>
                              <p className="text-xs text-gray-600">accessible</p>
                            </div>
                            
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditPermissions(admin)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit Permissions"
                              >
                                <Edit className="h-5 w-5" />
                              </button>
                              
                              <button
                                onClick={() => handleResetPermissions(admin.id)}
                                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                title="Reset to Default"
                              >
                                <RotateCcw className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  {admins.length === 0 && (
                    <div className="p-12 text-center">
                      <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                        <Users className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Admins Found</h3>
                      <p className="text-gray-600">Create campus and course admins to manage their permissions here.</p>
                    </div>
                  )}
                </motion.div>
              </div>
            )}
          </motion.div>
        </main>
      </div>

      <AnimatePresence>
        {isPermissionModalOpen && selectedAdmin && (
          <PermissionModal
            admin={selectedAdmin}
            availableModules={availableModules}
            onClose={() => {
              setIsPermissionModalOpen(false);
              setSelectedAdmin(null);
            }}
            onSave={async (permissions) => {
              try {
                await api.put(`/access-control/permissions/${selectedAdmin.admin_id}`, {
                  permissions
                });
                success('Permissions updated successfully');
                fetchAdmins();
                setIsPermissionModalOpen(false);
                setSelectedAdmin(null);
              } catch (err) {
                error('Failed to update permissions');
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const PermissionModal = ({ admin, availableModules, onClose, onSave }) => {
  const [permissions, setPermissions] = useState(admin.permissions);
  const [saving, setSaving] = useState(false);

  const handleModuleToggle = (module) => {
    const currentModules = permissions.modules || [];
    const newModules = currentModules.includes(module)
      ? currentModules.filter(m => m !== module)
      : [...currentModules, module];
    
    setPermissions(prev => ({
      ...prev,
      modules: newModules
    }));
  };

  const handleActionToggle = (action) => {
    setPermissions(prev => ({
      ...prev,
      [action]: !prev[action]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(permissions);
    setSaving(false);
  };

  const getModuleIcon = (module) => {
    const icons = {
      dashboard: <BarChart3 className="h-4 w-4" />,
      campus_management: <Building2 className="h-4 w-4" />,
      course_management: <BookOpen className="h-4 w-4" />,
      batch_management: <GraduationCap className="h-4 w-4" />,
      user_management: <Users className="h-4 w-4" />,
      student_management: <GraduationCap className="h-4 w-4" />,
      test_management: <FileText className="h-4 w-4" />,
      question_bank_upload: <FileText className="h-4 w-4" />,
      crt_upload: <FileText className="h-4 w-4" />,
      results_management: <BarChart3 className="h-4 w-4" />,
      analytics: <BarChart3 className="h-4 w-4" />,
      reports: <BarChart3 className="h-4 w-4" />
    };
    return icons[module] || <Settings className="h-4 w-4" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit Permissions</h2>
            <p className="text-sm text-gray-600">{admin.admin_name} ({admin.admin_role.replace('_', ' ')})</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Module Permissions */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Module Access
              </h3>
              <div className="space-y-3">
                {Object.entries(availableModules).map(([module, name]) => (
                  <div
                    key={module}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getModuleIcon(module)}
                      <span className="font-medium text-gray-900">{name}</span>
                    </div>
                    <button
                      onClick={() => handleModuleToggle(module)}
                      className={`p-2 rounded-lg transition-colors ${
                        permissions.modules?.includes(module)
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {permissions.modules?.includes(module) ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Permissions */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Feature Permissions
              </h3>
              <div className="space-y-3">
                {[
                  { key: 'can_create_campus', label: 'Create Campus', icon: <Building2 className="h-4 w-4" /> },
                  { key: 'can_create_course', label: 'Create Course', icon: <BookOpen className="h-4 w-4" /> },
                  { key: 'can_create_batch', label: 'Create Batch', icon: <GraduationCap className="h-4 w-4" /> },
                  { key: 'can_manage_users', label: 'Manage Users', icon: <Users className="h-4 w-4" /> },
                  { key: 'can_manage_tests', label: 'Manage Tests', icon: <FileText className="h-4 w-4" /> },
                  { key: 'can_view_all_data', label: 'View All Data', icon: <Eye className="h-4 w-4" /> }
                ].map(({ key, label, icon }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {icon}
                      <span className="font-medium text-gray-900">{label}</span>
                    </div>
                    <button
                      onClick={() => handleActionToggle(key)}
                      className={`p-2 rounded-lg transition-colors ${
                        permissions[key]
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {permissions[key] ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AdminPermissions; 