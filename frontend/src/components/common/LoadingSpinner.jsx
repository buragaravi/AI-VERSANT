import React from 'react'

const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    sm: { logo: 'w-16 h-16', spinner: 'w-24 h-24' },
    md: { logo: 'w-24 h-24', spinner: 'w-32 h-32' },
    lg: { logo: 'w-32 h-32', spinner: 'w-44 h-44' },
    xl: { logo: 'w-40 h-40', spinner: 'w-56 h-56' },
  }
  const { logo, spinner } = sizeMap[size] || sizeMap['md']
  return (
    <div className={`flex justify-center items-center min-h-[60vh] ${className}`}>
      <div className="relative flex flex-col items-center">
        <div className={`relative ${spinner} flex items-center justify-center`}>
          <img
            src="https://static.wixstatic.com/media/bfee2e_7d499a9b2c40442e85bb0fa99e7d5d37~mv2.png/v1/fill/w_203,h_111,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo1.png"
            alt="Loading..."
            className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 drop-shadow-lg ${logo}`}
          />
          <svg className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-spin-slow" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="44" stroke="#6366f1" strokeWidth="8" fill="none" strokeDasharray="62.8 62.8" strokeLinecap="round"/>
            <circle cx="50" cy="50" r="36" stroke="#06b6d4" strokeWidth="4" fill="none" strokeDasharray="40 40" strokeDashoffset="20"/>
          </svg>
        </div>
        <div className="mt-6 text-lg text-blue-700 font-semibold animate-pulse">Loading...</div>
      </div>
      <style>{`
        @keyframes spin-slow {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  )
}

export default LoadingSpinner 