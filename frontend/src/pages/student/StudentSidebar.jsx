import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { Home, Book, Calendar, BarChart2, PieChart, User, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';

const StudentSidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navLinks = [
        { name: 'Dashboard', path: '/student', icon: Home },
        { name: 'Practice Modules', path: '/student/practice', icon: Book },
        { name: 'CRT Modules', path: '/student/crt', icon: Book },
        { name: 'Online Exams', path: '/student/exams', icon: Calendar },
        { name: 'Test History', path: '/student/history', icon: BarChart2 },
        { name: 'Progress', path: '/student/progress', icon: PieChart },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Handle window resize to close mobile menu on desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024 && isMobileMenuOpen) {
                setIsMobileMenuOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isMobileMenuOpen]);

    // Handle swipe gestures for mobile
    useEffect(() => {
        let startX = 0;
        let currentX = 0;

        const handleTouchStart = (e) => {
            startX = e.touches[0].clientX;
        };

        const handleTouchMove = (e) => {
            currentX = e.touches[0].clientX;
        };

        const handleTouchEnd = () => {
            const diffX = startX - currentX;
            
            // If swiped left more than 50px and menu is open, close it
            if (diffX > 50 && isMobileMenuOpen) {
                setIsMobileMenuOpen(false);
            }
        };

        if (isMobileMenuOpen) {
            document.addEventListener('touchstart', handleTouchStart);
            document.addEventListener('touchmove', handleTouchMove);
            document.addEventListener('touchend', handleTouchEnd);
        }

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isMobileMenuOpen]);

    // Handle click outside to close mobile menu
    useEffect(() => {
        const handleClickOutside = (e) => {
            const sidebar = document.querySelector('[data-student-sidebar]');
            const toggleButton = document.querySelector('[data-student-toggle-button]');
            
            if (isMobileMenuOpen && sidebar && !sidebar.contains(e.target) && !toggleButton?.contains(e.target)) {
                setIsMobileMenuOpen(false);
            }
        };

        if (isMobileMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isMobileMenuOpen]);

    const isActive = (path) => location.pathname === path;

    return (
        <div className="flex">
            {/* Mobile Menu Toggle */}
            <div className="lg:hidden fixed top-4 left-4 z-50">
                <button
                    data-student-toggle-button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                >
                    {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </div>

            {/* Sidebar */}
            <motion.div
                data-student-sidebar
                initial={false}
                animate={{ 
                    x: isMobileMenuOpen ? 0 : '-100%'
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={`fixed top-0 left-0 h-screen w-64 bg-gradient-to-b from-white to-gray-50 shadow-2xl z-30 flex flex-col border-r border-gray-200 lg:relative lg:translate-x-0 lg:z-auto ${
                    isMobileMenuOpen ? 'translate-x-0' : 'lg:translate-x-0 -translate-x-full'
                }`}
            >
                {/* Logo/Brand */}
                <motion.div 
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1, type: 'spring', stiffness: 100 }}
                    className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0"
                >
                    <div className="flex items-center justify-center">
                        <img
                            className="h-8 w-auto"
                            src="https://static.wixstatic.com/media/bfee2e_7d499a9b2c40442e85bb0fa99e7d5d37~mv2.png/v1/fill/w_203,h_111,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo1.png"
                            alt="PYDAH GROUP"
                        />
                    </div>
                    <p className="text-xs text-gray-600 font-medium text-center mt-2">
                        Education & Beyond
                    </p>
                </motion.div>

                <nav className="flex-1 flex flex-col justify-between min-h-0">
                    <div className="flex flex-col space-y-1 px-4 mt-4 overflow-y-auto flex-1 pb-4">
                        <div className="space-y-1">
                            {navLinks.map((link, idx) => (
                                <motion.div
                                    key={link.name}
                                    initial={{ x: -30, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.05 * idx, type: 'spring', stiffness: 80, damping: 18 }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Link
                                        to={link.path}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`group flex items-center px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 relative overflow-hidden
                                            ${isActive(link.path)
                                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
                                                : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-100 hover:to-blue-50 hover:text-gray-900 hover:shadow-md'
                                            }
                                        `}
                                    >
                                        {/* Active indicator */}
                                        {isActive(link.path) && (
                                            <motion.div
                                                layoutId="studentActiveTab"
                                                className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl"
                                                initial={false}
                                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                            />
                                        )}
                                        
                                        <link.icon className={`mr-3 h-4 w-4 transition-all duration-300 relative z-10
                                            ${isActive(link.path)
                                                ? 'text-white' 
                                                : 'text-gray-500 group-hover:text-blue-600 group-hover:scale-110'
                                            }`} 
                                        />
                                        <span className="relative z-10 transition-all duration-300 group-hover:translate-x-1 font-semibold text-sm">
                                            {link.name}
                                        </span>
                                        
                                        {/* Hover effect */}
                                        {!isActive(link.path) && (
                                            <motion.div
                                                className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl"
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                whileHover={{ opacity: 1, scale: 1 }}
                                                transition={{ duration: 0.2 }}
                                            />
                                        )}
                                    </Link>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </nav>

                {/* User Profile Section */}
                <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, type: 'spring', stiffness: 100 }}
                    className="px-4 pb-4 mt-auto flex-shrink-0 border-t border-gray-200"
                >
                    <Link 
                        to="/student/profile" 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-100 transition-all duration-300"
                    >
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                            <User className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{user?.name || 'Student'}</p>
                            <p className="text-xs text-gray-500">Student</p>
                        </div>
                    </Link>
                    
                    {/* Logout Button */}
                    <button
                        onClick={() => {
                            handleLogout();
                            setIsMobileMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white font-semibold px-3 py-2.5 rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-sm mt-3"
                    >
                        <motion.div
                            whileHover={{ rotate: 180 }}
                            transition={{ duration: 0.3 }}
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </motion.div>
                        Logout
                    </button>
                </motion.div>
            </motion.div>
            
            {/* Main Content */}
            <div className="flex-1 bg-gray-50 w-full lg:ml-64">
                <Outlet />
            </div>
        </div>
    );
};

export default StudentSidebar; 