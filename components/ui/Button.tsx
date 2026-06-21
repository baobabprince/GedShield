
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({ children, icon, variant = 'primary', ...props }) => {
  const baseStyles = "w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]";
  
  const variants = {
    primary: "bg-cyan-600 text-white hover:bg-cyan-500 hover:shadow-cyan-900/40 focus:ring-cyan-500",
    secondary: "bg-gray-700 text-gray-200 border border-gray-600 hover:bg-gray-600 hover:text-white focus:ring-gray-500"
  };

  return (
    <button
      {...props}
      className={`${baseStyles} ${variants[variant]}`}
    >
      {icon}
      {children}
    </button>
  );
};

export default Button;
