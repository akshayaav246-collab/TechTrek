import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';

type SummaryData = {
  totalEvents: number; upcoming: number; soldOut: number; completed: number;
  totalRegistrations: number; totalCheckins: number; totalWaitlist: number; checkInRate: number;
  totalRevenue: number;
};
type TopCity = { city: string; count: number };
type Activity = {
  type: string; studentName: string; studentEmail: string; college: string;
  eventName: string; status: string; time: string;
};
type EventRow = {
  eventId: string; name: string; city: string; status: string;
  registeredCount: number; capacity: number; checkedInCount: number; waitlistCount: number; dateTime: string;
  amount: number; revenue: number;
};

const Metric = ({ label, value, sub, accent, onClick }: { label: string; value: string | number; sub?: string; accent: string; onClick?: () => void }) => (
  <div onClick={onClick} className={`bg-white rounded-2xl p-6 border-l-4 ${accent} shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}>
    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 flex items-center justify-between">
      {label}
      {onClick && <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>}
    </p>
    <p className="text-4xl font-extrabold text-[#0E1B3D] leading-none">{value}</p>
    {sub && <p className="text-xs text-gray-500 mt-2">{sub}</p>}
  </div>
);

export default function AdminPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [topCities, setTopCities] = useState<TopCity[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRevenueModal, setShowRevenueModal] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [analyticsRes, eventsRes] = await Promise.all([
        fetch('http://localhost:5000/api/events/analytics', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/events/mine', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (analyticsRes.ok) {
        const d = await analyticsRes.json();
        setSummary(d.summary); setTopCities(d.topCities); setActivity(d.recentActivity);
        setEvents(d.events);
      } else if (eventsRes.ok) {
        setEvents(await eventsRes.json());
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    if (!user || !token) { router.push('/admin/login'); return; }
    if (user.role !== 'admin' && user.role !== 'superAdmin') { router.push('/'); return; }
    fetchData();
  }, [user, token, router, fetchData]);

  const markComplete = async (eventId: string) => {
    if (!confirm('Mark this event as COMPLETED?')) return;
    await fetch(`http://localhost:5000/api/events/${eventId}/complete`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${token}` }
    });
    fetchData();
  };

  if (!user || (user.role !== 'admin' && user.role !== 'superAdmin')) return null;

  const maxCity = topCities[0]?.count || 1;
  const statusConfig = [
    { label: 'Open',      value: summary?.upcoming   || 0, color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700' },
    { label: 'Sold Out',  value: summary?.soldOut     || 0, color: 'bg-red-500',     light: 'bg-red-50 text-red-700' },
    { label: 'Completed', value: summary?.completed   || 0, color: 'bg-gray-400',    light: 'bg-gray-100 text-gray-600' },
  ];

  return (
    <AdminLayout 
      title="Dashboard"
      headerActions={
        <Link href="/admin/create-event"
          className="bg-[#E8831A] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#d4741a] transition-colors shadow-sm w-full sm:w-auto text-center">
          + Create Event
        </Link>
      }
    >
      <div className="space-y-8">

        {/* ── Metric Cards ─────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="bg-white rounded-2xl p-6 h-28 animate-pulse" />)}
          </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Metric label="Total Events"    value={summary?.totalEvents || events.length} accent="border-[#0E1B3D]" />
              <Metric label="Registrations"   value={summary?.totalRegistrations || 0} sub={`+${summary?.totalWaitlist || 0} on waitlist`} accent="border-[#E8831A]" />
              <Metric label="Checked In"      value={summary?.totalCheckins || 0}      sub={`${summary?.checkInRate || 0}% check-in rate`} accent="border-emerald-500" />
              <Metric label="Sold Out Events" value={summary?.soldOut || 0}             accent="border-red-500" />
              <Metric label="Total Revenue"   value={`₹${(summary?.totalRevenue || 0).toLocaleString('en-IN')}`} accent="border-blue-500" onClick={() => setShowRevenueModal(true)} />
            </div>
          )}

          {/* ── Middle row: Status + Top Cities ──────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Event Status Breakdown */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-heading font-bold text-lg text-[#0E1B3D] mb-5">Event Status</h2>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {statusConfig.map(s => (
                  <div key={s.label} className={`rounded-2xl p-4 text-center ${s.light}`}>
                    <p className="text-3xl font-extrabold leading-none">{s.value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-70">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {statusConfig.map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500 font-medium">{s.label}</span>
                      <span className="text-gray-700 font-bold">{s.value}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${s.color}`}
                        style={{ width: summary?.totalEvents ? `${Math.round((s.value / summary.totalEvents) * 100)}%` : '0%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Cities */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h2 className="font-heading font-bold text-lg text-[#0E1B3D] mb-5">Top Cities by Registrations</h2>
              {topCities.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No data yet</p>
              ) : (
                <div className="space-y-4">
                  {topCities.map((c, i) => (
                    <div key={c.city}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-bold text-[#0E1B3D] flex items-center gap-2">
                          <span className="text-[#E8831A] font-extrabold text-xs">#{i + 1}</span> {c.city}
                        </span>
                        <span className="text-gray-500 font-bold">{c.count} regs</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#E8831A] to-[#0E1B3D] rounded-full transition-all duration-700"
                          style={{ width: `${Math.round((c.count / maxCity) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Bottom row: Events table + Activity ──────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Events Table */}
            <div className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
                <h2 className="font-heading font-bold text-lg text-[#0E1B3D]">My Events</h2>
                <Link href="/admin/events" className="text-[#E8831A] text-xs font-bold hover:underline">View All →</Link>
              </div>
              {loading ? (
                <div className="px-6 py-8 space-y-3">{Array.from({length:3}).map((_,i) => <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse"/>)}</div>
              ) : events.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <p className="font-medium mb-3">No events yet.</p>
                  <Link href="/admin/create-event" className="text-[#E8831A] font-bold text-sm hover:underline">Create your first event →</Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {events.slice(0, 5).map(evt => {
                    const pct = Math.min(100, Math.round((evt.registeredCount / evt.capacity) * 100));
                    const isSoldOut = evt.registeredCount >= evt.capacity && evt.status === 'UPCOMING';
                    return (
                      <div key={evt.eventId} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-center">
                          <div className="flex-1 min-w-0 mr-4">
                            <p className="font-bold text-[#0E1B3D] text-sm truncate">{evt.name}</p>
                            <p className="text-gray-400 text-xs mt-0.5">{evt.city}</p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${isSoldOut ? 'bg-red-100 text-red-600' : evt.status === 'COMPLETED' ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-700'}`}>
                              {isSoldOut ? 'Sold Out' : evt.status}
                            </span>
                            <div className="text-right">
                              <p className="font-extrabold text-[#E8831A] text-base leading-none">{evt.registeredCount}</p>
                              <p className="text-[10px] text-gray-400">/ {evt.capacity}</p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${isSoldOut ? 'bg-red-500' : 'bg-[#E8831A]'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50">
                <h2 className="font-heading font-bold text-lg text-[#0E1B3D]">Recent Activity</h2>
              </div>
              {activity.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-16 font-medium">No activity yet</p>
              ) : (
                <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
                  {activity.map((a, i) => (
                    <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${a.type === 'checkin' ? 'bg-emerald-100 text-emerald-600' : a.status === 'WAITLISTED' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                        {a.type === 'checkin' ? (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        ) : a.status === 'WAITLISTED' ? (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#0E1B3D] text-xs truncate">{a.studentName}</p>
                        <p className="text-gray-400 text-[10px] truncate">{a.type === 'checkin' ? 'Checked in to' : a.status === 'WAITLISTED' ? 'Waitlisted for' : 'Registered for'} {a.eventName}</p>
                        <p className="text-gray-300 text-[10px] mt-0.5">{a.college}</p>
                      </div>
                      <span className="text-[10px] text-gray-300 shrink-0">
                        {new Date(a.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

      </div>

      {/* ── Revenue Modal ────────────────────────────────────────── */}
      {showRevenueModal && (
        <div className="fixed inset-0 bg-[#0E1B3D]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-body">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="font-heading font-extrabold text-[#0E1B3D] text-xl">Revenue Breakdown</h3>
                <p className="text-xs text-gray-500 mt-0.5">Total collected across all events</p>
              </div>
              <button onClick={() => setShowRevenueModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {events.filter(e => e.revenue > 0).length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-[#E8831A]">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <p className="font-medium text-gray-500">No revenue generated yet.</p>
                  <p className="text-xs mt-1">Events with a registration fee will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {events.filter(e => e.revenue > 0).sort((a,b) => b.revenue - a.revenue).map((evt) => (
                    <div key={evt.eventId} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white shadow-sm hover:border-blue-100 transition-colors">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">{evt.eventId}</span>
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${evt.status === 'COMPLETED' ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-700'}`}>
                            {evt.status}
                          </span>
                        </div>
                        <p className="font-bold text-[#0E1B3D] text-sm truncate">{evt.name}</p>
                      </div>
                      <div className="flex items-center gap-6 shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-gray-400 mb-0.5 font-medium">Students</p>
                          <p className="font-bold text-[#0E1B3D] text-sm">{evt.registeredCount} <span className="text-gray-300 text-[10px] font-normal">× ₹{evt.amount}</span></p>
                        </div>
                        <div className="w-px h-8 bg-gray-100"></div>
                        <div className="text-right min-w-[80px]">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">collected</p>
                          <p className="font-extrabold text-emerald-600 text-lg">₹{evt.revenue.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
              <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Net Revenue</span>
              <span className="font-extrabold text-2xl text-emerald-600">₹{(summary?.totalRevenue || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

