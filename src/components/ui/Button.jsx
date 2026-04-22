import React from 'react';

export const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 shadow-sm",
    secondary: "bg-primary-100 text-primary-800 hover:bg-primary-200 focus:ring-primary-500",
    outline: "border-2 border-primary-500 text-primary-600 hover:bg-primary-50 focus:ring-primary-500",
    ghost: "text-slate-600 hover:bg-slate-100 focus:ring-slate-500",
    danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-sm",
    success: "bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-500 shadow-sm",
  };
  
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-base",
    lg: "px-6 py-3 text-lg space-x-2",
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${sizes[props.size || 'md']} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
