import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent';
}

export function Button({ variant = 'secondary', className = '', children, ...props }: ButtonProps) {
  const baseStyles = 'rounded-xl px-6 py-3 font-bold text-white transition-all';
  
  const variants = {
    primary: 'bg-primary hover:bg-primary/90',
    secondary: 'bg-secondary hover:bg-secondary/90',
    accent: 'bg-accent hover:bg-accent/90',
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
