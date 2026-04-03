"use client";
import { useState, ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
  title,
  headerActions,
  backHref,
}: {
  children: ReactNode,
  title?: ReactNode,
  headerActions?: ReactNode,
  backHref?: string,
}) {
  const { user, token, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) return null;
  if (!user || (user.role !== 'admin' && user.role !== 'superAdmin')) return null;

  const closeSidebar = () => setSidebarOpen(false);

  const links: { href: string; label: string; icon: React.ReactNode; badge?: string }[] = [
    { href: '/admin', label: 'Dashboard', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
    ) },
    { href: '/admin/checkin', label: 'Secure Scanner', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 3H5a2 2 0 00-2 2v2m16-4h-2m2 0a2 2 0 012 2v2M3 17v2a2 2 0 002 2h2m12-4v2a2 2 0 01-2 2h-2M8 8h8v8H8z" /></svg>
    ) },
    { href: '/admin/create-event', label: 'Create Event', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
    ) },
    { href: '/admin/ai-studio', label: 'AI Studio', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
    ) },
    { href: '/admin/events', label: 'All Events', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
    ) },
    { href: '#', label: 'Settings', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    ) },
  ];

  const handleLogout = async () => {
    try {
      if (token) {
        await fetch('http://localhost:5000/api/admin/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // Best effort logout; local session is still cleared below.
    } finally {
      logout();
      router.push('/admin/login');
    }
  };

  return (
    <div className="flex h-screen bg-[#0E1B3D] text-white font-body selection:bg-[#C84B11] selection:text-white">
      <style dangerouslySetInnerHTML={{__html: "@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;500;700&family=Syne:wght@800&display=swap');"}}/>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-[#0E1B3D]/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#0E1B3D] text-white flex flex-col py-8 px-5
        transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen lg:shrink-0
        ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
      `}>
        <div className="mb-6 flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#C84B11] rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-[#C84B11]/20">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/></svg>
            </div>
            <div className="flex flex-col">
              <p className="text-white text-[22px] font-heading font-extrabold tracking-widest leading-none mb-1">TechTrek</p>
              <p className="text-[#C84B11] text-[9px] font-bold uppercase tracking-[0.15em]">GKT Command Center</p>
            </div>
          </div>
          <button onClick={closeSidebar} className="lg:hidden text-gray-400 hover:text-white p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>


        <nav className="flex flex-col gap-4 flex-1 mt-2">
          {links.map(item => {
            const active = pathname === item.href || (item.href !== '/admin' && item.href !== '#' && pathname.startsWith(item.href));
            return (
              <Link key={item.label} href={item.href} onClick={item.href !== '#' ? closeSidebar : undefined}
                className={`flex items-center justify-between w-full px-4 py-3.5 rounded-xl text-[14px] font-bold transition-all relative ${
                  active 
                    ? 'bg-white/5 text-white shadow-sm border border-white/5 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-[#C84B11] before:rounded-r-full overflow-hidden' 
                    : 'text-white/60 hover:bg-white/5 hover:text-white border border-transparent'
                }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 transition-colors ${
                    active ? 'bg-[#C84B11] text-white shadow-md shadow-[#C84B11]/30' : 'bg-white/5 text-white/60 group-hover:bg-white/10 group-hover:text-white'
                  }`}>
                    {item.icon}
                  </div>
                  {item.label}
                </div>
                {item.badge && (
                  <span className="bg-[#C84B11] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-white/5 pt-4 mt-auto">
          <div className="text-center mb-4">
            <p className="text-[13px] font-[DM_Sans] font-bold text-white/80">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
          </div>
          <button onClick={handleLogout}
            className="flex items-center justify-center gap-3 w-full bg-white/[0.08] text-white hover:bg-[#C84B11] py-3.5 px-4 rounded-xl font-bold transition-all duration-300 text-xs tracking-widest uppercase border border-white/10 shadow-sm group">
            <svg className="w-4 h-4 flex-shrink-0 text-[#C84B11] group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden bg-[#FAF7F2]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {/* Responsive Header */}
        <header className="bg-[#FAF7F2]/80 backdrop-blur-md border-b border-[#E2D8CC] shrink-0 sticky top-0 z-10 py-6 min-h-[88px] flex items-center">
          <div className="px-4 sm:px-6 lg:px-8 w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 text-[#7A7166] hover:bg-[#E2D8CC]/50 rounded-lg transition-colors shrink-0"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <div className="min-w-0 flex-1 flex items-center gap-3">
                {title !== 'Dashboard' && (
                  <Link href={backHref || "/admin"} className="text-[#C84B11] hover:text-[#E8622A] p-2 bg-[#E2D8CC]/50 rounded-xl transition-colors flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  </Link>
                )}
                <div>
                  <div className="text-[22px] text-[#1C1A17] leading-none truncate" style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800 }}>{title || 'Dashboard'}</div>
                  {title === 'Dashboard' && <p className="text-[#7A7166] tracking-wide text-xs mt-1.5 font-bold font-[DM_Sans] select-none uppercase">Welcome back, {user?.name?.split(' ')[0]}</p>}
                </div>
              </div>
            </div>
            
            {headerActions && (
              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 shrink-0">
                {headerActions}
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto bg-[#FAF7F2]">
          <div className="p-4 sm:p-5 h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}




