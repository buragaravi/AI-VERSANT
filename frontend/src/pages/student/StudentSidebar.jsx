import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Home, Book, Calendar, BarChart2, PieChart, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const StudentSidebar = () => {
    const location = useLocation();
    const { user, logout } = useAuth();

    const navLinks = [
        { name: 'Dashboard', path: '/student', icon: Home },
        { name: 'Practice Modules', path: '/student/practice', icon: Book },
        { name: 'Online Exams', path: '/student/exams', icon: Calendar },
        { name: 'Test History', path: '/student/history', icon: BarChart2 },
        { name: 'Progress', path: '/student/progress', icon: PieChart },
    ];

    return (
        <div className="flex h-screen">
            <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-50 bg-white shadow-lg">
                <div className="flex items-center justify-center h-20 border-b">
                    <img
                        className="h-12 w-auto"
                        src="https://static.wixstatic.com/media/bfee2e_7d499a9b2c40442e85bb0fa99e7d5d37~mv2.png/v1/fill/w_203,h_111,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo1.png"
                        alt="Study Edge"
                    />
                </div>
            <div className="flex-1 flex flex-col overflow-y-auto">
                <nav className="flex-1 px-4 py-6">
                    {navLinks.map((item) => (
                        <Link
                            key={item.name}
                            to={item.path}
                            className={`flex items-center px-4 py-3 my-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                location.pathname === item.path
                                    ? 'bg-blue-500 text-white shadow-lg'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                        >
                            <item.icon className="h-5 w-5 mr-3" />
                            {item.name}
                        </Link>
                    ))}
                </nav>
                <div className="px-4 py-4 border-t">
                     <Link to="/student/profile" className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                            <User className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="font-bold">{user?.name}</p>
                            <p className="text-xs text-gray-500">Student</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
        <div className="lg:ml-64 flex-1">
            <Outlet />
        </div>
    </div>
    );
};

export default StudentSidebar; 