import React from 'react'

const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    sm: { logo: 'w-12 h-12', bg: 'w-20 h-20', spinner: 'w-32 h-32', svg: 128, r: 54, stroke: 8 },
    md: { logo: 'w-16 h-16', bg: 'w-28 h-28', spinner: 'w-44 h-44', svg: 176, r: 74, stroke: 10 },
    lg: { logo: 'w-24 h-24', bg: 'w-40 h-40', spinner: 'w-60 h-60', svg: 240, r: 102, stroke: 14 },
    xl: { logo: 'w-32 h-32', bg: 'w-56 h-56', spinner: 'w-80 h-80', svg: 320, r: 142, stroke: 18 },
  }
  const { logo, bg, spinner, svg, r, stroke } = sizeMap[size] || sizeMap['md']
  return (
    <div className={`flex justify-center items-center min-h-[60vh] ${className}`}>
      <div className="relative flex flex-col items-center">
        <div className={`relative flex items-center justify-center ${spinner}`} style={{ width: `${svg}px`, height: `${svg}px` }}>
          <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin-modern" width={svg} height={svg} viewBox={`0 0 ${svg} ${svg}`} fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="modern-spinner-gradient" x1="0" y1="0" x2={svg} y2={svg} gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1" />
                <stop offset="1" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            <circle cx={svg/2} cy={svg/2} r={r} stroke="url(#modern-spinner-gradient)" strokeWidth={stroke} fill="none" />
          </svg>
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full shadow-lg flex items-center justify-center ${bg}`}></div>
          <img
            src="https://static.wixstatic.com/media/bfee2e_7d499a9b2c40442e85bb0fa99e7d5d37~mv2.png/v1/fill/w_203,h_111,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo1.png"
            alt="Loading..."
            className={`relative z-10 ${logo}`}
            style={{ objectFit: 'contain' }}
          />
        </div>
        <div className="mt-6 text-lg text-blue-700 font-semibold animate-pulse">Loading...</div>
      </div>
      <style>{`
        @keyframes spin-modern {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }
        .animate-spin-modern {
          animation: spin-modern 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  )
}

export default LoadingSpinner 