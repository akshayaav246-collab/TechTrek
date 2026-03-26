import React from 'react';

export function Section({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <section className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-24 ${className}`} {...props}>
      {children}
    </section>
  );
}
