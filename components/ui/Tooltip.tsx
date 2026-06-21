
import React, { useState, ReactNode } from 'react';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className="absolute bottom-full mb-2 w-64 p-3 bg-gray-900 text-gray-200 text-sm rounded-lg shadow-2xl border border-gray-700 z-50 text-start leading-relaxed"
          style={{ 
            left: '50%', 
            transform: 'translateX(-50%)',
            pointerEvents: 'none'
          }}
        >
          {content}
          <div 
            className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0" 
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #374151'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Tooltip;
