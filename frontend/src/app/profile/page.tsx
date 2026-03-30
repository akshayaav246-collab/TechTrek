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
  _id: string; status: string; qrCode?: string; checkedIn?: boolean; checkedInAt?: string; createdAt: string; hasSubmittedFeedback?: boolean;
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
  const [feedbackTarget, setFeedbackTarget] = useState<EventReg | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const [pwData, setPwData] = useState({ currentPassword: '', newPassword: '' });
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' });
  const [pwLoading, setPwLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwData.newPassword.length < 6) {
      setPwMsg({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }
    setPwLoading(true);
    setPwMsg({ type: '', text: '' });
    try {
      const res = await fetch('http://localhost:5000/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(pwData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPwMsg({ type: 'success', text: 'Password updated successfully!' });
      setPwData({ currentPassword: '', newPassword: '' });
    } catch (err: any) {
      setPwMsg({ type: 'error', text: err.message });
    } finally {
      setPwLoading(false);
    }
  };

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

  const downloadCertificate = (registration: EventReg) => {
    const attendee = displayUser.name;
    const event = registration.event;
    const checkedInDate = registration.checkedInAt
      ? new Date(registration.checkedInAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1131" viewBox="0 0 1600 1131">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fff8ef" />
            <stop offset="100%" stop-color="#f5eee1" />
          </linearGradient>
          <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#e8631a" />
            <stop offset="100%" stop-color="#0E1B3D" />
          </linearGradient>
        </defs>
        <rect width="1600" height="1131" fill="url(#bg)" />
        <rect x="42" y="42" width="1516" height="1047" rx="32" fill="none" stroke="url(#accent)" stroke-width="8" />
        <text x="800" y="170" text-anchor="middle" font-family="Georgia, serif" font-size="34" font-weight="700" fill="#e8631a">TECHTREK</text>
        <text x="800" y="255" text-anchor="middle" font-family="Georgia, serif" font-size="70" font-weight="700" fill="#0E1B3D">Certificate of Participation</text>
        <text x="800" y="355" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="#7A7166">This certifies that</text>
        <text x="800" y="470" text-anchor="middle" font-family="Georgia, serif" font-size="68" font-weight="700" fill="#0E1B3D">${attendee}</text>
        <text x="800" y="560" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="#7A7166">successfully attended and completed participation in</text>
        <text x="800" y="655" text-anchor="middle" font-family="Georgia, serif" font-size="52" font-weight="700" fill="#e8631a">${event.name}</text>
        <text x="800" y="725" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#0E1B3D">${event.collegeName} · ${event.city}</text>
        <text x="800" y="770" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#7A7166">${checkedInDate}</text>
        <line x1="230" y1="940" x2="560" y2="940" stroke="#0E1B3D" stroke-width="3" />
        <line x1="1040" y1="940" x2="1370" y2="940" stroke="#0E1B3D" stroke-width="3" />
        <text x="395" y="980" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" fill="#0E1B3D">TechTrek Team</text>
        <text x="1205" y="980" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" fill="#0E1B3D">Authorized Signatory</text>
      </svg>
    `.trim();

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${registration.event.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-certificate.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackTarget || !token) return;
    setSubmittingFeedback(true);
    try {
      const res = await fetch(`http://localhost:5000/api/events/${feedbackTarget.event.eventId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating: feedbackRating, comment: feedbackComment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit feedback');

      setRegistrations(prev => prev.map(reg => reg._id === feedbackTarget._id ? { ...reg, hasSubmittedFeedback: true } : reg));
      setFeedbackTarget(null);
      setFeedbackComment('');
      setFeedbackRating(5);
    } catch (err: any) {
      alert(err.message || 'Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
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
  ];

  return (
    <div className="min-h-screen bg-background pt-24 pb-16 font-body">
      {feedbackTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-border p-6 sm:p-8 relative">
            <button onClick={() => setFeedbackTarget(null)} className="absolute right-5 top-5 w-9 h-9 rounded-full border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors">
              ×
            </button>
            <p className="text-primary text-xs font-bold uppercase tracking-widest mb-2">Event Feedback</p>
            <h3 className="font-heading font-extrabold text-2xl text-secondary mb-2">{feedbackTarget.event.name}</h3>
            <p className="text-sm text-foreground/60 mb-6">Submit your feedback to unlock your participation certificate.</p>
            <form onSubmit={submitFeedback} className="space-y-5">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-foreground/50 mb-2 block">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      className={`text-3xl transition-transform hover:scale-110 ${feedbackRating >= star ? 'text-primary' : 'text-gray-200'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-foreground/50 mb-2 block">Comment</label>
                <textarea
                  value={feedbackComment}
                  onChange={e => setFeedbackComment(e.target.value)}
                  required
                  rows={4}
                  className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-sm text-secondary outline-none focus:border-primary resize-none"
                  placeholder="Share your experience at this event..."
                />
              </div>
              <button
                type="submit"
                disabled={submittingFeedback}
                className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-[#d4741a] transition-colors disabled:opacity-50"
              >
                {submittingFeedback ? 'Submitting Feedback…' : 'Submit Feedback'}
              </button>
            </form>
          </div>
        </div>
      )}
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

                <div className="mt-8 mb-6 pt-6 border-t border-border">
                  <h3 className="text-[11px] font-bold text-[#e8631a] uppercase tracking-widest mb-4">Change Password</h3>
                  <form onSubmit={handlePasswordChange} className="space-y-3">
                    <input 
                      type="password" 
                      placeholder="Current Password" 
                      value={pwData.currentPassword}
                      onChange={e => setPwData({...pwData, currentPassword: e.target.value})}
                      required
                      className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm text-[#1C1A17] placeholder:text-foreground/40 outline-none focus:border-[#e8631a] transition-colors"
                    />
                    <input 
                      type="password" 
                      placeholder="New Password" 
                      value={pwData.newPassword}
                      onChange={e => setPwData({...pwData, newPassword: e.target.value})}
                      required
                      className="w-full bg-background border border-border/50 rounded-lg px-3 py-2 text-sm text-[#1C1A17] placeholder:text-foreground/40 outline-none focus:border-[#e8631a] transition-colors"
                    />
                    <button 
                      type="submit" 
                      disabled={pwLoading}
                      className="w-full bg-[#0E1B3D] hover:bg-[#1a2d5c] text-white transition-colors py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider disabled:opacity-50"
                    >
                      {pwLoading ? 'Updating…' : 'Update Password'}
                    </button>
                    {pwMsg.text && (
                      <p className={`text-xs font-medium text-center ${pwMsg.type === 'error' ? 'text-[#b91d1d]' : 'text-emerald-600'}`}>
                        {pwMsg.text}
                      </p>
                    )}
                  </form>
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
                <svg className="w-16 h-16 mx-auto mb-4 text-[#e8631a]/80" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" /></svg>
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
                  const canGiveFeedback = evt.status === 'COMPLETED' && reg.checkedIn && !reg.hasSubmittedFeedback;
                  const canDownloadCertificate = evt.status === 'COMPLETED' && reg.checkedIn && reg.hasSubmittedFeedback;

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

                      <div className="flex flex-wrap justify-end gap-2 px-5 py-3 border-t border-border bg-black/[0.02]">
                        {canGiveFeedback && (
                          <button
                            onClick={() => setFeedbackTarget(reg)}
                            className="text-xs font-bold px-3 py-2 rounded-lg bg-primary text-white hover:bg-[#d4741a] transition-colors"
                          >
                            Give Feedback
                          </button>
                        )}
                        {canDownloadCertificate && (
                          <button
                            onClick={() => downloadCertificate(reg)}
                            className="text-xs font-bold px-3 py-2 rounded-lg border border-secondary text-secondary hover:bg-secondary hover:text-white transition-colors"
                          >
                            Download Certificate
                          </button>
                        )}
                        <Link href={`/events/${evt.eventId}`} className="text-primary text-xs font-bold hover:underline px-1 py-2">
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
