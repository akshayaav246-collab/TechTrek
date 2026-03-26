"use client";
import { useState, ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { GridIcon, PlusIcon, ListIcon } from '@/components/Icons';

export default function AdminLayout({ children, title, headerActions }: { children: ReactNode, title?: ReactNode, headerActions?: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user || (user.role !== 'admin' && user.role !== 'superAdmin')) return null;

  const closeSidebar = () => setSidebarOpen(false);

  const links = [
    { href: '/admin', label: 'Dashboard', Icon: GridIcon },
    { href: '/admin/create-event', label: 'Create Event', Icon: PlusIcon },
    { href: '/admin/events', label: 'All Events', Icon: ListIcon },
  ];

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex font-body">
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
        <div className="mb-10 flex justify-between items-start">
          <div>
            <p className="text-[#E8831A] text-[10px] font-bold uppercase tracking-widest">TechTrek ⚡</p>
            <p className="text-white font-heading font-extrabold text-lg mt-1 leading-tight">GKT Command<br/>Center</p>
          </div>
          <button onClick={closeSidebar} className="lg:hidden text-gray-400 hover:text-white p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {links.map(item => {
            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} onClick={closeSidebar}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}>
                <item.Icon className="w-4 h-4" />{item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-white/10 pt-4">
          <p className="text-white/60 text-[11px] font-semibold truncate">{user.name}</p>
          <p className="text-white/30 text-[10px] truncate mb-3">{user.email}</p>
          <button onClick={() => { logout(); router.push('/admin/login'); }}
            className="text-xs text-red-400 hover:text-white hover:bg-red-500/30 font-bold transition-all px-3 py-1.5 rounded-lg w-full text-left">
            Sign Out →
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
        {/* Responsive Header */}
        <header className="bg-white border-b border-gray-100 shrink-0 sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <div className="min-w-0 flex-1">
                <div className="font-heading font-extrabold text-xl sm:text-2xl lg:text-3xl text-[#0E1B3D] leading-none truncate">{title || 'Dashboard'}</div>
                {title === 'Dashboard' && <p className="text-gray-400 text-xs mt-1">Welcome back, {user.name.split(' ')[0]}</p>}
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
        <div className="flex-1 overflow-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
