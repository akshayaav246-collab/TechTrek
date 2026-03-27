"use client";

import { useState, useEffect, useCallback } from 'react';
import VenueMap, { HallLayoutData, SeatStatus } from '@/components/VenueMap';
import { useAuth } from '@/context/AuthContext';

interface Props {
  eventId: string;
  layout: HallLayoutData;
}

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const calc = () => Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
    setSeconds(calc());
    const id = setInterval(() => setSeconds(c => { const n = calc(); if (n <= 0) clearInterval(id); return n; }), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  const m = Math.floor(seconds / 60), s = seconds % 60;
  return <span className="font-mono text-amber-700 font-bold">{m}:{String(s).padStart(2,'0')}</span>;
}

export default function SeatSelectionClient({ eventId, layout }: Props) {
  const { user, token } = useAuth();
  const [seatStatuses, setSeatStatuses] = useState<SeatStatus[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [mySeat, setMySeat] = useState<SeatStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok'|'err'; text: string } | null>(null);

  // Fetch all seat statuses (polls every 10s)
  const fetchSeats = useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/seats/${eventId}`);
      const data: SeatStatus[] = await res.json();
      setSeatStatuses(data);
      if (user) {
        const mine = data.find(s => s.userId === user._id);
        setMySeat(mine || null);
      }
    } catch { /* silent */ }
  }, [eventId, user]);

  useEffect(() => {
    fetchSeats();
    const id = setInterval(fetchSeats, 10000);
    return () => clearInterval(id);
  }, [fetchSeats]);

  const handleSeatClick = (seatId: string) => {
    if (!user) { setMsg({ type: 'err', text: 'Please log in to select a seat.' }); return; }
    setSelectedSeat(seatId);
    setMsg(null);
  };

  const holdSeat = async () => {
    if (!selectedSeat || !token) return;
    setLoading(true); setMsg(null);
    try {
      const res = await fetch('http://localhost:5000/api/seats/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventId, seatId: selectedSeat }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ type: 'err', text: data.message }); return; }
      setMsg(null);
      setMySeat(data);
      setSelectedSeat(null);
      fetchSeats();
    } catch { setMsg({ type: 'err', text: 'Network error' }); }
    finally { setLoading(false); }
  };

  const confirmSeat = async () => {
    if (!mySeat || !token) return;
    setLoading(true); setMsg(null);
    try {
      const res = await fetch('http://localhost:5000/api/seats/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventId, seatId: mySeat.seatId }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ type: 'err', text: data.message }); return; }
      setMsg({ type: 'ok', text: `Seat ${mySeat.seatId} confirmed! 🎉` });
      setMySeat({ ...data });
      fetchSeats();
    } catch { setMsg({ type: 'err', text: 'Network error' }); }
    finally { setLoading(false); }
  };

  const releaseSeat = async () => {
    if (!mySeat || !token) return;
    setLoading(true); setMsg(null);
    try {
      const res = await fetch('http://localhost:5000/api/seats/release', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventId, seatId: mySeat.seatId }),
      });
      if (!res.ok) { const d = await res.json(); setMsg({ type: 'err', text: d.message }); return; }
      setMsg({ type: 'ok', text: 'Seat released.' });
      setMySeat(null);
      fetchSeats();
    } catch { setMsg({ type: 'err', text: 'Network error' }); }
    finally { setLoading(false); }
  };

  const statAvail = seatStatuses.filter(s => s.status === 'confirmed').length;
  const total = layout.total_rows * layout.seats_per_row;

  return (
    <div className="space-y-6">

      {/* Stats bar */}
      <div className="flex gap-4 flex-wrap">
        {[
          { label: 'Total Seats', val: total, color: 'text-gray-700' },
          { label: 'Booked', val: statAvail, color: 'text-red-600' },
          { label: 'On Hold', val: seatStatuses.filter(s=>s.status==='temp_hold').length, color: 'text-[#e8631a]' },
          { label: 'Available', val: total - seatStatuses.length, color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="flex-1 min-w-[100px] bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm text-center">
            <p className={`font-extrabold text-2xl ${s.color}`}>{s.val}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Seat map */}
      <VenueMap
        layout={layout}
        interactive={true}
        eventId={eventId}
        currentUserId={user?._id}
        seatStatuses={seatStatuses}
        onSeatClick={handleSeatClick}
        mySeatId={mySeat?.seatId}
      />

      {/* Message */}
      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.type==='ok' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {msg.text}
        </div>
      )}

      {/* Seat action panel */}
      {selectedSeat && !mySeat && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-extrabold text-xl text-gray-800">Seat <span className="text-[#e8631a]">{selectedSeat}</span></p>
              <p className="text-xs text-gray-500">Will be held for 30 mins</p>
            </div>
            <button onClick={() => setSelectedSeat(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
          </div>
          <button onClick={holdSeat} disabled={loading}
            className="w-full bg-[#e8631a] hover:bg-[#d4741a] text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50">
            {loading ? 'Holding…' : `⏱ Hold Seat ${selectedSeat} for 30 mins`}
          </button>
        </div>
      )}

      {/* My current hold */}
      {mySeat && (
        <div className={`rounded-2xl p-5 border ${mySeat.status === 'confirmed' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <p className="font-extrabold text-lg text-gray-800 mb-1">
            {mySeat.status === 'confirmed' ? '✅' : '⏱'} Your Seat: <span className="text-[#e8631a]">{mySeat.seatId}</span>
          </p>
          {mySeat.status === 'temp_hold' && mySeat.expiresAt && (
            <p className="text-sm text-gray-600 mb-4">
              Expires in: <Countdown expiresAt={mySeat.expiresAt}/>
            </p>
          )}
          {mySeat.status === 'confirmed' && (
            <p className="text-sm text-emerald-700 font-medium mb-4">Seat confirmed! Your booking is secured.</p>
          )}
          <div className="flex gap-3">
            {mySeat.status === 'temp_hold' && (
              <button onClick={confirmSeat} disabled={loading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition-all disabled:opacity-50">
                {loading ? 'Confirming…' : '💳 Confirm Booking (Pay Later)'}
              </button>
            )}
            {mySeat.status === 'temp_hold' && (
              <button onClick={releaseSeat} disabled={loading}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold text-sm disabled:opacity-50">
                Release
              </button>
            )}
          </div>
        </div>
      )}

      {!user && (
        <div className="text-center py-4 text-sm text-gray-500">
          <a href="/login" className="text-[#e8631a] font-bold hover:underline">Log in</a> to select and hold a seat.
        </div>
      )}
    </div>
  );
}
