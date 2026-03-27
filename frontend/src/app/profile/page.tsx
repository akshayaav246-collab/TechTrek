"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type FreshUser = {
  _id: string; name: string; email: string; college: string;
  year?: string; discipline?: string; phone?: string; domain?: string; role?: string;
};

type EventReg = {
  _id: string; status: string; qrCode?: string; checkedIn?: boolean; createdAt: string;
  event: { eventId: string; name: string; collegeName: string; city: string; venue: string; dateTime: string; status: string };
};

const statusColor = (s: string) => {
  if (s === 'REGISTERED') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s === 'WAITLISTED') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (s === 'CHECKED_IN') return 'bg-blue-100 text-blue-700 border-blue-200';
  return 'bg-gray-100 text-gray-500';
};

// ── SVG Icons (outline, theme-colored) ─────────────────────────────────────
const IconCollege = () => (
  <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3L2 9l10 6 10-6-10-6zM2 17l10 6 10-6M2 13l10 6 10-6" />
  </svg>
);
const IconDiscipline = () => (
  <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2h-4M9 3a2 2 0 002 2h2a2 2 0 002-2M9 3a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);
const IconYear = () => (
  <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round"/>
    <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round"/>
    <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round"/>
  </svg>
);
const IconPhone = () => (
  <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);
const IconDomain = () => (
  <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeLinecap="round"/>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
  </svg>
);

const yearSuffix = (y: string) => { const n = parseInt(y); return ['st','nd','rd'][n-1] || 'th'; };

