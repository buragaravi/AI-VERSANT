import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const GetStarted = () => {
  const features = [
    {
      icon: '🎧',
      title: 'Listening Comprehension',
      description: 'Master real-world audio scenarios with interactive listening tests',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: '🗣️',
      title: 'Speaking & Pronunciation',
      description: 'Perfect your accent and fluency with AI-powered speech analysis',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: '📖',
      title: 'Reading Comprehension',
      description: 'Enhance reading skills with diverse texts and critical analysis',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: '✍️',
      title: 'Writing Excellence',
      description: 'Develop advanced writing skills with structured feedback',
      color: 'from-orange-500 to-orange-600'
    },
    {
      icon: '📚',
      title: 'Grammar Mastery',
      description: 'Master English grammar rules with interactive exercises',
      color: 'from-red-500 to-red-600'
    },
    {
      icon: '📝',
      title: 'Vocabulary Building',
      description: 'Expand your lexicon with contextual learning and word games',
      color: 'from-indigo-500 to-indigo-600'
    },
    {
      icon: '🧠',
      title: 'CRT Reasoning',
      description: 'Develop critical thinking and logical reasoning skills',
      color: 'from-teal-500 to-teal-600'
    },
    {
      icon: '💻',
      title: 'Programming Logic',
      description: 'Learn coding fundamentals and problem-solving techniques',
      color: 'from-pink-500 to-pink-600'
    }
  ]

  const benefits = [
    'Real-time performance tracking and analytics',
    'Personalized learning paths based on your progress',
    'Interactive practice modules with instant feedback',
    'Comprehensive test history and detailed reports',
    'Mobile-responsive design for learning anywhere',
    'Expert-curated content by language specialists'
  ]

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-x-hidden overflow-y-auto">
      {/* Enhanced Background Animations */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-blue-200 rounded-full mix-blend-multiply filter blur-2xl opacity-60 animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-purple-200 rounded-full mix-blend-multiply filter blur-2xl opacity-60 animate-blob animation-delay-2000"></div>
        <div className="absolute top-[30%] right-[10%] w-[30vw] h-[30vw] bg-pink-200 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob animation-delay-4000"></div>
        <div className="absolute bottom-[20%] left-[20%] w-[25vw] h-[25vw] bg-yellow-100 rounded-full mix-blend-multiply filter blur-2xl opacity-40 animate-blob animation-delay-1000"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-12 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-8"
          >
            <img
              src="https://static.wixstatic.com/media/bfee2e_7d499a9b2c40442e85bb0fa99e7d5d37~mv2.png/v1/fill/w_203,h_111,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo1.png"
              alt="Study Edge Logo"
              className="mx-auto h-28 w-auto drop-shadow-lg"
            />
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-5xl md:text-7xl font-bold text-gray-900 mb-6"
          >
            Welcome to{' '}
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Study Edge
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-xl md:text-2xl text-gray-700 mb-4 max-w-4xl mx-auto leading-relaxed"
          >
            The ultimate comprehensive learning platform designed to transform your{' '}
            <span className="font-semibold text-blue-600">English language skills</span> and{' '}
            <span className="font-semibold text-purple-600">cognitive abilities</span>
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="text-lg text-gray-600 mb-12 max-w-3xl mx-auto"
          >
            From foundational grammar to advanced programming logic, Study Edge offers an immersive learning experience that adapts to your pace and goals.
          </motion.p>

          {/* Urgency Message */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="bg-gradient-to-r from-orange-400 to-red-500 text-white p-6 rounded-2xl mb-12 max-w-4xl mx-auto shadow-xl"
          >
            <h3 className="text-2xl font-bold mb-2">🚀 Ready to Transform Your Skills?</h3>
            <p className="text-lg">
              Join thousands of students already mastering English and critical thinking. 
              <span className="font-bold"> Login now to unlock your personalized learning journey!</span>
            </p>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 w-full"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.4 + index * 0.1 }}
                whileHover={{ 
                  scale: 1.07,
                  boxShadow: '0 8px 32px 0 rgba(0, 120, 255, 0.15), 0 0 40px 10px #a5b4fc',
                  background: 'linear-gradient(120deg, #f0f7ff 60%, #e0e7ff 100%)',
                  transition: { duration: 0.3 }
                }}
                className="group relative"
              >
                <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-blue-200 overflow-hidden">
                  <div className={`text-5xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                  {/* Card lighting effect */}
                  <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-200 rounded-full blur-2xl opacity-40 animate-card-light"></div>
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-200 rounded-full blur-2xl opacity-30 animate-card-light animation-delay-2000"></div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Benefits Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.6 }}
            className="bg-white rounded-3xl p-8 shadow-xl mb-12 max-w-5xl mx-auto"
          >
            <h3 className="text-3xl font-bold text-gray-900 mb-6 text-center">
              Why Choose Study Edge?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 1.8 + index * 0.1 }}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-700">{benefit}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 2 }}
            className="flex flex-col sm:flex-row gap-6 justify-center mb-12"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-10 py-4 text-lg font-bold rounded-2xl text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                🚀 Start Learning Now
              </Link>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 2.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12"
          >
            {[
              { number: '10,000+', label: 'Active Students' },
              { number: '50+', label: 'Learning Modules' },
              { number: '95%', label: 'Success Rate' }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 2.4 + index * 0.2 }}
                className="text-center"
              >
                <div className="text-4xl font-bold text-blue-600 mb-2">{stat.number}</div>
                <div className="text-gray-600">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 2.6 }}
            className="text-gray-500 text-sm"
          >
            <p>© 2025 Study Edge. All rights reserved. | Empowering minds through comprehensive learning.</p>
          </motion.div>
        </motion.div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-1000 {
          animation-delay: 1s;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes card-light {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        .animate-card-light {
          animation: card-light 3s infinite alternate;
        }
      `}</style>
    </div>
  )
}

export default GetStarted 