import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`bg-[#fefefb] border border-[#e7e8e0] shadow-[0_4px_18px_#29392f14] backdrop-blur-sm rounded-2xl ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
