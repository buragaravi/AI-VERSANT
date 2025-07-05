import React from 'react'

const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-28 h-28',
    xl: 'w-36 h-36',
  }
  return (
    <div className={`flex justify-center items-center min-h-[60vh] ${className}`}>
      <div className="relative flex flex-col items-center">
        <img
          src="https://static.wixstatic.com/media/bfee2e_7d499a9b2c40442e85bb0fa99e7d5d37~mv2.png/v1/fill/w_203,h_111,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo1.png"
          alt="Loading..."
          className={`animate-spin-slow animate-pulse ${sizeClasses[size]} drop-shadow-lg`}
          style={{ animationDuration: '2.5s', animationTimingFunction: 'linear' }}
        />
        <div className="mt-4 text-lg text-blue-700 font-semibold animate-pulse">Loading...</div>
      </div>
      <style>{`
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 2.5s linear infinite;
        }
      `}</style>
    </div>
  )
}

export default LoadingSpinner 