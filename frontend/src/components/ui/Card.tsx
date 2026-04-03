import React from 'react';

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`bg-card rounded-3xl border border-border shadow-sm p-8 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
