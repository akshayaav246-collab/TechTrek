import type { ReactNode } from 'react';
import { Navbar } from '@/components/layout/Navbar';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      <Navbar />
      <main className="flex-1 pt-20 relative flex overflow-hidden w-full">
        {children}
      </main>
    </div>
  );
}
