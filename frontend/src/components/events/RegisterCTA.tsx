"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
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
        setMySeat({ ...data }); fetchSeats(); setSeatMsg(`Seat ${mySeat.seatId} confirmed! 🎉`);
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
      // After registration, open seat selection if hall layout available
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

  return (
    <>
      <div className="sticky top-28 bg-card border border-border p-8 rounded-3xl shadow-xl">
        <h3 className="font-heading font-bold text-2xl text-secondary mb-2">Registration</h3>
        <p className="text-foreground/70 mb-8 flex items-center gap-2 font-medium"><LocationIcon className="w-4 h-4 text-primary" /> {venue}</p>

        {/* Seat Stats */}
        <div className="bg-black/5 p-6 rounded-2xl mb-6 border border-black/5">
          <div className="flex justify-between items-end mb-3">
            <span className="text-5xl font-bebas text-secondary leading-none">{registered}</span>
            <span className="text-sm font-bold text-foreground/60 pb-1 uppercase tracking-widest">/ {capacity} Seats</span>
          </div>
          <div className="w-full h-3 bg-black/10 rounded-full overflow-hidden mb-3">
            <div className={`h-full rounded-full transition-all duration-1000 ${percentage >= 100 ? 'bg-[#b91d1d]' : 'bg-primary'}`} style={{ width: `${percentage}%` }}/>
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary text-right">{percentage}% Filled</p>
        </div>

        {/* Status badges */}
        {regStatus === 'REGISTERED' && (
          <div className="mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
              <CheckCircleIcon className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-emerald-800 text-sm">You&apos;re Registered!</p>
              <p className="text-emerald-700 text-xs mt-0.5">See you at the summit. QR sent to your email.</p>
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

        {/* QR Code Ticket */}
        {qrCode && regStatus === 'REGISTERED' && (
          <div className="mb-6 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-foreground/50 mb-3">Your Entry QR Code</p>
            <div className="bg-white p-3 rounded-2xl border-2 border-secondary inline-block shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCode} alt="QR Ticket" className="w-48 h-48 rounded-xl" />
            </div>
            <button onClick={downloadQR}
              className="mt-4 w-full flex items-center justify-center gap-2 border-2 border-secondary text-secondary hover:bg-secondary hover:text-white transition-all py-3 rounded-xl font-bold text-sm">
              <DownloadIcon className="w-4 h-4" /> Download Ticket
            </button>
          </div>
        )}

        {/* CTA Button */}
        {status === 'COMPLETED' ? (
          <Button variant="secondary" className="w-full py-4 text-base opacity-60 cursor-not-allowed border-none">Event Concluded</Button>
        ) : isCompleted ? (
          <div className="space-y-3">
            <div className={`w-full py-4 rounded-2xl text-center font-bold text-base border-2 ${regStatus === 'REGISTERED' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
              {regStatus === 'REGISTERED' ? (
                <span className="flex items-center justify-center gap-2"><CheckCircleIcon className="w-4 h-4" /> Spot Reserved</span>
              ) : (
                <span className="flex items-center justify-center gap-2"><HourglassIcon className="w-4 h-4" /> On Waitlist</span>
              )}
            </div>
            {/* Select seat button shown only if registered and hall layout exists */}
            {regStatus === 'REGISTERED' && hallLayout && (
              <button onClick={openSeatModal}
                className="w-full py-3 rounded-2xl border-2 border-[#e8631a] text-[#e8631a] font-bold text-sm hover:bg-[#e8631a] hover:text-white transition-all flex items-center justify-center gap-2">
                <SeatIcon className="w-4 h-4" /> Select / View Your Seat
              </button>
            )}
          </div>
        ) : (
          <Button variant="primary"
            className={`w-full py-4 text-lg font-bold shadow-lg transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] hover:shadow-xl'}`}
            onClick={handleRegister} disabled={disabled || loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Processing…
              </span>
            ) : disabled ? 'Sold Out' : 'Register for Summit'}
          </Button>
        )}

        {!user && !isCompleted && status !== 'COMPLETED' && (
          <p className="text-center text-xs text-foreground/50 mt-4 font-medium">You&apos;ll be asked to sign in first</p>
        )}
      </div>

      {/* ── Seat Selection Modal ─────────────────────────── */}
      {showSeatModal && hallLayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl z-10">
              <div>
                <h2 className="font-heading font-bold text-xl text-gray-900 flex items-center gap-2"><SeatIcon className="w-5 h-5 text-[#e8631a]" /> Choose Your Seat</h2>
                <p className="text-xs text-gray-500 mt-0.5">{hallLayout.hall_name}</p>
              </div>
              <button onClick={() => setShowSeatModal(false)} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="p-8 space-y-5">
              {/* Stats */}
              <div className="flex gap-3 flex-wrap">
                {[
                  { label: 'Total', val: hallLayout.total_rows * hallLayout.seats_per_row, color: 'text-gray-700' },
                  { label: 'Booked', val: seatStatuses.filter(s => s.status === 'confirmed').length, color: 'text-red-500' },
                  { label: 'On Hold', val: seatStatuses.filter(s => s.status === 'temp_hold').length, color: 'text-[#e8631a]' },
                  { label: 'Free', val: hallLayout.total_rows * hallLayout.seats_per_row - seatStatuses.length, color: 'text-emerald-600' },
                ].map(s => (
                  <div key={s.label} className="flex-1 min-w-[80px] bg-gray-50 border border-gray-100 rounded-2xl px-3 py-2.5 text-center">
                    <p className={`font-extrabold text-xl ${s.color}`}>{s.val}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Venue map */}
              <VenueMap
                layout={hallLayout}
                interactive={true}
                eventId={eventId}
                currentUserId={user?._id}
                seatStatuses={seatStatuses}
                onSeatClick={(seatId) => holdSeat(seatId)}
                mySeatId={mySeat?.seatId}
              />

              {/* Seat message */}
              {seatMsg && (
                <div className={`rounded-xl px-4 py-3 text-sm font-medium ${seatMsg.includes('!') || seatMsg.includes('held') || seatMsg.includes('confirmed') ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                  {seatMsg}
                </div>
              )}

              {/* My hold panel */}
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
