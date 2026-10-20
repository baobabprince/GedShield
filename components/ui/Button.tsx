import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({ children, icon, variant = 'primary', ...props }) => {
  const baseStyles =
    'w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold tracking-wide rounded-xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#f8f7f3] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

  const variants = {
    primary:
      'bg-[#ac694c] text-white hover:bg-[#93583f] focus:ring-[#b47e59] shadow-[0_2px_8px_#ac694c33]',
    secondary:
      'bg-[#edf1e9] text-[#456352] border border-[#d6e2cd] hover:bg-[#e9f0e5] focus:ring-[#456352]',
  };

  return (
    <button {...props} className={`${baseStyles} ${variants[variant]}`}>
      {icon}
      {children}
    </button>
  );
};

export default Button;
