"use client";
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Footer } from '@/components/layout/Footer';
import { Navbar } from '@/components/layout/Navbar';
import { useAuth } from '@/context/AuthContext';

// Paths that never show the student shell
const NO_SHELL_PREFIXES = ['/login', '/signup', '/admin', '/superadmin', '/coordinator'];

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const isStaffRoute = NO_SHELL_PREFIXES.some(p => pathname.startsWith(p));
  const hideFooter = pathname === '/profile';

  // If a student tries accessing /admin or /superadmin redirect them away
  useEffect(() => {
    if (isLoading) return;
    if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
      if (!user) { router.push('/admin/login'); return; }
      if (user.role === 'student') { router.push('/events'); return; }
    }
    if (pathname.startsWith('/superadmin')) {
      if (!user) { router.push('/admin/login'); return; }
      if (user.role !== 'superAdmin') { router.push('/events'); return; }
    }
  }, [pathname, user, isLoading, router]);

  // Also guard: if logged-in staff lands on student pages, redirect them
  useEffect(() => {
    if (isLoading || !user) return;
    const isStudentPage = ['/', '/events', '/profile'].some(p =>
      pathname === p || pathname.startsWith('/events/')
    );
    if (isStudentPage && (user.role === 'admin' || user.role === 'superAdmin')) {
      // Allow viewing events page in read-only mode for staff — no redirect
      // Only redirect if they land on profile or home
      if (pathname === '/profile' || pathname === '/') {
        router.push(user.role === 'superAdmin' ? '/superadmin' : '/admin');
      }
    }
  }, [pathname, user, isLoading, router]);

  // No Navbar/Footer for staff routes or login/signup
  if (isStaffRoute) {
    return <>{children}</>;
  }

  // For staff users on public event pages: render without student Navbar/Footer
  if (user && (user.role === 'admin' || user.role === 'superAdmin')) {
    return (
      <main className="flex-grow pt-0">
        {/* Minimal staff header for event browsing */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#0E1B3D] text-white px-6 py-3 flex justify-between items-center shadow-lg">
          <span className="font-heading font-bold text-base text-white">
            <span className="text-[#e8631a]">TechTrek</span>
            <span className="text-white/50 text-xs font-normal ml-2 uppercase tracking-widest">Events Preview</span>
          </span>
          <button
            onClick={() => router.push(user.role === 'superAdmin' ? '/superadmin' : '/admin')}
            className="bg-[#e8631a] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#d4741a] transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
        <div className="pt-14">
          {children}
        </div>
      </main>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-grow pt-20">
        {children}
      </main>
      {!hideFooter && <Footer />}
    </>
  );
}
