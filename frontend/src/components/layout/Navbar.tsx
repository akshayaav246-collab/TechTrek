"use client";

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => { 
    logout(); 
    setIsMenuOpen(false);
    router.push('/'); 
  };

  const getNavClass = (path: string) => {
    const isActive = pathname === path;
    const base = "font-medium text-[15px] border px-5 py-2 rounded-full transition-all duration-300";
    return isActive 
      ? `${base} text-[#e8631a] border-[#e8631a] bg-[#e8631a]/10` 
      : `${base} text-foreground hover:text-[#e8631a] border-transparent hover:border-[#e8631a] hover:bg-[#e8631a]/10`;
  };

  const getMobileNavClass = (path: string) => {
    const isActive = pathname === path;
    const base = "font-medium text-lg border rounded-full px-5 py-2 transition-all";
    return isActive 
      ? `${base} text-[#e8631a] border-[#e8631a] bg-[#e8631a]/10` 
      : `${base} text-foreground hover:text-[#e8631a] border-transparent hover:border-[#e8631a] hover:bg-[#e8631a]/10`;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-20">
        <Link href="/" onClick={() => setIsMenuOpen(false)} className="font-heading font-semibold text-2xl tracking-tight text-[#e8631a] flex items-center">
          TechTrek 2026
        </Link>
        <div className="hidden md:flex flex-1 justify-end">
          <nav className="flex gap-2 items-center">
            <Link href="/" className={getNavClass('/')}>Home</Link>
            <Link href="/events" className={getNavClass('/events')}>Events</Link>
            {user ? (
              <div className="flex items-center gap-4 ml-4">
                <Link href="/profile" className="font-bold text-secondary text-sm bg-black/5 px-3 py-1.5 rounded-lg border border-black/5 flex items-center gap-2 hover:border-[#e8631a] hover:text-[#e8631a] transition-all duration-300">
                  <span className="w-5 h-5 rounded-full bg-[#e8631a] text-white flex items-center justify-center text-[10px]">{user.name.charAt(0)}</span>
                  {user.name.split(' ')[0]}
                </Link>
                <button onClick={handleLogout} className="font-medium text-foreground/70 hover:text-[#b91d1d] hover:bg-[#b91d1d]/10 px-3 py-1.5 rounded-lg transition-colors">Logout</button>
              </div>
            ) : (
              <Link href={`/login?redirect=${pathname}`} className={getNavClass('/login') + " ml-2"}>SignUp/Login</Link>
            )}
          </nav>
        </div>
        <button 
          className="md:hidden p-2 text-foreground ml-auto hover:text-primary transition-colors" 
          aria-label="Toggle Menu"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border bg-background shadow-lg absolute w-full top-20 left-0">
          <nav className="flex flex-col px-4 pt-2 pb-6 gap-2">
            <Link href="/" onClick={() => setIsMenuOpen(false)} className={getMobileNavClass('/')}>Home</Link>
            <Link href="/events" onClick={() => setIsMenuOpen(false)} className={getMobileNavClass('/events')}>Events</Link>
            {user ? (
              <div className="flex flex-col gap-2 pt-2 px-2">
                <Link href="/profile" onClick={() => setIsMenuOpen(false)} className="font-bold text-secondary text-base bg-black/5 px-4 py-3 rounded-xl border border-black/5 flex items-center gap-3 hover:border-[#e8631a] hover:text-[#e8631a] transition-colors mt-2">
                  <span className="w-8 h-8 rounded-full bg-[#e8631a] text-white flex items-center justify-center text-sm">{user.name.charAt(0)}</span>
                  {user.name}
                </Link>
                <button onClick={handleLogout} className="font-medium text-left text-foreground/70 hover:text-[#b91d1d] hover:bg-[#b91d1d]/10 px-4 py-3 rounded-xl transition-colors">Logout</button>
              </div>
            ) : (
              <Link href={`/login?redirect=${pathname}`} onClick={() => setIsMenuOpen(false)} className={getMobileNavClass('/login') + " mt-2"}>SignUp / Login</Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