export default function ProfilePage() {
  const { user: ctxUser, token, logout } = useAuth();
  const router = useRouter();
  const [user, setUser] = useState<FreshUser | null>(null);
  const [registrations, setRegistrations] = useState<EventReg[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQR, setExpandedQR] = useState<string | null>(null);

  useEffect(() => {
    if (!ctxUser || !token) { router.push('/login?redirect=/profile'); return; }

    // Fetch fresh user data from DB (fixes stale localStorage)
    const fetchAll = async () => {
      try {
        const [meRes, regsRes] = await Promise.all([
          fetch('http://localhost:5000/api/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('http://localhost:5000/api/registrations/my', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (meRes.ok) setUser(await meRes.json());
        if (regsRes.ok) setRegistrations(await regsRes.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchAll();
  }, [ctxUser, token, router]);

  const downloadQR = (qrCode: string, eventId: string) => {
    const a = document.createElement('a'); a.href = qrCode;
    a.download = `techtrek-ticket-${eventId}.png`; a.click();
  };

  if (!ctxUser) return null;
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="font-bold text-secondary text-xl animate-pulse">Loading profile…</p>
    </div>
  );

  const initials = (user?.name ?? ctxUser.name).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const displayUser = user || ctxUser;
  const yearNum = displayUser.year || '';

  const profileFields = [
    { label: 'College', value: displayUser.college, Icon: IconCollege },
    { label: 'Discipline', value: displayUser.discipline, Icon: IconDiscipline },
    { label: 'Year', value: yearNum ? `${yearNum}${yearSuffix(yearNum)} Year` : undefined, Icon: IconYear },
    { label: 'Phone', value: displayUser.phone, Icon: IconPhone },
    { label: 'Email Domain', value: displayUser.domain ? `@${displayUser.domain}` : undefined, Icon: IconDomain },
  ];

  return (
    <div className="min-h-screen bg-background pt-24 pb-16 font-body">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Page header */}
        <div className="mb-10">
          <p className="text-primary text-xs font-bold uppercase tracking-widest mb-1">My Account</p>
          <h1 className="font-heading font-extrabold text-4xl md:text-5xl text-secondary">Student Profile</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">

          {/* ── Profile Card ──────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden">
              {/* Banner */}
              <div className="h-20 bg-secondary relative overflow-hidden">
                <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 400 80" preserveAspectRatio="none">
                  <circle cx="50" cy="40" r="70" stroke="#e8631a" strokeWidth="1" fill="none"/>
                  <circle cx="370" cy="40" r="55" stroke="white" strokeWidth="1" fill="none"/>
                  <circle cx="200" cy="80" r="80" stroke="#e8631a" strokeWidth="0.5" fill="none"/>
                </svg>
              </div>
              
              <div className="px-6 pb-6 -mt-8 relative">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-[#b91d1d] flex items-center justify-center text-white font-extrabold text-xl shadow-lg border-4 border-card mb-4">
                  {initials}
                </div>
                <h2 className="font-heading font-bold text-xl text-secondary leading-tight">{displayUser.name}</h2>
                <p className="text-foreground/50 text-xs mt-0.5 font-medium">{displayUser.email}</p>

                {/* Fields */}
                <div className="mt-5 divide-y divide-border">
                  {profileFields.map(({ label, value, Icon }) => (
                    <div key={label} className="flex items-start gap-3 py-3">
                      <Icon />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-0.5">{label}</p>
                        <p className="text-sm font-semibold text-secondary truncate">{value || <span className="text-foreground/30 font-normal italic">Not set</span>}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => { logout(); router.push('/'); }}
                  className="mt-5 w-full border-2 border-[#b91d1d]/25 text-[#b91d1d] hover:bg-[#b91d1d] hover:text-white transition-all py-2.5 rounded-xl font-bold text-sm"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* ── Tickets ───────────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading font-bold text-2xl text-secondary">My Tickets</h2>
              <Link href="/events" className="text-primary text-sm font-bold hover:underline">Browse Events →</Link>
            </div>

            {registrations.length === 0 ? (
              <div className="text-center py-20 bg-card border border-dashed border-border rounded-3xl">
                <span className="text-5xl block mb-4">🎫</span>
                <h3 className="font-bold text-xl text-secondary mb-2">No tickets yet</h3>
                <p className="text-foreground/60 mb-6 text-sm">Register for a TechTrek summit to see your tickets here.</p>
                <Link href="/events" className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#d4741a] transition-colors">
                  Explore Events
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {registrations.map(reg => {
                  const evt = reg.event;
                  const dateStr = new Date(evt.dateTime).toLocaleDateString('en-IN', {
                    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                  });

                  return (
                    <div key={reg._id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-wrap items-start justify-between gap-4 p-5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${statusColor(reg.status)}`}>
                              {reg.status.replace('_', ' ')}
                            </span>
                            {reg.checkedIn && (
                              <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200">✓ Checked In</span>
                            )}
                          </div>
                          <h3 className="font-heading font-bold text-lg text-secondary leading-snug">{evt.name}</h3>
                          <p className="text-foreground/60 text-sm">{evt.collegeName} · {evt.city}</p>
                          <p className="text-foreground/50 text-xs mt-1 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                            </svg>
                            {dateStr}
                          </p>
                        </div>

                        {/* QR thumbnail */}
                        {reg.qrCode && reg.status === 'REGISTERED' && (
                          <button
                            onClick={() => setExpandedQR(expandedQR === reg._id ? null : reg._id)}
                            className="shrink-0 bg-white p-1.5 rounded-xl border-2 border-secondary/40 shadow hover:border-secondary transition-all"
                            title="View QR ticket"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={reg.qrCode} alt="QR" className="w-14 h-14 rounded-lg" />
                          </button>
                        )}
                      </div>

                      {/* Expanded QR */}
                      {expandedQR === reg._id && reg.qrCode && (
                        <div className="px-5 pb-5 border-t border-border pt-4 flex flex-col items-center">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-3">Show at venue for entry</p>
                          <div className="bg-[#FAF8F4] p-3 rounded-2xl border-2 border-[#0E1B3D] shadow-lg mb-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={reg.qrCode} alt="QR Code" className="w-48 h-48 rounded-xl" />
                          </div>
                          <button
                            onClick={() => downloadQR(reg.qrCode!, evt.eventId)}
                            className="flex items-center gap-2 border-2 border-secondary text-secondary hover:bg-secondary hover:text-white transition-all px-5 py-2 rounded-xl font-bold text-sm"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                            Download Ticket
                          </button>
                        </div>
                      )}

                      <div className="flex justify-end px-5 py-2.5 border-t border-border bg-black/[0.02]">
                        <Link href={`/events/${evt.eventId}`} className="text-primary text-xs font-bold hover:underline">
                          View Event →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
