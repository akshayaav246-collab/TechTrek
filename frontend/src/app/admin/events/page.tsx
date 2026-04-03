"use client";
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { CheckCircleIcon, PlusIcon, QrIcon, ClockIcon, BuildingIcon } from '@/components/Icons';

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
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'UPCOMING' | 'COMPLETED'>('ALL');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!user || !token) return;
    const url = user.role === 'superAdmin'
      ? 'http://localhost:5000/api/events'
      : 'http://localhost:5000/api/events/mine';
    try {
      const d = await fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
      const ownEvents = Array.isArray(d) ? d : d.events || [];
      if (ownEvents.length > 0 || user.role === 'superAdmin') {
        setEvents(ownEvents);
        return;
      }
      const publicEvents = await fetch('http://localhost:5000/api/events').then(r => r.json());
      setEvents(Array.isArray(publicEvents) ? publicEvents : []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [user, token]);

  useEffect(() => {
    if (isLoading) return;
    if (!user || !token) { router.push('/admin/login'); return; }
    if (user.role !== 'admin' && user.role !== 'superAdmin') { router.push('/'); return; }
    fetchEvents();
  }, [user, token, isLoading, router, fetchEvents]);

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

  const completeEvent = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDelete !== eventId + '-complete') {
      setConfirmDelete(eventId + '-complete');
      setTimeout(() => setConfirmDelete(null), 5000);
      return;
    }
    setConfirmDelete(null);
    setActionLoading(eventId + '-complete');
    try {
      const res = await fetch(`http://localhost:5000/api/events/${eventId}/complete`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) await fetchEvents();
    } catch { /* silent */ }
    finally { setActionLoading(null); }
  };

  if (isLoading) return null;
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
          <Link href="/admin/checkin"
            className="flex items-center justify-center gap-2 bg-white hover:bg-emerald-50 text-emerald-600 border border-emerald-200 px-5 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm w-full sm:w-auto">
            <QrIcon className="w-4 h-4" /> Secure Scanner
          </Link>
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
              <Link href="/admin/create-event" className="bg-[#C84B11] text-white px-5 py-2.5 rounded-xl font-bold text-sm inline-block">Create Event</Link>
            </div>
          ) : (
            <>
              {/* Desktop/Tablet Table View */}
              <div className="hidden md:block overflow-x-auto w-full">
                <div className="min-w-[1080px]">
                  {/* Header row */}
              <div className="grid gap-4 px-6 py-4 border-b border-gray-100 text-xs font-bold uppercase tracking-widest text-gray-400"
                style={{gridTemplateColumns: 'minmax(220px,2fr) minmax(220px,2fr) minmax(140px,1fr) minmax(140px,1fr) minmax(110px,0.9fr) minmax(90px,0.8fr) minmax(90px,0.8fr) minmax(90px,0.8fr) minmax(110px,0.9fr) minmax(150px,1.1fr)'}}>
                <span>Event</span>
                <span>College</span>
                <span>Date</span>
                <span>City</span>
                <span>Seats</span>
                <span>Waitlist</span>
                <span>Check-In</span>
                <span>Start</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              <div className="divide-y divide-gray-50">
                {filtered.map(evt => {
                  const pct = Math.min(100, Math.round((evt.registeredCount / evt.capacity) * 100));
                  const ds = getDisplayStatus(evt);
                  const isCompleted = evt.status === 'COMPLETED';
                  const isCheckinLoading = actionLoading === evt.eventId + '-checkin';
                  const isCompleteLoading = actionLoading === evt.eventId + '-complete';
                  const isDeleteLoading  = actionLoading === evt.eventId + '-delete';
                  const isDeleteConfirm  = confirmDelete === evt.eventId;
                  return (
                    <div key={evt.eventId}
                      onClick={() => router.push(`/admin/events/${evt.eventId}`)}
                      className="grid gap-4 px-6 py-5 items-center hover:bg-[#C84B11]/10 transition-colors cursor-pointer group"
                      style={{gridTemplateColumns: 'minmax(220px,2fr) minmax(220px,2fr) minmax(140px,1fr) minmax(140px,1fr) minmax(110px,0.9fr) minmax(90px,0.8fr) minmax(90px,0.8fr) minmax(90px,0.8fr) minmax(110px,0.9fr) minmax(150px,1.1fr)'}}>

                      {/* Event name only */}
                      <div className="min-w-0">
                        <p className="font-bold text-[#0E1B3D] group-hover:text-[#C84B11] text-base leading-tight transition-colors truncate">{evt.name}</p>
                      </div>

                      {/* College */}
                      <div className="min-w-0">
                        <p className="text-sm text-gray-600 font-medium truncate">{evt.collegeName}</p>
                      </div>

                      {/* Date */}
                      <div className="min-w-0">
                        <p className="text-sm text-gray-500 truncate">{new Date(evt.dateTime).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</p>
                      </div>

                      {/* City */}
                      <div className="min-w-0">
                        <span className="text-sm text-gray-600 font-medium truncate block">{evt.city}</span>
                      </div>

                      {/* Seats */}
                      <div className="min-w-0">
                        <p className="font-extrabold text-[#C84B11] text-base truncate">{evt.registeredCount}<span className="text-gray-300 font-normal text-sm">/{evt.capacity}</span></p>
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden mt-1 max-w-[110px]">
                          <div className={`h-full rounded-full ${pct >= 100 ? 'bg-[#C84B11]' : 'bg-[#C84B11]'}`} style={{ width: `${pct}%` }}/>
                        </div>
                      </div>

                      {/* Waitlist count */}
                      <div className="min-w-0">
                        <p className="font-extrabold text-amber-500 text-base">{evt.waitlistCount || 0}</p>
                      </div>

                      {/* Check-In count */}
                      <div className="min-w-0">
                        <p className="font-extrabold text-emerald-600 text-base">{evt.checkedInCount || 0}</p>
                      </div>

                      {/* Start Check-In — own column */}
                      <div className="flex justify-start" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={e => toggleCheckin(evt, e)}
                          disabled={!!isCheckinLoading || isCompleted}
                          title={evt.checkInStarted ? 'Stop Check-In' : 'Start Check-In'}
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all disabled:opacity-50 ${
                            isCompleted
                              ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
                              : evt.checkInStarted
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
                      <div className="flex justify-start min-w-0">
                        <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${STATUS_STYLE[ds]}`}>{ds}</span>
                      </div>

                      {/* Actions — icon-only Edit + Delete */}
                      <div className="flex items-center justify-start gap-1.5" onClick={e => e.stopPropagation()}>
                        {evt.status !== 'COMPLETED' && (
                          <button
                            onClick={e => completeEvent(evt.eventId, e)}
                            disabled={!!isCompleteLoading}
                            title="Mark Completed"
                            className="w-8 h-8 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 flex items-center justify-center transition-all disabled:opacity-50">
                            {isCompleteLoading
                              ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"/>
                              : <CheckCircleIcon className="w-3.5 h-3.5"/>}
                          </button>
                        )}
                        {/* Edit icon */}
                        <Link
                          href={`/admin/events/${evt.eventId}/edit`}
                          title="Edit Event"
                          onClick={e => { if (isCompleted) e.preventDefault(); e.stopPropagation(); }}
                          aria-disabled={isCompleted}
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
                            isCompleted
                              ? 'border-gray-200 bg-gray-50 text-gray-300 pointer-events-none'
                              : 'border-[#0E1B3D]/20 text-[#0E1B3D] hover:border-[#0E1B3D] hover:bg-[#0E1B3D]/5'
                          }`}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </Link>

                        {/* Delete icon */}
                        <button
                          onClick={e => deleteEvent(evt.eventId, e)}
                          disabled={!!isDeleteLoading || isCompleted}
                          title={isDeleteConfirm ? 'Click again to confirm delete' : 'Delete Event'}
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all disabled:opacity-50 ${
                            isCompleted
                              ? 'bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed'
                              : isDeleteConfirm
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
                  const isCompleted = evt.status === 'COMPLETED';
                  const isCheckinLoading = actionLoading === evt.eventId + '-checkin';
                  const isCompleteLoading = actionLoading === evt.eventId + '-complete';
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
                      
                      <div className="grid grid-cols-3 gap-3 mb-4 mt-3">
                        <div className="bg-[#C84B11]/5 rounded-lg p-3 text-center border border-[#C84B11]/20">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-[#C84B11]/60 mb-0.5">Seats</p>
                          <p className="font-extrabold text-[#C84B11] text-lg leading-none">{evt.registeredCount}<span className="text-[#C84B11]/40 font-normal text-xs">/{evt.capacity}</span></p>
                          <div className="h-1 bg-[#C84B11]/20 rounded-full overflow-hidden mt-1.5 w-full max-w-[80px] mx-auto">
                            <div className={`h-full rounded-full ${pct >= 100 ? 'bg-[#C84B11]' : 'bg-[#C84B11]'}`} style={{ width: `${pct}%` }}/>
                          </div>
                        </div>
                        <div className="bg-amber-50/50 rounded-lg p-3 text-center border border-amber-100/50">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600/50 mb-0.5">Waitlist</p>
                          <p className="font-extrabold text-amber-500 text-xl leading-none mt-1">{evt.waitlistCount || 0}</p>
                        </div>
                        <div className="bg-emerald-50/50 rounded-lg p-3 text-center border border-emerald-100/50">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/50 mb-0.5">Checked In</p>
                          <p className="font-extrabold text-emerald-600 text-xl leading-none mt-1">{evt.checkedInCount || 0}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 border-t border-gray-50 pt-3 mt-1" onClick={e => e.stopPropagation()}>
                        <button onClick={e => toggleCheckin(evt, e)} disabled={!!isCheckinLoading || isCompleted}
                          className={`min-h-[52px] rounded-lg border px-3 py-2.5 flex items-center justify-center gap-1.5 transition-all text-sm font-bold shadow-sm text-center disabled:opacity-50 ${
                            isCompleted
                              ? 'bg-gray-50 border-gray-200 text-gray-300'
                              : evt.checkInStarted
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
                                : 'bg-white border-gray-200 text-gray-600'
                          }`}>
                          {isCheckinLoading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/> : evt.checkInStarted ? <><CheckCircleIcon className="w-4 h-4"/> Stop Check-In</> : <><ClockIcon className="w-4 h-4"/> Start Check-In</>}
                        </button>

                        {evt.status !== 'COMPLETED' && (
                          <button onClick={e => completeEvent(evt.eventId, e)} disabled={!!isCompleteLoading}
                            className="min-h-[52px] rounded-lg border px-3 py-2.5 flex items-center justify-center gap-1.5 transition-all text-sm font-bold shadow-sm bg-emerald-50 border-emerald-200 text-emerald-600 disabled:opacity-50">
                            {isCompleteLoading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/> : <><CheckCircleIcon className="w-4 h-4"/> Complete</>}
                          </button>
                        )}
                        
                        <Link
                          href={`/admin/events/${evt.eventId}/edit`}
                          onClick={e => { if (isCompleted) e.preventDefault(); }}
                          aria-disabled={isCompleted}
                          className={`min-h-[52px] flex items-center justify-center rounded-lg border transition-colors shadow-sm ${
                            isCompleted
                              ? 'bg-gray-50 border-gray-200 text-gray-300 pointer-events-none'
                              : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-500'
                          }`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </Link>
                        
                        <button onClick={e => deleteEvent(evt.eventId, e)} disabled={!!isDeleteLoading || isCompleted} className={`min-h-[52px] flex items-center justify-center rounded-lg border shadow-sm transition-all ${
                          isCompleted
                            ? 'bg-gray-50 border-gray-200 text-gray-300'
                            : isDeleteConfirm
                              ? 'bg-red-50 border-red-300 text-red-600'
                              : 'bg-white hover:bg-red-50 hover:border-red-200 border-gray-200 text-gray-400 hover:text-red-500'
                        }`}>
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

    </AdminLayout>
  );
}




