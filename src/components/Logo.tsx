import React from 'react';

export const Logo: React.FC = () => {
  return (
    <div className="w-10 h-10 bg-[#141924] border border-[rgba(255,255,255,0.07)] rounded-xl flex items-center justify-center relative shadow-md">
      <svg className="w-8 h-8" viewBox="0 0 100 100" aria-label="SchoolOps AI Logo">
        <defs>
          <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="55%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#14B8A6" />
          </linearGradient>
        </defs>
        
        {/* Robot Face Circle */}
        <circle cx="50" cy="58" r="21" fill="none" stroke="url(#logoGrad)" strokeWidth="3.5" />
        {/* Eyes */}
        <circle cx="42" cy="54" r="3" fill="url(#logoGrad)" />
        <circle cx="58" cy="54" r="3" fill="url(#logoGrad)" />
        {/* Smile */}
        <path d="M 41 64 Q 50 71 59 64" fill="none" stroke="url(#logoGrad)" strokeWidth="2.5" strokeLinecap="round" />
        
        {/* Graduation Cap */}
        {/* Diamond Top */}
        <polygon points="50,15 78,26 50,37 22,26" fill="url(#logoGrad)" />
        {/* Cap base */}
        <path d="M 34,31 Q 34,40 50,40 Q 66,40 66,31" fill="none" stroke="url(#logoGrad)" strokeWidth="2.5" strokeLinecap="round" />
        {/* Tassel */}
        <path d="M 50,26 L 24,34 L 24,47" fill="none" stroke="url(#logoGrad)" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="24" cy="49" r="2" fill="url(#logoGrad)" />
      </svg>
    </div>
  );
};
