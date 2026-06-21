
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-gray-800 bg-opacity-70 backdrop-blur-md rounded-lg shadow-lg border border-gray-700 ${className}`}>
      {children}
    </div>
  );
};

export default Card;