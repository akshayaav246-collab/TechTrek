"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import { SearchIcon, DownloadIcon, CheckCircleIcon } from '@/components/Icons';
import { useLocalToast } from '@/components/ui/Toast';

type Participant = {
  _id: string; name: string; email: string; phone: string; college: string;
  year: string; discipline: string; status: string; checkedIn: boolean;
  checkedInAt: string | null; registeredAt: string;
};
type EventInfo = { eventId: string; name: string; capacity: number; status: string; venue: string; dateTime: string; };
type EventRow = { eventId: string; status: string; dateTime: string; };

const STATUS_STYLE: Record<string, string> = {
  REGISTERED: 'bg-blue-100 text-blue-700',
  WAITLISTED:  'bg-amber-100 text-amber-700',
  CHECKED_IN:  'bg-emerald-100 text-emerald-700',
  CANCELLED:   'bg-gray-100 text-gray-500',
};

export default function RegistrationsPage() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const { showToast, ToastContainer } = useLocalToast();

  const [loading, setLoading] = useState(true);
  const [firstEventId, setFirstEventId] = useState<string | null>(null);
  
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [downloading, setDownloading] = useState(false);

  // 1. Fetch the first upcoming event
  useEffect(() => {
    if (isLoading || !token) return;
    fetch('http://localhost:5000/api/events/mine', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        const events = (Array.isArray(data) ? data : []) as EventRow[];
        const upcomingEvent = events.find(e => e.status === 'UPCOMING');
        if (upcomingEvent) {
          setFirstEventId(upcomingEvent.eventId);
        } else {
          setLoading(false);
        }
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, [token, isLoading]);

  // 2. Fetch the participants for that event
  const fetchParticipants = useCallback(async () => {
    if (!token || !firstEventId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/events/${firstEventId}/participants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEventInfo(data.event);
        setParticipants(data.participants);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [token, firstEventId]);

  useEffect(() => {
    if (!firstEventId) return;
    fetchParticipants();
    const id = setInterval(fetchParticipants, 15000);
    return () => clearInterval(id);
  }, [firstEventId, fetchParticipants]);

  // Handle SSE for real-time updates
  useEffect(() => {
    if (!firstEventId || !token) return;
    const stream = new EventSource(`http://localhost:5000/api/admin/alerts/stream?token=${encodeURIComponent(token)}`);
    const syncParticipants = () => fetchParticipants();

    stream.addEventListener('attendance-alert', syncParticipants);
    stream.addEventListener('registration-cancelled', syncParticipants);
    stream.addEventListener('participant-promoted', syncParticipants);

    return () => {
      stream.removeEventListener('attendance-alert', syncParticipants);
      stream.removeEventListener('registration-cancelled', syncParticipants);
      stream.removeEventListener('participant-promoted', syncParticipants);
      stream.close();
    };
  }, [firstEventId, token, fetchParticipants]);

  const downloadCSV = async () => {
    if (!token || !firstEventId) return;
    if (participants.length === 0) {
      showToast('No participants to download.', 'warning');
      return;
    }
    setDownloading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/events/${firstEventId}/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `participants-${firstEventId}.csv`; a.click();
      URL.revokeObjectURL(url);
      showToast('CSV downloaded!', 'success');
    } catch { showToast('CSV download failed. Please try again.', 'error'); }
    finally { setDownloading(false); }
  };

  const filtered = participants.filter(p => {
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  if (isLoading) return null;
  if (!user || (user.role !== 'admin' && user.role !== 'superAdmin')) {
    router.push('/admin/login'); return null;
  }

  const headerTitle = (
    <div>
      <span className="font-bold text-2xl text-[#1C1A17]">Registrations</span>
      {eventInfo && <p className="text-xs text-[#7A7166] mt-1">Showing data for first upcoming event: <span className="font-bold">{eventInfo.name}</span></p>}
    </div>
  );

  return (
    <>
      <ToastContainer />
      <AdminLayout title={headerTitle}>
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {loading ? (
             <div className="p-8 space-y-3 bg-white rounded-3xl border border-gray-100">
               {Array.from({length:5}).map((_,i) => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse"/>)}
             </div>
          ) : !firstEventId ? (
             <div className="bg-white rounded-3xl border border-gray-100 p-10 text-center">
               <p className="text-[#1C1A17] font-bold text-lg">No upcoming events found</p>
               <p className="text-[#7A7166] text-sm mt-2">There currently are no upcoming events to show registrations for.</p>
             </div>
          ) : (
            <>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name or email…"
                    className="w-full pl-10 pr-4 py-2.5 border border-[#E2D8CC] rounded-xl text-sm text-[#1C1A17] placeholder-gray-400 outline-none focus:border-[#C84B11] bg-white"/>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 hide-scrollbar shrink-0 w-[calc(100%+2rem)] sm:w-auto">
                  {(['ALL','REGISTERED','WAITLISTED','CHECKED_IN'] as const).map(f => (
                    <button key={f} onClick={() => setStatusFilter(f)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${statusFilter === f ? 'bg-[#0E1B3D] text-white border-[#0E1B3D] shadow' : 'bg-white border-[#E2D8CC] text-gray-500 hover:border-gray-300'}`}>
                      {f === 'ALL' ? 'All' : f.replace('_', ' ')}
                      <span className="ml-1.5 opacity-60 text-[10px]">
                        ({f === 'ALL' ? participants.length : participants.filter(p => p.status === f).length})
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-3xl shadow-sm border border-[#E2D8CC] overflow-hidden">
                <div className="overflow-x-auto">
                  {filtered.length === 0 ? (
                    <div className="text-center py-16">
                      <SearchIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-400 font-medium">No participants found</p>
                      {search && <button onClick={() => setSearch('')} className="mt-3 text-[#C84B11] text-sm font-bold hover:underline">Clear search</button>}
                    </div>
                  ) : (
                    <>
                      {/* Desktop/Tablet Table View */}
                      <div className="hidden md:block overflow-x-auto w-full">
                        <table className="w-full min-w-[800px]">
                          <thead>
                            <tr className="border-b border-[#FAF7F2]">
                              {['S.No','Name','Email','Phone','College','Status','Checked-In','Registered At','Checked-In At'].map(h => (
                                <th key={h} className="text-left px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-[#7A7166]">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#FAF7F2]">
                            {filtered.map((p, i) => (
                              <tr key={p._id} className="hover:bg-[#FAF7F2]/50 transition-colors">
                                <td className="px-5 py-4 text-xs text-gray-400 font-bold">{i+1}</td>
                                <td className="px-5 py-4">
                                  <div>
                                    <p className="font-bold text-[#1C1A17] text-sm">{p.name}</p>
                                    <p className="text-[10px] text-[#7A7166]">{p.discipline}</p>
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-sm text-[#5F574E] font-medium">{p.email}</td>
                                <td className="px-5 py-4 text-sm text-[#5F574E]">{p.phone}</td>
                                <td className="px-5 py-4 text-sm text-[#5F574E] max-w-[160px] truncate">{p.college}</td>
                                <td className="px-5 py-4">
                                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${STATUS_STYLE[p.status] || 'bg-gray-100 text-gray-500'}`}>
                                    {p.status.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="px-5 py-4">
                                  {p.checkedIn ? (
                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-600" title="Checked in">
                                      <CheckCircleIcon className="w-4 h-4" />
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#FAF7F2] text-[#7A7166]" title="Not checked in">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                                      </svg>
                                    </span>
                                  )}
                                </td>
                                <td className="px-5 py-4 text-xs text-[#7A7166] whitespace-nowrap">{fmt(p.registeredAt)}</td>
                                <td className="px-5 py-4 text-xs text-[#7A7166] whitespace-nowrap">{fmt(p.checkedInAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="md:hidden flex flex-col gap-4 p-4 sm:p-6 bg-[#FAF7F2]/50">
                        {filtered.map(p => (
                          <div key={p._id} className="bg-white rounded-xl p-4 border border-[#E2D8CC] shadow-sm relative">
                            <div className="flex justify-between items-start mb-3 border-b border-[#FAF7F2] pb-3">
                              <div>
                                <h3 className="font-bold text-[#1C1A17] text-lg leading-tight mb-0.5">{p.name}</h3>
                                <p className="text-[10px] text-[#7A7166] font-medium mb-1">{p.discipline}</p>
                                <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded-md ${STATUS_STYLE[p.status] || 'bg-gray-100 text-gray-500'}`}>{p.status.replace('_', ' ')}</span>
                              </div>
                            </div>
                            <div className="space-y-2 mb-3">
                              <p className="text-xs text-[#5F574E] flex justify-between"><span className="text-[#7A7166]">Email:</span> <span className="font-medium truncate ml-2">{p.email}</span></p>
                              <p className="text-xs text-[#5F574E] flex justify-between"><span className="text-[#7A7166]">Phone:</span> <span className="font-medium">{p.phone}</span></p>
                              <p className="text-xs text-[#5F574E] flex justify-between"><span className="text-[#7A7166]">College:</span> <span className="font-medium truncate ml-2 text-right max-w-[150px]">{p.college}</span></p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#FAF7F2]">
                              <div className="bg-[#FAF7F2] rounded-lg p-2 text-center">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-[#7A7166] mb-0.5">Registered</p>
                                <p className="text-[10px] text-[#5F574E] font-medium">{fmt(p.registeredAt)}</p>
                              </div>
                              <div className={`${p.checkedIn ? 'bg-emerald-50' : 'bg-[#FAF7F2]'} rounded-lg p-2 text-center`}>
                                <p className={`text-[9px] font-bold uppercase tracking-widest mb-0.5 ${p.checkedIn ? 'text-emerald-600/60' : 'text-[#7A7166]'}`}>Checked-In</p>
                                <div className="flex items-center justify-center gap-1.5">
                                  {p.checkedIn ? (
                                    <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                                    </svg>
                                  )}
                                  <p className={`text-[10px] font-medium ${p.checkedIn ? 'text-emerald-600' : 'text-gray-500'}`}>{fmt(p.checkedInAt)}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {filtered.length > 0 && (
                  <div className="px-5 py-4 border-t border-[#FAF7F2] flex items-center justify-between bg-gray-50/50">
                    <p className="text-xs text-[#7A7166]">Showing <span className="font-bold text-[#1C1A17]">{filtered.length}</span> of <span className="font-bold text-[#1C1A17]">{participants.length}</span> participants</p>
                    <button onClick={downloadCSV} disabled={downloading || participants.length === 0}
                      className="text-xs font-bold text-[#0E1B3D] bg-white border border-[#E2D8CC] px-4 py-2 rounded-lg shadow-sm hover:border-[#1C1A17] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                      <DownloadIcon className="w-3.5 h-3.5" /> Export filtered list
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </AdminLayout>
    </>
  );
}
