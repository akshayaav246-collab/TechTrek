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
  _id: string; status: string; qrCode?: string; checkedIn?: boolean; checkedInAt?: string;
  createdAt: string; hasSubmittedFeedback?: boolean; cancelledAt?: string; refundStatus?: string;
  selectedDays?: number[]; totalAmountPaid?: number;
  event: { eventId: string; name: string; collegeName: string; city: string; venue: string; dateTime: string; status: string; amount?: number };
};

const statusColor = (s: string) => {
  if (s === 'REGISTERED') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s === 'WAITLISTED') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (s === 'CHECKED_IN') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (s === 'CANCELLED') return 'bg-red-100 text-red-600 border-red-200';
  return 'bg-gray-100 text-gray-500';
};

const refundBadge = (status?: string) => {
  if (!status || status === 'NOT_APPLICABLE') return null;
  if (status === 'PENDING') return { label: 'Refund Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (status === 'PROCESSED') return { label: 'Refund Processed', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (status === 'FAILED') return { label: 'Refund Failed', cls: 'bg-red-50 text-red-700 border-red-200' };
  return null;
};

// Helper: is cancellation still allowed? (before 12 AM on event day)
const isCancellable = (reg: EventReg): boolean => {
  if (!['REGISTERED', 'WAITLISTED'].includes(reg.status)) return false;
  if (reg.event.status !== 'UPCOMING') return false;
  const eventDay = new Date(reg.event.dateTime);
  eventDay.setHours(0, 0, 0, 0); // midnight = deadline
  return new Date() < eventDay;
};

// ── SVG Icons ───────────────────────────────────────────────────────────────
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

const yearSuffix = (y: string) => { const n = parseInt(y); return ['st','nd','rd'][n-1] || 'th'; };

// ── Cancellation Policy Modal ────────────────────────────────────────────────
function CancelModal({
  reg, onClose, onConfirm, loading,
}: {
  reg: EventReg; onClose: () => void; onConfirm: () => void; loading: boolean;
}) {
  const eventAmount = reg.event.amount || 500;
  const cancellationFee = 100;
  const dayCount = reg.selectedDays && reg.selectedDays.length > 0 ? reg.selectedDays.length : 1;
  const totalPaid = reg.totalAmountPaid || (eventAmount * dayCount);
  const refundAmount = Math.max(0, (eventAmount - cancellationFee) * dayCount); // ₹400 × days
  const totalFee = cancellationFee * dayCount;
  const isWaitlisted = reg.status === 'WAITLISTED';
  const isMultiDay = dayCount > 1;
  const eventDate = new Date(reg.event.dateTime);
  const deadlineStr = eventDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-red-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-white text-lg leading-tight">Cancel Registration</h3>
              <p className="text-red-100 text-xs mt-0.5">{reg.event.name}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Cancellation Policy */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-3">Cancellation Policy</p>
            {isWaitlisted ? (
              <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="font-bold mb-1">No payment was collected</p>
                <p className="text-blue-600 text-xs">You are on the waitlist, so your entry will simply be removed. No refund is applicable.</p>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                {isMultiDay && reg.selectedDays && (
                  <div className="flex items-center justify-between text-[#0E1B3D]">
                    <span className="text-gray-500">Days Selected</span>
                    <span className="font-bold">Day {reg.selectedDays.sort((a,b)=>a-b).join(', ')}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Paid {isMultiDay ? `(₹${eventAmount} × ${dayCount} days)` : ''}</span>
                  <span className="font-bold text-gray-800">₹{totalPaid}</span>
                </div>
                <div className="flex items-center justify-between text-red-600">
                  <span>Cancellation Fee {isMultiDay ? `(₹${cancellationFee} × ${dayCount} days)` : ''}</span>
                  <span className="font-bold">− ₹{totalFee}</span>
                </div>
                <div className="h-px bg-amber-200 my-1" />
                <div className="flex items-center justify-between text-emerald-700">
                  <span className="font-bold">Refund Amount</span>
                  <span className="font-extrabold text-base">₹{refundAmount}</span>
                </div>
              </div>
            )}
          </div>

          {!isWaitlisted && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600 space-y-2">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span>Refund of <strong>₹{refundAmount}</strong> will be credited to your original payment method within <strong>5–7 business days</strong>.</span>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                <span>Deadline: Cancellations only allowed <strong>before 12:00 AM on {deadlineStr}</strong>. After that, no cancellations are permitted.</span>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                <span>Your seat will be freed and offered to the next student on the waitlist.</span>
              </div>
            </div>
          )}

          <p className="text-xs text-center text-gray-400">This action cannot be undone. Are you sure?</p>

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Go Back
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Cancelling…
                </>
              ) : 'Confirm Cancellation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user: ctxUser, token, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [user, setUser] = useState<FreshUser | null>(null);
  const [registrations, setRegistrations] = useState<EventReg[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQR, setExpandedQR] = useState<string | null>(null);
  const [feedbackTarget, setFeedbackTarget] = useState<EventReg | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const [activeTab, setActiveTab] = useState<'tickets' | 'certs'>('tickets');

  // Cancellation state
  const [cancelTarget, setCancelTarget] = useState<EventReg | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState<{ regId: string; message: string } | null>(null);

  const [pwData, setPwData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' });
  const [pwLoading, setPwLoading] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwData.newPassword !== pwData.confirmPassword) {
      setPwMsg({ type: 'error', text: 'Passwords do not match.' });
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
      setPwData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setPwMsg({ type: 'error', text: err.message });
    } finally {
      setPwLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!ctxUser || !token) { router.push('/login?redirect=/profile'); return; }

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
  }, [ctxUser, token, router, authLoading]);

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

    // Multi-day: build attendance string
    const hasSelectedDays = registration.selectedDays && registration.selectedDays.length > 0;
    const attendanceText = hasSelectedDays
      ? `Day${registration.selectedDays!.length > 1 ? 's' : ''} ${registration.selectedDays!.sort((a, b) => a - b).join(' & ')} of`
      : 'participated in';
    const attendanceLine2 = hasSelectedDays
      ? `successfully attended ${attendanceText}`
      : 'successfully attended and completed participation in';

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
        <text x="800" y="560" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" fill="#7A7166">${attendanceLine2}</text>
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

  const handleCancelConfirm = async () => {
    if (!cancelTarget || !token) return;
    setCancelling(true);
    try {
      const res = await fetch(`http://localhost:5000/api/registrations/${cancelTarget._id}/cancel`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Cancellation failed.');

      setRegistrations(prev => prev.map(reg =>
        reg._id === cancelTarget._id
          ? { ...reg, status: 'CANCELLED', cancelledAt: new Date().toISOString(), refundStatus: reg.status === 'REGISTERED' ? 'PENDING' : 'NOT_APPLICABLE' }
          : reg
      ));
      setCancelSuccess({ regId: cancelTarget._id, message: data.message });
      setCancelTarget(null);
    } catch (err: any) {
      alert(err.message || 'Cancellation failed. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading || authLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="font-bold text-secondary text-xl animate-pulse">Loading profile…</p>
    </div>
  );
  if (!ctxUser) return null;

  const initials = (user?.name ?? ctxUser.name).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const displayUser = user || ctxUser;
  const yearNum = displayUser.year || '';

  const profileFields = [
    { label: 'College', value: displayUser.college, Icon: IconCollege },
    { label: 'Discipline', value: displayUser.discipline, Icon: IconDiscipline },
    { label: 'Year', value: yearNum ? `${yearNum}${yearSuffix(yearNum)} Year` : undefined, Icon: IconYear },
    { label: 'Phone', value: displayUser.phone, Icon: IconPhone },
  ];

  const numTickets = registrations.filter(r => r.event).length;
  const numCerts = registrations.filter(r => r.event?.status === 'COMPLETED' && r.checkedIn && r.hasSubmittedFeedback).length;
  const numAttended = registrations.filter(r => r.checkedIn && r.event).length;

  const validRegs = registrations.filter(r => r.event);
  const filteredRegs = activeTab === 'certs' 
    ? validRegs.filter(r => r.event.status === 'COMPLETED' && r.checkedIn && r.hasSubmittedFeedback)
    : validRegs;

  return (
    <div className="min-h-screen bg-background pt-4 pb-10 font-body lg:h-[calc(100vh-5rem)] lg:min-h-0 lg:overflow-hidden">

      {/* ── Cancellation Policy Modal ── */}
      {cancelTarget && (
        <CancelModal
          reg={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={handleCancelConfirm}
          loading={cancelling}
        />
      )}

      {/* ── Feedback Modal ── */}
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
                    <button key={star} type="button" onClick={() => setFeedbackRating(star)}
                      className={`text-3xl transition-transform hover:scale-110 ${feedbackRating >= star ? 'text-primary' : 'text-gray-200'}`}>★</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-foreground/50 mb-2 block">Comment</label>
                <textarea value={feedbackComment} onChange={e => setFeedbackComment(e.target.value)} required rows={4}
                  className="w-full bg-background border border-border rounded-2xl px-4 py-3 text-sm text-secondary outline-none focus:border-primary resize-none"
                  placeholder="Share your experience at this event..." />
              </div>
              <button type="submit" disabled={submittingFeedback}
                className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-[#d4741a] transition-colors disabled:opacity-50">
                {submittingFeedback ? 'Submitting Feedback…' : 'Submit Feedback'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 lg:h-full">

        <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)] gap-10 xl:gap-14 items-start mt-6 lg:mt-0 lg:h-full">

          {/* ── Left Sidebar / Profile Card ──────────────────────────── */}
          <div className="lg:h-full lg:overflow-hidden lg:py-6">
            <div className="bg-card w-full rounded-none lg:rounded-3xl lg:border border-border lg:shadow-sm overflow-hidden pb-4 lg:h-full">
              
              <div className="px-2 lg:px-6 pt-4 lg:pt-8">
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-2xl shadow-lg mb-4">
                  {initials}
                </div>
                <h2 className="font-heading font-extrabold text-3xl text-secondary leading-tight tracking-tight">{displayUser.name.toUpperCase()}</h2>
                <p className="text-secondary/70 text-sm mt-1 font-bold">{displayUser.email}</p>
                
                <div className="mt-6 space-y-3.5">
                  {profileFields.map(({ label, value, Icon }) => (
                    <div key={label} className="flex flex-col">
                      <p className="text-[11px] font-black uppercase tracking-widest text-secondary/50 mb-0.5">{label}</p>
                      <p className="text-[14px] font-bold text-secondary flex items-center gap-2">
                        {value || <span className="text-secondary/40 font-normal italic">Not set</span>}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Change Password */}
                <div className="mt-6 pt-2 border-t border-border">
                  <p className="text-[12px] font-black uppercase tracking-widest text-secondary mb-4">Change Password</p>
                  <form onSubmit={handlePasswordChange} className="space-y-3">
                    <input type="password" placeholder="Current password" value={pwData.currentPassword}
                      onChange={e => setPwData({...pwData, currentPassword: e.target.value})} required
                      className="w-full bg-background border border-border/70 rounded-lg px-4 py-2.5 text-[13px] text-[#1C1A17] placeholder:text-foreground/40 outline-none focus:border-[#e8631a] transition-colors" />
                    <input type="password" placeholder="New password" value={pwData.newPassword}
                      onChange={e => setPwData({...pwData, newPassword: e.target.value})} required
                      className="w-full bg-background border border-border/70 rounded-lg px-4 py-2.5 text-[13px] text-[#1C1A17] placeholder:text-foreground/40 outline-none focus:border-[#e8631a] transition-colors" />
                    <input type="password" placeholder="Confirm password" value={pwData.confirmPassword}
                      onChange={e => setPwData({...pwData, confirmPassword: e.target.value})} required
                      className="w-full bg-background border border-border/70 rounded-lg px-4 py-2.5 text-[13px] text-[#1C1A17] placeholder:text-foreground/40 outline-none focus:border-[#e8631a] transition-colors" />
                    <button type="submit" disabled={pwLoading}
                      className="w-full bg-primary hover:bg-[#d4741a] text-white transition-colors py-3 mt-2 rounded-xl font-black text-[11px] uppercase tracking-widest disabled:opacity-50">
                      {pwLoading ? 'Updating…' : 'Update Password'}
                    </button>
                    {pwMsg.text && (
                      <p className={`text-xs font-medium text-center mt-2 ${pwMsg.type === 'error' ? 'text-[#b91d1d]' : 'text-emerald-600'}`}>{pwMsg.text}</p>
                    )}
                  </form>
                </div>

              </div>
            </div>
          </div>

          {/* ── Main Work Area: Registrations ───────────────────────── */}
          <div className="w-full pt-1 lg:pl-4 lg:min-h-0 lg:overflow-y-auto lg:py-6 lg:pr-2">
            
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/50 pb-6 mb-8">
              <div>
                <h1 className="font-heading font-black text-4xl sm:text-5xl text-secondary tracking-tight">
                  MY REGISTRATIONS
                </h1>
              </div>
              <Link href="/events" className="shrink-0 bg-primary hover:bg-[#d4741a] text-white px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                Browse Events →
              </Link>
            </div>

            {/* Content Tabs */}
            <div className="flex items-center gap-8 border-b border-border mb-8">
              <button 
                onClick={() => setActiveTab('tickets')}
                className={`pb-4 text-sm font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'tickets' ? 'border-primary text-primary' : 'border-transparent text-foreground/50 hover:text-secondary'}`}
              >
                My Tickets
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${activeTab === 'tickets' ? 'bg-primary text-white' : 'bg-border text-foreground/70'}`}>{numTickets}</span>
              </button>
              <button 
                onClick={() => setActiveTab('certs')}
                className={`pb-4 text-sm font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'certs' ? 'border-primary text-primary' : 'border-transparent text-foreground/50 hover:text-secondary'}`}
              >
                My Certificates
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${activeTab === 'certs' ? 'bg-primary text-white' : 'bg-border text-foreground/70'}`}>{numCerts}</span>
              </button>
            </div>

            {filteredRegs.length === 0 ? (
              <div className="text-center py-20 bg-card border border-dashed border-border rounded-3xl">
                <svg className="w-16 h-16 mx-auto mb-4 text-primary/80" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                </svg>
                <h3 className="font-bold text-xl text-secondary mb-2">No items found</h3>
                <p className="text-foreground/60 mb-6 text-sm">You dont have any {activeTab === 'certs' ? 'certificates' : 'tickets'} yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredRegs.map(reg => {
                  const evt = reg.event;
                  const dateStr = new Date(evt.dateTime).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                  const isCompleted = evt.status === 'COMPLETED';
                  const canCancel = isCancellable(reg);
                  const refund = reg.status === 'CANCELLED' ? refundBadge(reg.refundStatus) : null;
                  const isJustCancelled = cancelSuccess?.regId === reg._id;

                  // Derive primary status string / colors
                  let visualStatus = reg.status.replace('_', ' ');
                  let visualStatusColor = statusColor(reg.status);
                  if (reg.checkedIn) {
                    visualStatus = 'ATTENDED';
                    visualStatusColor = 'bg-blue-50 text-blue-700 border-blue-200';
                  }

                  return (
                    <div key={reg._id} className={`bg-card/40 border-2 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col ${reg.status === 'CANCELLED' ? 'border-red-200/50 opacity-80' : 'border-border'}`}>
                      <div className="p-6 flex-1 flex flex-col">
                        
                        {/* Card Top: Badges & QR Graphic */}
                        <div className="flex items-start justify-between mb-5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded border ${visualStatusColor}`}>
                              {visualStatus}
                            </span>
                            {refund && (
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded border ${refund.cls}`}>{refund.label}</span>
                            )}
                          </div>
                          
                          {reg.qrCode && reg.status === 'REGISTERED' && (
                            <button onClick={() => setExpandedQR(expandedQR === reg._id ? null : reg._id)} className="shrink-0 hover:scale-110 transition-transform">
                              <svg className="w-8 h-8 text-black" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 3h8v8H3zm2 2v4h4V5zM13 3h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zM13 13h2v2h-2zm4 0h4v2h-4zm0 4h2v4h-2zm-4 2h2v2h-2zm2-2h2v2h-2z"/>
                              </svg>
                            </button>
                          )}
                        </div>

                        {/* Card Middle: Content */}
                        <div className="flex-1">
                          <h3 className="font-heading font-black text-xl md:text-2xl text-secondary leading-snug tracking-tight mb-2 pr-4">
                            {evt.name.replace(/techtrek/gi, 'TechTrek').toUpperCase() === 'TECHTREK' ? 'TechTrek' : evt.name.replace(/TECHTREK/gi, 'TechTrek')}
                          </h3>
                          <p className="text-secondary/70 text-sm font-bold leading-snug pr-4">{evt.collegeName} · {evt.city}</p>
                          <p className="text-secondary/60 text-sm mt-3 flex items-center gap-1.5 font-bold">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                            </svg>
                            {dateStr}
                          </p>
                          
                          {reg.selectedDays && reg.selectedDays.length > 0 && (
                            <p className="text-[11px] text-[#e8631a] font-bold mt-2 flex items-center gap-1.5">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                              </svg>
                              Day{reg.selectedDays.length > 1 ? 's' : ''}: {reg.selectedDays.sort((a,b)=>a-b).join(', ')}
                            </p>
                          )}
                          
                          {reg.status === 'CANCELLED' && reg.cancelledAt && (
                            <p className="text-[11px] text-red-500 mt-2 font-medium">
                              Cancelled on {new Date(reg.cancelledAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Card Bottom: Actions */}
                      <div className="bg-white px-6 py-4 flex items-center justify-between border-t border-border/50">
                        {canCancel ? (
                          <button onClick={() => { setCancelSuccess(null); setCancelTarget(reg); }}
                            className="text-[11px] font-red font-bold text-red-500 hover:text-red-700 hover:underline underline-offset-2 transition-all">
                            Cancel
                          </button>
                        ) : (
                          <div className="text-[10px] text-gray-400 font-medium"></div> // Empty spacer if no left action
                        )}
                        
                        <div className="flex items-center gap-3">
                          {activeTab === 'certs' && isCompleted && reg.hasSubmittedFeedback && (
                            <button onClick={() => downloadCertificate(reg)} className="text-[11px] font-black uppercase tracking-wider text-primary hover:text-[#d4741a] transition-all flex items-center gap-1 group">
                              Download <span className="group-hover:translate-x-0.5 transition-transform">↓</span>
                            </button>
                          )}
                          {activeTab === 'tickets' && reg.checkedIn && (
                            <button onClick={() => isCompleted && !reg.hasSubmittedFeedback && setFeedbackTarget(reg)}
                              disabled={!isCompleted || reg.hasSubmittedFeedback}
                              className={`text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1 group ${
                                !isCompleted ? 'text-gray-300 cursor-not-allowed' :
                                reg.hasSubmittedFeedback ? 'text-emerald-600 cursor-default' :
                                'text-primary hover:text-[#d4741a]'
                              }`}
                              title={!isCompleted ? 'Wait for completion' : ''}>
                              {reg.hasSubmittedFeedback ? 'Feedback Done' : 'Submit Feedback'} <span className="text-sm">💬</span>
                            </button>
                          )}
                          <Link href={`/events/${evt.eventId}`} className="text-[11px] font-black uppercase tracking-wider text-secondary hover:text-primary transition-all flex items-center gap-1 group">
                            View Event <span className="group-hover:translate-x-1 transition-transform">→</span>
                          </Link>
                        </div>
                      </div>
                      
                      {/* Expanded QR Inline below card */}
                      {expandedQR === reg._id && reg.qrCode && (
                        <div className="px-6 pb-6 bg-white border-t border-border flex flex-col items-center animate-[fadeIn_0.2s_ease-out]">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mt-4 mb-3">Your Event Pass</p>
                          <div className="bg-white p-2 rounded-2xl border-2 border-border shadow-sm mb-4">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={reg.qrCode} alt="QR Code" className="w-40 h-40 rounded-xl" />
                          </div>
                          <button onClick={() => downloadQR(reg.qrCode!, evt.eventId)}
                            className="bg-secondary hover:bg-primary text-white transition-colors px-6 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-wider whitespace-nowrap">
                            Download Pass
                          </button>
                        </div>
                      )}

                      {/* Cancel Success message inline */}
                      {isJustCancelled && (
                        <div className="m-4 mt-0 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-medium">
                          ✅ {cancelSuccess!.message}
                        </div>
                      )}
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
