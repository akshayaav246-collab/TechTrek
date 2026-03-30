"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { HallLayoutData, SeatStatus } from '@/components/VenueMap';
import { LocationIcon, CheckCircleIcon, HourglassIcon, AlertIcon, DownloadIcon, SeatIcon, XIcon, CreditCardIcon, ClockIcon } from '@/components/Icons';

const VenueMap = dynamic(() => import('@/components/VenueMap'), { ssr: false });

type RegistrationStatus = 'IDLE' | 'REGISTERED' | 'WAITLISTED' | 'ERROR';

type MyRegistration = {
  _id: string; status: string; qrCode?: string; checkedIn?: boolean; createdAt: string;
  event: { eventId: string; name: string; collegeName: string; city: string; venue: string; dateTime: string; status: string; };
};

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const calc = () => Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
    setSeconds(calc());
    const id = setInterval(() => setSeconds(() => { const n = calc(); if (n <= 0) clearInterval(id); return n; }), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  const m = Math.floor(seconds / 60), s = seconds % 60;
  return <span className="font-mono font-bold text-amber-700">{m}:{String(s).padStart(2, '0')}</span>;
}

export function RegisterCTA({
  eventId, disabled, status, registered, capacity, percentage, venue, hallLayout,
}: {
  eventId: string; disabled: boolean; status: string;
  registered: number; capacity: number; percentage: number; venue: string;
  hallLayout?: HallLayoutData | null;
}) {
  const { user, token } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [regStatus, setRegStatus] = useState<RegistrationStatus>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);

  // Seat selection modal state
  const [showSeatModal, setShowSeatModal] = useState(false);
  const [seatStatuses, setSeatStatuses] = useState<SeatStatus[]>([]);
  const [mySeat, setMySeat] = useState<SeatStatus | null>(null);
  const [seatLoading, setSeatLoading] = useState(false);
  const [seatMsg, setSeatMsg] = useState('');

  useEffect(() => {
    if (user && token) {
      fetch(`http://localhost:5000/api/registrations/check/${eventId}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(data => {
          if (data.isRegistered) {
            setRegStatus(data.status as RegistrationStatus);
            if (data.qrCode) setQrCode(data.qrCode);
          }
        }).catch(() => {});
    }
  }, [user, token, eventId]);

  const fetchSeats = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/seats/${eventId}`);
      const data: SeatStatus[] = await res.json();
      setSeatStatuses(data);
      if (user) {
        const mine = data.find(s => s.userId === user._id);
        setMySeat(mine || null);
      }
    } catch { /* silent */ }
  };

  const openSeatModal = () => {
    fetchSeats();
    setShowSeatModal(true);
  };

  const holdSeat = async (seatId: string) => {
    if (!token) return;

    // If student already has a confirmed or held seat, block and notify
    if (mySeat) {
      if (mySeat.status === 'confirmed') {
        setSeatMsg(`⚠️ You already have seat ${mySeat.seatId} confirmed. You cannot select another seat.`);
        return;
      }
      if (mySeat.status === 'temp_hold') {
        setSeatMsg(`ℹ️ You already have seat ${mySeat.seatId} on hold. Confirm or release it first.`);
        return;
      }
    }

    setSeatLoading(true); setSeatMsg('');
    try {
      const res = await fetch('http://localhost:5000/api/seats/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventId, seatId }),
      });
      const data = await res.json();
      if (!res.ok) { setSeatMsg(data.message); } else {
        setMySeat(data); fetchSeats(); setSeatMsg('');
      }
    } catch { setSeatMsg('Network error'); }
    finally { setSeatLoading(false); }
  };

  const confirmSeat = async () => {
    if (!mySeat || !token) return;
    setSeatLoading(true); setSeatMsg('');
    try {
      const res = await fetch('http://localhost:5000/api/seats/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventId, seatId: mySeat.seatId }),
      });
      const data = await res.json();
      if (!res.ok) { setSeatMsg(data.message); } else {
        setMySeat({ ...data }); fetchSeats();
        // No duplicate toast — the confirmation panel below already shows confirmed state
        setSeatMsg('');
      }
    } catch { setSeatMsg('Network error'); }
    finally { setSeatLoading(false); }
  };

  const releaseSeat = async () => {
    if (!mySeat || !token) return;
    setSeatLoading(true); setSeatMsg('');
    try {
      const res = await fetch('http://localhost:5000/api/seats/release', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventId, seatId: mySeat.seatId }),
      });
      if (res.ok) { setMySeat(null); fetchSeats(); setSeatMsg('Seat released.'); }
    } catch { setSeatMsg('Network error'); }
    finally { setSeatLoading(false); }
  };

  const handleRegister = async () => {
    if (!user || !token) { router.push(`/login?redirect=/events/${eventId}`); return; }
    setLoading(true); setRegStatus('IDLE'); setErrorMsg('');
    try {
      const res = await fetch('http://localhost:5000/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventId }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg: string = data.message || 'Registration failed.';
        if (msg.toLowerCase().includes('already registered')) { setRegStatus('REGISTERED'); return; }
        if (msg.toLowerCase().includes('waitlist')) { setRegStatus('WAITLISTED'); return; }
        setRegStatus('ERROR'); setErrorMsg(msg); return;
      }
      setRegStatus(data.isWaitlisted ? 'WAITLISTED' : 'REGISTERED');
      if (data.qrCode) setQrCode(data.qrCode);
      router.refresh();
      if (hallLayout && !data.isWaitlisted) {
        setTimeout(() => openSeatModal(), 400);
      }
    } catch { setRegStatus('ERROR'); setErrorMsg('Unable to connect to server.'); }
    finally { setLoading(false); }
  };

  const downloadQR = () => {
    if (!qrCode) return;
    const a = document.createElement('a'); a.href = qrCode; a.download = `techtrek-ticket-${eventId}.png`; a.click();
  };

  const isCompleted = regStatus === 'REGISTERED' || regStatus === 'WAITLISTED';

  // Is student trying to click another seat while they已 have one confirmed?
  const alreadyBooked = mySeat?.status === 'confirmed';

  return (
    <>
      <div className="sticky top-28 bg-[#0E1B3D] border border-white/5 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#e8631a]/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <h3 className="font-heading font-extrabold text-3xl text-white mb-8 tracking-tight relative z-10">Ready to Join?</h3>

        {/* Seat Stats */}
        <div className="bg-white/5 p-6 rounded-[1.5rem] mb-6 border border-white/5 relative z-10 shadow-inner">
          <div className="flex items-end gap-3 mb-4">
            <span className="text-6xl font-heading font-black text-white leading-none tracking-tighter">{registered}</span>
            <span className="text-sm font-bold text-white/40 pb-1.5 uppercase tracking-widest leading-none">/ {capacity} Seats</span>
          </div>
          <div className="w-full h-2.5 bg-[#0E1B3D] rounded-full overflow-hidden mb-3 border border-white/5">
            <div className={`h-full rounded-full transition-all duration-1000 ${percentage >= 100 ? 'bg-red-500' : 'bg-gradient-to-r from-[#e8631a] to-orange-400'}`} style={{ width: `${percentage}%` }}/>
          </div>
          <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider">
            <p className="text-[#e8631a] drop-shadow-sm">{percentage}% Filled</p>
            <p className="text-white/40">{Math.max(0, capacity - registered)} remaining</p>
          </div>
        </div>

        {/* Status badges */}
        {regStatus === 'REGISTERED' && (
          <div className="mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
              <CheckCircleIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-emerald-800 text-sm">You&apos;re Registered!</p>
              <p className="text-emerald-700 text-xs mt-0.5">Find your QR code in the <Link href="/profile" className="underline hover:text-emerald-900 transition-colors font-semibold">My Tickets</Link> section.</p>
            </div>
          </div>
        )}
        {regStatus === 'WAITLISTED' && (
          <div className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center text-white shrink-0">
              <HourglassIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-amber-800 text-sm">On the Waitlist</p>
              <p className="text-amber-700 text-xs mt-0.5">Event is full. We&apos;ll notify you if a spot opens.</p>
            </div>
          </div>
        )}
        {regStatus === 'ERROR' && (
          <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex gap-2">
            <AlertIcon className="w-4 h-4 shrink-0 mt-0.5" /><span>{errorMsg}</span>
          </div>
        )}

        {/* CTA Button */}
        {status === 'COMPLETED' ? (
          <Button variant="secondary" className="w-full py-4 text-base opacity-40 cursor-not-allowed border-white/10 bg-white/5 text-white relative z-10">Event Concluded</Button>
        ) : isCompleted ? (
          <div className="space-y-3 relative z-10">
            <div className={`w-full py-4 rounded-2xl text-center font-bold text-base border-2 ${regStatus === 'REGISTERED' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
              {regStatus === 'REGISTERED' ? (
                <span className="flex items-center justify-center gap-2"><CheckCircleIcon className="w-4 h-4" /> Spot Reserved</span>
              ) : (
                <span className="flex items-center justify-center gap-2"><HourglassIcon className="w-4 h-4" /> On Waitlist</span>
              )}
            </div>
            {regStatus === 'REGISTERED' && hallLayout && (
              <button onClick={openSeatModal}
                className="w-full py-3 rounded-2xl border-2 border-[#e8631a]/50 text-[#e8631a] font-bold text-sm hover:bg-[#e8631a] hover:border-[#e8631a] hover:text-white transition-all flex items-center justify-center gap-2">
                <SeatIcon className="w-4 h-4" /> Select / View Your Seat
              </button>
            )}
          </div>
        ) : (
          <button
            className={`w-full py-4 md:py-5 rounded-2xl text-base md:text-lg font-bold shadow-[0_0_20px_rgba(232,99,26,0.3)] transition-all relative z-10 flex items-center justify-center
              ${disabled ? 'opacity-50 cursor-not-allowed bg-white/10 text-white/40 border border-white/10' : 'bg-gradient-to-r from-[#e8631a] to-orange-500 text-white hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(232,99,26,0.5)]'}`}
            onClick={handleRegister} disabled={disabled || loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Processing…
              </span>
            ) : disabled ? 'Sold Out' : "Register Now — It's Free"}
          </button>
        )}

        {!user && !isCompleted && status !== 'COMPLETED' && (
          <p className="text-center text-xs text-white/40 mt-5 font-medium relative z-10">You'll be asked to sign in first</p>
        )}
      </div>

      {/* ── Seat Selection Modal ─────────────────────────── */}
      {showSeatModal && hallLayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          {/* Reduced max-w from 4xl → 3xl; max-h tighter to avoid top-cut */}
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl z-10">
              <div>
                <h2 className="font-heading font-bold text-lg text-gray-900 flex items-center gap-2"><SeatIcon className="w-5 h-5 text-[#e8631a]" /> Choose Your Seat</h2>
                <p className="text-xs text-gray-500 mt-0.5">{hallLayout.hall_name}</p>
              </div>
              <button onClick={() => setShowSeatModal(false)} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Stats */}
              <div className="flex gap-3 flex-wrap">
                {[
                  { label: 'Total',    val: hallLayout.total_rows * hallLayout.seats_per_row,                       color: 'text-gray-700' },
                  { label: 'Booked',   val: seatStatuses.filter(s => s.status === 'confirmed').length,              color: 'text-red-500' },
                  { label: 'On Hold',  val: seatStatuses.filter(s => s.status === 'temp_hold').length,             color: 'text-[#e8631a]' },
                  { label: 'Free',     val: hallLayout.total_rows * hallLayout.seats_per_row - seatStatuses.length, color: 'text-emerald-600' },
                ].map(s => (
                  <div key={s.label} className="flex-1 min-w-[70px] bg-gray-50 border border-gray-100 rounded-2xl px-3 py-2 text-center">
                    <p className={`font-extrabold text-xl ${s.color}`}>{s.val}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Already-booked warning banner */}
              {alreadyBooked && (
                <div className="rounded-xl px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold flex items-center gap-2">
                  <span>⚠️</span> You already have <span className="font-extrabold text-[#e8631a]">Seat {mySeat!.seatId}</span> confirmed. Seat selection is locked.
                </div>
              )}

              {/* Venue map */}
              <VenueMap
                layout={hallLayout}
                interactive={!alreadyBooked}
                eventId={eventId}
                currentUserId={user?._id}
                seatStatuses={seatStatuses}
                onSeatClick={(seatId) => holdSeat(seatId)}
                mySeatId={mySeat?.seatId}
              />

              {/* Seat action message (errors / info) — no success toast here */}
              {seatMsg && (
                <div className={`rounded-xl px-4 py-3 text-sm font-medium ${seatMsg.startsWith('⚠️') || seatMsg.startsWith('ℹ️') ? 'bg-amber-50 border border-amber-200 text-amber-800' : seatMsg.includes('released') ? 'bg-blue-50 border border-blue-200 text-blue-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                  {seatMsg}
                </div>
              )}

              {/* My seat panel — this is the single source of truth for confirmation */}
              {mySeat && (
                <div className={`rounded-2xl p-5 border ${mySeat.status === 'confirmed' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                  <p className="font-extrabold text-lg text-gray-800 mb-1 flex items-center gap-2">
                    {mySeat.status === 'confirmed'
                      ? <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                      : <ClockIcon className="w-5 h-5 text-amber-500" />}
                    Your Seat: <span className="text-[#e8631a]">{mySeat.seatId}</span>
                  </p>
                  {mySeat.status === 'temp_hold' && mySeat.expiresAt && (
                    <p className="text-sm text-gray-600 mb-4">Expires in: <Countdown expiresAt={mySeat.expiresAt}/></p>
                  )}
                  {mySeat.status === 'confirmed' && <p className="text-sm text-emerald-700 font-medium mb-4">Seat confirmed! Your booking is secured.</p>}
                  <div className="flex gap-3">
                    {mySeat.status === 'temp_hold' && (
                      <button onClick={confirmSeat} disabled={seatLoading}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                          {seatLoading ? 'Confirming…' : <><CreditCardIcon className="w-4 h-4" /> Confirm Booking (Pay Later)</>}
                        </button>
                    )}
                    {mySeat.status === 'temp_hold' && (
                      <button onClick={releaseSeat} disabled={seatLoading}
                        className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold text-sm disabled:opacity-50">
                        Release
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
