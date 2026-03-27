"use client";
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { CheckCircleIcon, PlusIcon, GridIcon, QrIcon, ListIcon, ClockIcon, AlertIcon, UsersIcon, BuildingIcon, ZapIcon } from '@/components/Icons';
import { useRef } from 'react';

type Result = { message: string; studentName?: string; studentEmail?: string; college?: string; eventName?: string; alreadyCheckedIn?: boolean; isError?: boolean };

type EventRow = {
  eventId: string; name: string; collegeName: string; city: string; status: string; dateTime: string;
  registeredCount: number; capacity: number; checkedInCount: number; waitlistCount: number;
  checkInStarted?: boolean;
};

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-emerald-100 text-emerald-700',
  'sold out': 'bg-red-100 text-red-600',
  completed: 'bg-gray-100 text-gray-500',
};

export default function AdminEventsPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'UPCOMING' | 'COMPLETED'>('ALL');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Scanner State
  const [showScanner, setShowScanner] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [processing, setProcessing] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [manual, setManual] = useState('');
  const scannerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html5QrRef = useRef<any>(null);

  useEffect(() => {
    if (showScanner && !scannerReady) {
      if (document.querySelector('script[src*="html5-qrcode"]')) {
        setScannerReady(true); return;
      }
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
      script.onload = () => setScannerReady(true);
      document.head.appendChild(script);
    }
  }, [showScanner, scannerReady]);

  useEffect(() => {
    if (!showScanner || !scannerReady || !scannerRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scanner = new (window as any).Html5Qrcode('global-qr-scanner');
    html5QrRef.current = scanner;
    scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 } },
      async (text: string) => { if (!processing) await processQR(text); }, undefined
    ).catch(console.error);
    return () => { scanner.stop().catch(() => {}); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showScanner, scannerReady]);

  const processQR = async (raw: string) => {
    setProcessing(true); setResult(null);
    try {
      const res = await fetch('http://localhost:5000/api/checkin', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ qrPayload: raw })
      });
      const data = await res.json();
      setResult({ ...data, isError: !res.ok });
      if (res.ok) await fetchEvents();
    } catch { setResult({ message: 'Network error.', isError: true }); }
    finally { setProcessing(false); }
  };

  const fetchEvents = useCallback(async () => {
    if (!user || !token) return;
    const url = user.role === 'superAdmin'
      ? 'http://localhost:5000/api/events'
      : 'http://localhost:5000/api/events/mine';
    try {
      const d = await fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
      setEvents(Array.isArray(d) ? d : d.events || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [user, token]);

  useEffect(() => {
    if (!user || !token) { router.push('/admin/login'); return; }
    if (user.role !== 'admin' && user.role !== 'superAdmin') { router.push('/'); return; }
    fetchEvents();
  }, [user, token, router, fetchEvents]);

  const toggleCheckin = async (evt: EventRow, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(evt.eventId + '-checkin');
    try {
      const res = await fetch(`http://localhost:5000/api/events/${evt.eventId}/checkin-start`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) await fetchEvents();
    } catch { /* silent */ }
    finally { setActionLoading(null); }
  };

  const deleteEvent = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete !== eventId) { setConfirmDelete(eventId); return; }
    setActionLoading(eventId + '-delete');
    try {
      const res = await fetch(`http://localhost:5000/api/events/${eventId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) { setConfirmDelete(null); await fetchEvents(); }
    } catch { /* silent */ }
    finally { setActionLoading(null); }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'superAdmin')) return null;

  const getDisplayStatus = (evt: EventRow) => {
    if (evt.status === 'COMPLETED') return 'completed';
    if (evt.registeredCount >= evt.capacity) return 'sold out';
    return 'open';
  };

  const filtered = events.filter(e => filter === 'ALL' || e.status === filter);

  return (
    <AdminLayout 
      title="All Events"
      headerActions={
        <>
          <button onClick={() => setShowScanner(true)}
            className="flex items-center justify-center gap-2 bg-white hover:bg-emerald-50 text-emerald-600 border border-emerald-200 px-5 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm w-full sm:w-auto">
            <QrIcon className="w-4 h-4" /> Scan QR
          </button>
          <Link href="/admin/create-event"
            className="flex items-center justify-center gap-2 bg-[#0E1B3D] hover:bg-[#1a2d5a] text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow w-full sm:w-auto">
            <PlusIcon className="w-4 h-4" /> Create Event
          </Link>
        </>
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar">
          {(['ALL','UPCOMING','COMPLETED'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${filter === f ? 'bg-[#0E1B3D] text-white border-[#0E1B3D]' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
              {f === 'ALL' ? `All (${events.length})` : `${f === 'UPCOMING' ? 'Upcoming' : 'Completed'} (${events.filter(e => e.status === f).length})`}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-3">{Array.from({length:4}).map((_,i) => <div key={i} className="h-16 bg-gray-50 rounded-2xl animate-pulse"/>)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 font-medium mb-4">No events found.</p>
              <Link href="/admin/create-event" className="bg-[#e8631a] text-white px-5 py-2.5 rounded-xl font-bold text-sm inline-block">Create Event</Link>
            </div>
          ) : (
            <>
              {/* Desktop/Tablet Table View */}
              <div className="hidden md:block overflow-x-auto w-full">
                <div className="min-w-[900px]">
                  {/* Header row */}
              <div className="grid gap-3 px-6 py-4 border-b border-gray-100 text-xs font-bold uppercase tracking-widest text-gray-400"
                style={{gridTemplateColumns: '2fr 2fr 1.2fr 1.2fr 1.2fr 1fr 1fr 1fr 0.8fr'}}>
                <span>Event</span>
                <span>College</span>
                <span>Date</span>
                <span>City</span>
                <span className="text-center">Seats</span>
                <span className="text-center">Check-In</span>
                <span className="text-center">Start</span>
                <span className="text-center">Status</span>
                <span className="text-center">Actions</span>
              </div>
              <div className="divide-y divide-gray-50">
                {filtered.map(evt => {
                  const pct = Math.min(100, Math.round((evt.registeredCount / evt.capacity) * 100));
                  const ds = getDisplayStatus(evt);
                  const isCheckinLoading = actionLoading === evt.eventId + '-checkin';
                  const isDeleteLoading  = actionLoading === evt.eventId + '-delete';
                  const isDeleteConfirm  = confirmDelete === evt.eventId;
                  return (
                    <div key={evt.eventId}
                      onClick={() => router.push(`/admin/events/${evt.eventId}`)}
                      className="grid gap-3 px-6 py-5 items-center hover:bg-[#e8631a]/10 transition-colors cursor-pointer group"
                      style={{gridTemplateColumns: '2fr 2fr 1.2fr 1.2fr 1.2fr 1fr 1fr 1fr 0.8fr'}}>

                      {/* Event name only */}
                      <div>
                        <p className="font-bold text-[#0E1B3D] group-hover:text-[#e8631a] text-base leading-tight transition-colors truncate">{evt.name}</p>
                      </div>

                      {/* College */}
                      <div>
                        <p className="text-sm text-gray-600 font-medium truncate">{evt.collegeName}</p>
                      </div>

                      {/* Date */}
                      <div>
                        <p className="text-sm text-gray-500">{new Date(evt.dateTime).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</p>
                      </div>

                      {/* City */}
                      <div>
                        <span className="text-sm text-gray-600 font-medium">{evt.city}</span>
                      </div>

                      {/* Seats */}
                      <div className="text-center">
                        <p className="font-extrabold text-[#e8631a] text-base">{evt.registeredCount}<span className="text-gray-300 font-normal text-sm">/{evt.capacity}</span></p>
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden mt-1">
                          <div className={`h-full rounded-full ${pct >= 100 ? 'bg-red-400' : 'bg-[#e8631a]'}`} style={{ width: `${pct}%` }}/>
                        </div>
                      </div>

                      {/* Check-In count */}
                      <div className="text-center">
                        <p className="font-extrabold text-emerald-600 text-base">{evt.checkedInCount}</p>
                      </div>

                      {/* Start Check-In — own column */}
                      <div className="flex justify-center" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={e => toggleCheckin(evt, e)}
                          disabled={!!isCheckinLoading}
                          title={evt.checkInStarted ? 'Stop Check-In' : 'Start Check-In'}
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all disabled:opacity-50 ${
                            evt.checkInStarted
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-600 hover:bg-emerald-100'
                              : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-emerald-300 hover:text-emerald-600'
                          }`}>
                          {isCheckinLoading
                            ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"/>
                            : evt.checkInStarted
                              ? <CheckCircleIcon className="w-3.5 h-3.5"/>
                              : <ClockIcon className="w-3.5 h-3.5"/>}
                        </button>
                      </div>

                      {/* Status badge */}
                      <div className="flex justify-center">
                        <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${STATUS_STYLE[ds]}`}>{ds}</span>
                      </div>

                      {/* Actions — icon-only Edit + Delete */}
                      <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                        {/* Edit icon */}
                        <Link
                          href={`/admin/events/${evt.eventId}/edit`}
                          title="Edit Event"
                          onClick={e => e.stopPropagation()}
                          className="w-8 h-8 rounded-lg border border-[#0E1B3D]/20 text-[#0E1B3D] hover:border-[#0E1B3D] hover:bg-[#0E1B3D]/5 flex items-center justify-center transition-all">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </Link>

                        {/* Delete icon */}
                        <button
                          onClick={e => deleteEvent(evt.eventId, e)}
                          disabled={!!isDeleteLoading}
                          title={isDeleteConfirm ? 'Click again to confirm delete' : 'Delete Event'}
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all disabled:opacity-50 ${
                            isDeleteConfirm
                              ? 'bg-red-50 border-red-400 text-red-600'
                              : 'border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500'
                          }`}>
                          {isDeleteLoading
                            ? <span className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin"/>
                            : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                              </svg>}
                        </button>
                      </div>
                    </div>
                  );
                })}
                </div>
              </div>
            </div>

            {/* Mobile Card View */}
              <div className="md:hidden flex flex-col gap-4 p-4 sm:p-6 bg-gray-50/50">
                {filtered.map(evt => {
                  const pct = Math.min(100, Math.round((evt.registeredCount / evt.capacity) * 100));
                  const ds = getDisplayStatus(evt);
                  const isCheckinLoading = actionLoading === evt.eventId + '-checkin';
                  const isDeleteLoading  = actionLoading === evt.eventId + '-delete';
                  const isDeleteConfirm  = confirmDelete === evt.eventId;
                  return (
                    <div 
                      key={evt.eventId} 
                      onClick={() => router.push(`/admin/events/${evt.eventId}`)}
                      className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm relative cursor-pointer active:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2 border-b border-gray-50 pb-3">
                        <div className="pr-4 min-w-0">
                          <h3 className="font-bold text-[#0E1B3D] text-lg leading-tight mb-1 truncate">{evt.name}</h3>
                          <p className="text-gray-500 text-xs flex items-center gap-1.5 truncate"><BuildingIcon className="w-3.5 h-3.5 shrink-0"/> <span className="truncate">{evt.collegeName}</span></p>
                          <p className="text-gray-400 text-[10px] mt-1 uppercase tracking-wider">{evt.city} • {new Date(evt.dateTime).toLocaleDateString('en-IN', {day:'numeric', month:'short'})}</p>
                        </div>
                        <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded-md shrink-0 ${STATUS_STYLE[ds]}`}>{ds}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-4 mt-3">
                        <div className="bg-[#e8631a]/5 rounded-lg p-3 text-center border border-[#e8631a]/20">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#e8631a]/60 mb-0.5">Seats</p>
                          <p className="font-extrabold text-[#e8631a] text-lg leading-none">{evt.registeredCount}<span className="text-[#e8631a]/40 font-normal text-xs">/{evt.capacity}</span></p>
                          <div className="h-1 bg-[#e8631a]/20 rounded-full overflow-hidden mt-1.5 w-full max-w-[80px] mx-auto">
                            <div className={`h-full rounded-full ${pct >= 100 ? 'bg-red-400' : 'bg-[#e8631a]'}`} style={{ width: `${pct}%` }}/>
                          </div>
                        </div>
                        <div className="bg-emerald-50/50 rounded-lg p-3 text-center border border-emerald-100/50">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/50 mb-0.5">Checked In</p>
                          <p className="font-extrabold text-emerald-600 text-xl leading-none mt-1">{evt.checkedInCount}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 border-t border-gray-50 pt-3 mt-1" onClick={e => e.stopPropagation()}>
                        <button onClick={e => toggleCheckin(evt, e)} disabled={!!isCheckinLoading}
                          className={`flex-1 rounded-lg border py-2.5 flex items-center justify-center gap-1.5 transition-all text-sm font-bold shadow-sm ${evt.checkInStarted ? 'bg-emerald-50 border-emerald-300 text-emerald-600' : 'bg-white border-gray-200 text-gray-600'}`}>
                          {isCheckinLoading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/> : evt.checkInStarted ? <><CheckCircleIcon className="w-4 h-4"/> Stop Check-In</> : <><ClockIcon className="w-4 h-4"/> Start Check-In</>}
                        </button>
                        
                        <Link href={`/admin/events/${evt.eventId}/edit`} className="w-12 flex items-center justify-center bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors shadow-sm">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </Link>
                        
                        <button onClick={e => deleteEvent(evt.eventId, e)} disabled={!!isDeleteLoading} className={`w-12 flex items-center justify-center rounded-lg border shadow-sm transition-all ${isDeleteConfirm ? 'bg-red-50 border-red-300 text-red-600' : 'bg-white hover:bg-red-50 hover:border-red-200 border-gray-200 text-gray-400 hover:text-red-500'}`}>
                          {isDeleteLoading ? <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"/> : <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── QR Scanner Modal ────────────────────────────────────── */}
      {showScanner && (
        <div className="fixed inset-0 bg-[#0E1B3D]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-body">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 flex justify-between items-center text-center relative border-b border-gray-100">
              <h3 className="font-heading font-extrabold text-[#0E1B3D] w-full text-xl">Event Check-In</h3>
              <button 
                onClick={() => { setShowScanner(false); setResult(null); setManual(''); }} 
                className="absolute right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6">
              {/* Scanner */}
              <div className="bg-[#0E1B3D] rounded-2xl overflow-hidden shadow-inner mb-4">
                <div id="global-qr-scanner" ref={scannerRef} className="w-full" style={{ minHeight: '280px' }}></div>
                {!scannerReady && (<div className="flex items-center justify-center h-64 text-white/50 font-bold animate-pulse text-sm">Loading camera…</div>)}
              </div>

              {/* Status/Result */}
              {processing && <div className="bg-gray-50 rounded-xl p-4 mb-4 text-center text-[#0E1B3D] font-bold text-sm animate-pulse border border-gray-100">Verifying code…</div>}
              
              {result && !processing && (
                <div className={`border-2 rounded-xl p-4 mb-4 ${result.alreadyCheckedIn ? 'bg-amber-50 border-amber-300' : result.isError ? 'bg-red-50 border-red-300' : 'bg-emerald-50 border-emerald-300'}`}>
                  <div className="flex items-start gap-3">
                    {result.alreadyCheckedIn ? <AlertIcon className="w-6 h-6 shrink-0 mt-0.5 text-amber-500"/> : result.isError ? <AlertIcon className="w-6 h-6 shrink-0 mt-0.5 text-red-500"/> : <CheckCircleIcon className="w-6 h-6 shrink-0 mt-0.5 text-emerald-500"/>}
                    <div>
                      <p className="font-bold text-[#0E1B3D] text-sm">{result.message}</p>
                      {result.studentName && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs font-bold text-[#0E1B3D]/80 flex items-center gap-1.5"><UsersIcon className="w-3.5 h-3.5" /> {result.studentName}</p>
                          {result.college && <p className="text-[10px] text-[#0E1B3D]/60 flex items-center gap-1.5"><BuildingIcon className="w-3 h-3" /> {result.college}</p>}
                          {result.eventName && <p className="text-[10px] text-[#0E1B3D]/60 flex items-center gap-1.5"><ZapIcon className="w-3 h-3" /> {result.eventName}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                  <button onClick={() => { setResult(null); setManual(''); }} className="mt-3 w-full text-[10px] uppercase tracking-widest font-bold text-gray-400 hover:text-gray-600 transition-colors text-center border-t border-black/5 pt-2">
                    Scan Next →
                  </button>
                </div>
              )}

              {/* Manual Entry */}
              <details className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden">
                <summary className="px-4 py-3 text-xs font-bold text-gray-500 cursor-pointer hover:text-gray-700 flex items-center gap-2"><ZapIcon className="w-3 h-3" /> Manual QR Entry</summary>
                <div className="p-4 pt-0">
                  <textarea value={manual} onChange={e => setManual(e.target.value)} rows={2}
                    placeholder='Paste payload…'
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-700 outline-none focus:border-emerald-500 resize-none mb-2"/>
                  <button onClick={() => processQR(manual.trim())} disabled={!manual.trim()}
                    className="w-full bg-[#0E1B3D] text-white font-bold py-2 rounded-lg text-xs hover:bg-[#1a2d5a] transition-colors disabled:opacity-40">
                    Submit Code
                  </button>
                </div>
              </details>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
