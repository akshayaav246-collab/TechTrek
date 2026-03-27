"use client";
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { SearchIcon, DownloadIcon, BuildingIcon, GridIcon, PlusIcon, QrIcon, ListIcon, ArrowLeftIcon, LocationIcon } from '@/components/Icons';

type Participant = {
  _id: string; name: string; email: string; phone: string; college: string;
  year: string; discipline: string; status: string; checkedIn: boolean;
  checkedInAt: string | null; registeredAt: string;
};
type Stats = { total: number; registered: number; waitlisted: number; checkedIn: number; noShow: number };
type EventInfo = { eventId: string; name: string; capacity: number; status: string; venue: string; dateTime: string };

const STATUS_STYLE: Record<string, string> = {
  REGISTERED: 'bg-blue-100 text-blue-700',
  WAITLISTED:  'bg-amber-100 text-amber-700',
  CHECKED_IN:  'bg-emerald-100 text-emerald-700',
  CANCELLED:   'bg-gray-100 text-gray-500',
};

function StatCard({ label, val, color, sub }: { label: string; val: number; color: string; sub?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col gap-1">
      <p className={`font-extrabold text-3xl ${color}`}>{val}</p>
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</p>
      {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
    </div>
  );
}

export default function AdminEventDashboard() {
  const { user, token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;

  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [downloading, setDownloading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:5000/api/events/${eventId}/participants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { router.push('/admin/events'); return; }
      const data = await res.json();
      setEventInfo(data.event);
      setStats(data.stats);
      setParticipants(data.participants);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [token, eventId, router]);

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'superAdmin')) {
      router.push('/admin/login'); return;
    }
    fetchData();
    const id = setInterval(fetchData, 15000); // poll every 15s
    return () => clearInterval(id);
  }, [user, fetchData, router]);

  const downloadCSV = async () => {
    if (!token) return;
    setDownloading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/events/${eventId}/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `participants-${eventId}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('CSV download failed'); }
    finally { setDownloading(false); }
  };

  const filtered = participants.filter(p => {
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  if (!user || (user.role !== 'admin' && user.role !== 'superAdmin')) return null;

  const headerTitle = (
    <div>
      <Link href="/admin/events" className="text-gray-400 text-xs hover:text-gray-600 inline-flex items-center gap-1 mb-2">
        <ArrowLeftIcon className="w-3 h-3" /> All Events
      </Link>
      <p className="text-[#e8631a] text-[10px] font-bold uppercase tracking-widest mb-1">Event Dashboard</p>
      {loading ? (
        <div className="h-8 w-60 bg-gray-200 rounded-lg animate-pulse"/>
      ) : (
        <span className="font-heading font-extrabold text-2xl text-[#0E1B3D]">{eventInfo?.name}</span>
      )}
      {eventInfo && (
        <p className="text-gray-400 text-xs mt-1 flex items-center gap-1.5 font-medium"><LocationIcon className="w-3.5 h-3.5 text-[#e8631a]" /> {eventInfo.venue} <span className="text-gray-300 mx-1">•</span> ID: {eventInfo.eventId}</p>
      )}
    </div>
  );

  return (
    <AdminLayout 
      title={headerTitle}
      headerActions={
        <>
          <Link href={`/admin/events/${eventId}/edit`}
            className="flex items-center justify-center gap-2 border border-[#0E1B3D]/30 text-[#0E1B3D] hover:bg-[#0E1B3D] hover:text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm bg-white w-full sm:w-auto">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit Details
          </Link>
          <button onClick={downloadCSV} disabled={downloading || loading}
            className="flex items-center justify-center gap-2 bg-[#0E1B3D] hover:bg-[#1a2d5a] text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow disabled:opacity-50 w-full sm:w-auto">
            {downloading ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : <DownloadIcon className="w-4 h-4" />} Download CSV
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({length:5}).map((_,i) => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-gray-100"/>)}
          </div>
        ) : stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="Total Capacity" val={eventInfo?.capacity ?? 0} color="text-[#0E1B3D]"/>
            <StatCard label="Registered" val={stats.registered} color="text-[#e8631a]"/>
            <StatCard label="Waitlisted" val={stats.waitlisted} color="text-amber-500"/>
            <StatCard label="Checked-In" val={stats.checkedIn} color="text-emerald-600"/>
            {eventInfo?.status === 'COMPLETED' ? (
              <StatCard label="No-Show" val={stats.noShow} color="text-red-500" sub="Registered but absent"/>
            ) : (
              <StatCard label="Pending" val={stats.noShow} color="text-gray-400" sub="Haven't checked in yet"/>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-[#e8631a] bg-white"/>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:pb-0 hide-scrollbar shrink-0 w-[calc(100%+2rem)] sm:w-auto">
            {(['ALL','REGISTERED','WAITLISTED','CHECKED_IN'] as const).map(f => (
              <button key={f} onClick={() => setStatusFilter(f)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${statusFilter === f ? 'bg-[#0E1B3D] text-white border-[#0E1B3D] shadow' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                {f === 'ALL' ? 'All' : f.replace('_', ' ')}
                <span className="ml-1.5 opacity-60 text-[10px]">
                  ({f === 'ALL' ? participants.length : participants.filter(p => p.status === f).length})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 space-y-3">
                {Array.from({length:5}).map((_,i) => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse"/>)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <SearchIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">No participants found</p>
                {search && <button onClick={() => setSearch('')} className="mt-3 text-[#e8631a] text-sm font-bold hover:underline">Clear search</button>}
              </div>
            ) : (
              // Inner Fragment replacing direct render
              <>
              {/* Desktop/Tablet Table View */}
              <div className="hidden md:block overflow-x-auto w-full">
                <table className="w-full min-w-[800px]">
                  <thead>
                  <tr className="border-b border-gray-50">
                    {['S.No','Name','Email','Phone','College','Status','Registered At','Checked-In At'].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((p, i) => (
                    <tr key={p._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4 text-xs text-gray-300 font-bold">{i+1}</td>
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-bold text-[#0E1B3D] text-sm">{p.name}</p>
                          <p className="text-[10px] text-gray-400">{p.discipline}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 font-medium">{p.email}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">{p.phone}</td>
                      <td className="px-5 py-4 text-sm text-gray-600 max-w-[160px] truncate">{p.college}</td>
                      <td className="px-5 py-4">
                        <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${STATUS_STYLE[p.status] || 'bg-gray-100 text-gray-500'}`}>
                          {p.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">{fmt(p.registeredAt)}</td>
                      <td className="px-5 py-4 text-xs text-gray-500 whitespace-nowrap">{fmt(p.checkedInAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden flex flex-col gap-4 p-4 sm:p-6 bg-gray-50/50">
              {filtered.map(p => (
                <div key={p._id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm relative">
                  <div className="flex justify-between items-start mb-3 border-b border-gray-50 pb-3">
                    <div>
                      <h3 className="font-bold text-[#0E1B3D] text-lg leading-tight mb-0.5">{p.name}</h3>
                      <p className="text-[10px] text-gray-400 font-medium mb-1">{p.discipline}</p>
                      <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded-md ${STATUS_STYLE[p.status] || 'bg-gray-100 text-gray-500'}`}>{p.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <p className="text-xs text-gray-600 flex justify-between"><span className="text-gray-400">Email:</span> <span className="font-medium truncate ml-2">{p.email}</span></p>
                    <p className="text-xs text-gray-600 flex justify-between"><span className="text-gray-400">Phone:</span> <span className="font-medium">{p.phone}</span></p>
                    <p className="text-xs text-gray-600 flex justify-between"><span className="text-gray-400">College:</span> <span className="font-medium truncate ml-2 text-right max-w-[150px]">{p.college}</span></p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-50">
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Registered</p>
                      <p className="text-[10px] text-gray-600 font-medium">{fmt(p.registeredAt)}</p>
                    </div>
                    <div className={`${p.checkedIn ? 'bg-emerald-50' : 'bg-gray-50'} rounded-lg p-2 text-center`}>
                      <p className={`text-[9px] font-bold uppercase tracking-widest mb-0.5 ${p.checkedIn ? 'text-emerald-600/60' : 'text-gray-400'}`}>Checked-In</p>
                      <p className={`text-[10px] font-medium ${p.checkedIn ? 'text-emerald-600' : 'text-gray-500'}`}>{fmt(p.checkedInAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </>
            )}
          </div>
          {!loading && filtered.length > 0 && (
            <div className="px-5 py-3.5 border-t border-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-400">Showing <span className="font-bold text-gray-600">{filtered.length}</span> of <span className="font-bold text-gray-600">{participants.length}</span> participants</p>
              <button onClick={downloadCSV} disabled={downloading}
                className="text-xs font-bold text-[#e8631a] hover:underline flex items-center gap-1 disabled:opacity-50">
                <DownloadIcon className="w-3 h-3" /> Export filtered list
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
