"use client";
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
type KpiKey = 'events' | 'active' | 'registrations' | 'revenue';

const formatRevenue = (rev: number) => {
  if (rev >= 100000) return `₹${(rev/100000).toFixed(1)}L`;
  if (rev >= 1000) return `₹${(rev/1000).toFixed(1)}K`;
  return `₹${rev}`;
};

const renderTrend = (trendStr: string) => {
  const match = trendStr.match(/^(\S+\s+)?(\d+(?:\.\d+)?%?)(.*)$/);
  if (!match) return trendStr;

  const [, prefix = '', value = '', suffix = ''] = match;
  return (
    <>
      <span className="text-[14px] font-black leading-none">{prefix.trim()}</span>
      <span className="text-[16px] font-black leading-none">{value}</span>
      <span className="text-[12px] font-extrabold leading-none">{suffix}</span>
    </>
  );
};

const mapEventRow = (event: Partial<EventRow> & { eventId?: string; _id?: string }) => ({
  eventId: event.eventId || event._id || '',
  name: event.name || 'Untitled Event',
  city: event.city || '—',
  status: event.status || 'UPCOMING',
  registeredCount: Number(event.registeredCount || 0),
  capacity: Number(event.capacity || 0),
  checkedInCount: Number(event.checkedInCount || 0),
  waitlistCount: Number(event.waitlistCount || 0),
  dateTime: event.dateTime || new Date().toISOString(),
  amount: Number(event.amount || 0),
  revenue: Number(event.revenue || (Number(event.registeredCount || 0) * Number(event.amount || 0))),
});

const deriveAnalytics = (events: EventRow[]) => {
  const upcoming = events.filter(event => event.status === 'UPCOMING' && event.registeredCount < event.capacity).length;
  const soldOut = events.filter(event => event.status === 'UPCOMING' && event.registeredCount >= event.capacity).length;
  const completed = events.filter(event => event.status === 'COMPLETED').length;
  const totalRegistrations = events.reduce((sum, event) => sum + event.registeredCount, 0);
  const totalCheckins = events.reduce((sum, event) => sum + event.checkedInCount, 0);
  const totalWaitlist = events.reduce((sum, event) => sum + event.waitlistCount, 0);
  const totalRevenue = events.reduce((sum, event) => sum + event.revenue, 0);

  const cityMap = new Map<string, number>();
  events.forEach(event => {
    cityMap.set(event.city, (cityMap.get(event.city) || 0) + event.registeredCount);
  });

  const topCities = [...cityMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([city, count]) => ({ city, count }));

  return {
    summary: {
      totalEvents: events.length,
      upcoming,
      soldOut,
      completed,
      totalRegistrations,
      totalCheckins,
      totalWaitlist,
      totalRevenue,
      checkInRate: totalRegistrations > 0 ? Math.round((totalCheckins / totalRegistrations) * 100) : 0,
    },
    topCities,
    recentActivity: [],
    events,
  };
};

const Metric = ({
  icon,
  label,
  value,
  trendStr,
  trendColor,
  accent,
  labelColor,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trendStr: string;
  trendColor: string;
  accent: string;
  labelColor: string;
  onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`bg-[#FFFFFF] rounded-2xl p-6 ${accent} border border-[#E2D8CC] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col justify-between h-[160px] relative group overflow-hidden hover:-translate-y-[3px] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 duration-700 text-left w-full`}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    <div className="flex justify-between items-center relative z-10 w-full border-b border-[#FAF7F2] pb-4">
      <p className={`text-[13px] font-[DM_Sans] font-bold ${labelColor} tracking-wide uppercase`}>{label}</p>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#FAF7F2] border border-[#E2D8CC] shadow-sm shrink-0">
        {icon}
      </div>
    </div>
    <div className="relative z-10 flex items-end justify-between mt-auto pt-2">
      <p className="font-[Syne] font-[800] text-[40px] text-[#1C1A17] leading-none animate-in zoom-in-50 duration-500 delay-100">{value}</p>
      {trendStr && (
        <span className={`text-[12px] font-[DM_Sans] font-bold px-3.5 py-2 mb-1 rounded-full ${trendColor} shrink-0 inline-flex items-center gap-1.5 whitespace-nowrap`}>
          {renderTrend(trendStr)}
        </span>
      )}
    </div>
  </button>
);

export default function AdminPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [topCities, setTopCities] = useState<TopCity[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeKpi, setActiveKpi] = useState<KpiKey | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [analyticsRes, eventsRes, publicEventsRes] = await Promise.all([
        fetch('http://localhost:5000/api/events/analytics', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/events/mine', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/events'),
      ]);

      const ownEvents = eventsRes.ok ? (await eventsRes.json()) : [];
      const publicEvents = publicEventsRes.ok ? (await publicEventsRes.json()) : [];
      const fallbackEvents = (Array.isArray(ownEvents) && ownEvents.length > 0 ? ownEvents : publicEvents).map(mapEventRow);

      setEvents(fallbackEvents);

      if (analyticsRes.ok) {
        const analytics = await analyticsRes.json();
        if (analytics?.events?.length > 0) {
          setSummary(analytics.summary);
          setTopCities(analytics.topCities || []);
          setActivity(analytics.recentActivity || []);
          setEvents((analytics.events || []).map(mapEventRow));
        } else {
          const derived = deriveAnalytics(fallbackEvents);
          setSummary(derived.summary);
          setTopCities(derived.topCities);
          setActivity(derived.recentActivity);
        }
      } else {
        const derived = deriveAnalytics(fallbackEvents);
        setSummary(derived.summary);
        setTopCities(derived.topCities);
        setActivity(derived.recentActivity);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    if (!user || !token) { router.push('/admin/login'); return; }
    if (user.role !== 'admin' && user.role !== 'superAdmin') { router.push('/'); return; }
    fetchData();
  }, [user, token, router, fetchData]);

  if (!user || (user.role !== 'admin' && user.role !== 'superAdmin')) return null;

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const yearForLastMonth = thisMonth === 0 ? thisYear - 1 : thisYear;

  const eventsThisMonth = events.filter(e => new Date(e.dateTime).getMonth() === thisMonth && new Date(e.dateTime).getFullYear() === thisYear).length;
  const activeEventsWeek = events.filter(e => {
    if (e.status !== 'UPCOMING') return false;
    const diff = (new Date(e.dateTime).getTime() - now.getTime()) / (1000 * 3600 * 24);
    return diff >= 0 && diff <= 7;
  }).length;

  const regsThisMonth = events.filter(e => new Date(e.dateTime).getMonth() === thisMonth && new Date(e.dateTime).getFullYear() === thisYear).reduce((acc, e) => acc + e.registeredCount, 0);
  const regsLastMonth = events.filter(e => new Date(e.dateTime).getMonth() === lastMonth && new Date(e.dateTime).getFullYear() === yearForLastMonth).reduce((acc, e) => acc + e.registeredCount, 0);
  let regTrendStr = "0%"; let regTrendColor = "bg-emerald-50 text-emerald-600";
  if (regsLastMonth > 0) {
    const p = Math.round(((regsThisMonth - regsLastMonth) / regsLastMonth) * 100);
    regTrendStr = `${p > 0 ? '↑' : '↓'} ${Math.abs(p)}%`;
    regTrendColor = p >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600";
  } else if (regsThisMonth > 0) regTrendStr = "↑ 100%";

  const revThisMonth = events.filter(e => new Date(e.dateTime).getMonth() === thisMonth && new Date(e.dateTime).getFullYear() === thisYear).reduce((acc, e) => acc + e.revenue, 0);
  const revLastMonth = events.filter(e => new Date(e.dateTime).getMonth() === lastMonth && new Date(e.dateTime).getFullYear() === yearForLastMonth).reduce((acc, e) => acc + e.revenue, 0);
  let revTrendStr = "0%"; let revTrendColor = "bg-emerald-50 text-emerald-600";
  if (revLastMonth > 0) {
    const p = Math.round(((revThisMonth - revLastMonth) / revLastMonth) * 100);
    revTrendStr = `${p > 0 ? '↑' : '↓'} ${Math.abs(p)}%`;
    revTrendColor = p >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600";
  } else if (revThisMonth > 0) revTrendStr = "↑ 100%";

  const topEventsByReg = [...events].sort((a,b)=>b.registeredCount - a.registeredCount).slice(0, 5);
  const maxReg = topEventsByReg[0]?.registeredCount || 1;
  const topEventsByRev = [...events].sort((a,b)=>b.revenue - a.revenue).slice(0, 5);
  const maxRev = topEventsByRev[0]?.revenue || 1;
  const maxCity = topCities[0]?.count || 1;
  const openEvents = events.filter(event => event.status === 'UPCOMING');

  const kpiModalConfig: Record<KpiKey, {
    title: string;
    subtitle: string;
    empty: string;
    totalLabel: string;
    totalValue: string;
    rows: EventRow[];
    accentClass: string;
    valueLabel: (event: EventRow) => string;
    detailLabel: (event: EventRow) => string;
  }> = {
    events: {
      title: 'Total Events',
      subtitle: 'All events currently visible on the admin dashboard.',
      empty: 'No events available yet.',
      totalLabel: 'Total Events',
      totalValue: String(summary?.totalEvents || events.length),
      rows: [...events].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()),
      accentClass: 'text-[#C84B11]',
      valueLabel: event => `${event.registeredCount}/${event.capacity} seats`,
      detailLabel: event => `${new Date(event.dateTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · ${event.city}`,
    },
    active: {
      title: 'Active Events',
      subtitle: 'Upcoming events that are still live for operations.',
      empty: 'No active events right now.',
      totalLabel: 'Active Events',
      totalValue: String(summary?.upcoming || 0),
      rows: [...openEvents].sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()),
      accentClass: 'text-[#1A4A7A]',
      valueLabel: event => `${event.registeredCount}/${event.capacity} registered`,
      detailLabel: event => `${new Date(event.dateTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · ${event.city}`,
    },
    registrations: {
      title: 'Total Registrations',
      subtitle: 'Event-wise registration, waitlist, and check-in counts.',
      empty: 'No registration data available yet.',
      totalLabel: 'Total Registrations',
      totalValue: String(summary?.totalRegistrations || 0),
      rows: [...events].sort((a, b) => b.registeredCount - a.registeredCount),
      accentClass: 'text-[#C84B11]',
      valueLabel: event => `${event.registeredCount} registered`,
      detailLabel: event => `${event.waitlistCount} waitlist · ${event.checkedInCount} checked-in`,
    },
    revenue: {
      title: 'Revenue Generated',
      subtitle: 'Revenue contribution from each event.',
      empty: 'No revenue generated yet.',
      totalLabel: 'Total Revenue',
      totalValue: `₹${(summary?.totalRevenue || 0).toLocaleString('en-IN')}`,
      rows: [...events].filter(event => event.revenue > 0).sort((a, b) => b.revenue - a.revenue),
      accentClass: 'text-emerald-600',
      valueLabel: event => `₹${event.revenue.toLocaleString('en-IN')}`,
      detailLabel: event => `${event.registeredCount} × ₹${event.amount} · ${event.city}`,
    },
  };

  const activeKpiConfig = activeKpi ? kpiModalConfig[activeKpi] : null;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fillBar {
          0% { width: 0%; }
          100% { width: var(--target-width); }
        }
        .animate-fill-bar {
          animation: fillBar 1.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
      `}} />
    <AdminLayout 
      title="Dashboard"
      headerActions={
        <Link href="/admin/create-event"
          className="bg-gradient-to-r from-[#C84B11] to-[#E8622A] text-white px-6 py-2.5 rounded-xl font-[DM_Sans] font-bold text-sm hover:brightness-110 transition-all shadow-[0_4px_14px_rgba(200,75,17,0.3)] hover:shadow-[0_6px_20px_rgba(200,75,17,0.5)] w-full sm:w-auto text-center flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Create Event
        </Link>
      }
    >
      <div className="flex flex-col gap-6 h-full w-full pb-2">

        {/* ── Row 1: KPI Cards ─────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-[#FFFFFF] rounded-2xl min-h-[140px] animate-pulse border border-[#E2D8CC]" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both">
            <Metric 
              label="Total Events" 
              value={summary?.totalEvents || events.length} 
              trendStr={`↑ ${eventsThisMonth} this month`} 
              trendColor="bg-[#FAF7F2] text-[#C84B11] border border-[#E2D8CC]" 
              accent="border-t-[3px] border-t-[#C84B11]" 
              labelColor="text-[#C84B11]"
              onClick={() => setActiveKpi('events')}
              icon={<svg className="w-5 h-5 text-[#C84B11]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} 
            />
            <Metric 
              label="Active Events" 
              value={summary?.upcoming || 0} 
              trendStr={`↑ ${activeEventsWeek} this week`} 
              trendColor="bg-[#FAF7F2] text-[#1A4A7A] border border-[#E2D8CC]" 
              accent="border-t-[3px] border-t-[#1A4A7A]" 
              labelColor="text-[#1A4A7A]"
              onClick={() => setActiveKpi('active')}
              icon={<svg className="w-5 h-5 text-[#1A4A7A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} 
            />
            <Metric 
              label="Total Registrations" 
              value={summary?.totalRegistrations || 0} 
              trendStr={regTrendStr} 
              trendColor={regTrendColor.includes('emerald') ? "bg-[#FAF7F2] text-[#C84B11] border border-[#E2D8CC]" : "bg-[#FAF7F2] text-[#7A7166] border border-[#E2D8CC]"} 
              accent="border-t-[3px] border-t-[#C84B11]" 
              labelColor="text-[#C84B11]"
              onClick={() => setActiveKpi('registrations')}
              icon={<svg className="w-5 h-5 text-[#C84B11]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} 
            />
            <Metric 
              label="Revenue Generated" 
              value={formatRevenue(summary?.totalRevenue || 0)} 
              trendStr={revTrendStr} 
              trendColor={revTrendColor.includes('emerald') ? "bg-[#FAF7F2] text-[#1A4A7A] border border-[#E2D8CC]" : "bg-[#FAF7F2] text-[#7A7166] border border-[#E2D8CC]"} 
              accent="border-t-[3px] border-t-[#1A4A7A]" 
              labelColor="text-[#1A4A7A]"
              onClick={() => setActiveKpi('revenue')}
              icon={<svg className="w-5 h-5 text-[#1A4A7A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} 
            />
          </div>
        )}

        {/* ── Row 2: Top Events by Reg & Revenue Breakdown ────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 shrink-0">
            <div className="bg-white rounded-2xl h-56 animate-pulse" /><div className="bg-white rounded-2xl h-56 animate-pulse" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
            
            {/* Top Events by Registrations */}
            <div className="bg-[#FFFFFF] rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-[#E2D8CC] p-6 h-[270px] flex flex-col hover:-translate-y-[3px] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all duration-300">
              <h2 className="font-[Syne] font-[800] text-lg text-[#1C1A17] mb-6">Top Events by Registrations</h2>
              <div className="flex-1 overflow-y-auto pr-2 space-y-5 font-[DM_Sans]">
                {topEventsByReg.map((evt, i) => {
                  return (
                    <div key={evt.eventId} className="flex items-center gap-4 group">
                      <span className="w-40 truncate text-sm font-bold text-[#7A7166] group-hover:text-[#1C1A17] transition-colors">{evt.name}</span>
                      <div className="flex-1 h-3 bg-[#FAF7F2] rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r from-[#C84B11] to-[#E8622A] rounded-full animate-fill-bar`} style={{'--target-width': `${Math.round((evt.registeredCount/maxReg)*100)}%`} as React.CSSProperties} />
                      </div>
                      <span className="w-12 text-right text-sm font-[Syne] font-[800] text-[#1C1A17]">{evt.registeredCount}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Revenue Breakdown */}
            <div className="bg-[#FFFFFF] rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-[#E2D8CC] p-6 h-[270px] flex flex-col hover:-translate-y-[3px] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all duration-300">
              <h2 className="font-[Syne] font-[800] text-lg text-[#1C1A17] mb-6">Revenue Breakdown</h2>
              <div className="flex-1 overflow-y-auto pr-2 space-y-5 font-[DM_Sans]">
                {topEventsByRev.map((evt, i) => {
                  return (
                    <div key={evt.eventId} className="flex items-center gap-4 group">
                      <span className="w-40 truncate text-sm font-bold text-[#7A7166] group-hover:text-[#1C1A17] transition-colors">{evt.name}</span>
                      <div className="flex-1 h-3 bg-[#FAF7F2] rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r from-[#1A4A7A] to-[#4A90D9] rounded-full animate-fill-bar`} style={{'--target-width': `${Math.round((evt.revenue/maxRev)*100)}%`} as React.CSSProperties} />
                      </div>
                      <span className="w-16 text-right text-sm font-[Syne] font-[800] text-[#1C1A17]">{formatRevenue(evt.revenue)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Row 3: Upcoming Events, Activity, Top Cities ────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-[320px] animate-in fade-in slide-in-from-bottom-8 duration-500 delay-200 fill-mode-both">
          
          {/* Upcoming Events */}
          <div className="bg-[#FFFFFF] rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-[#E2D8CC] flex flex-col overflow-hidden h-full hover:-translate-y-[3px] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all duration-300 min-h-[320px] lg:min-h-0">
            <div className="px-6 py-5 border-b border-[#FAF7F2] flex justify-between items-center shrink-0">
              <h2 className="font-[Syne] font-[800] text-lg text-[#1C1A17]">Upcoming Events</h2>
              <Link href="/admin/events" className="text-[#C84B11] text-[11px] px-3 py-1.5 bg-[#FAF7F2] rounded-lg font-[DM_Sans] font-bold uppercase tracking-wider hover:brightness-110">View All →</Link>
            </div>
            <div className="flex-1 overflow-y-auto font-[DM_Sans]">
              {events.length === 0 ? (
                <p className="text-center text-[#7A7166] text-xs py-10 font-medium">No events yet.</p>
              ) : (
                <div className="divide-y divide-[#FAF7F2]">
                  {events.filter(e => e.status === 'UPCOMING').slice(0, 5).map(evt => {
                    const isSoldOut = evt.registeredCount >= evt.capacity;
                    return (
                      <div key={evt.eventId} className="px-6 py-4 hover:bg-[#FAF7F2]/50 transition-colors group">
                        <div className="flex justify-between items-center mb-2">
                          <p className="font-bold text-[#1C1A17] text-[15px] truncate group-hover:text-[#C84B11] transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[#1A4A7A]" />{evt.name}</p>
                          <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full shrink-0 border ${isSoldOut ? 'bg-red-50 text-red-600 border-red-100' : 'bg-[#FAF7F2] text-[#C84B11] border-[#E2D8CC]'}`}>
                            {isSoldOut ? 'Sold Out' : 'Open'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[#7A7166] truncate pr-2 max-w-[200px]">{evt.city}</span>
                          <span className="font-bold text-[#7A7166]">
                            <span className="text-[#1C1A17] font-[Syne] text-sm">{evt.registeredCount}</span> / {evt.capacity}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-[#FFFFFF] rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-[#E2D8CC] flex flex-col overflow-hidden h-full hover:-translate-y-[3px] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all duration-300 min-h-[320px] lg:min-h-0">
            <div className="px-6 py-5 border-b border-[#FAF7F2] shrink-0">
              <h2 className="font-[Syne] font-[800] text-lg text-[#1C1A17]">Recent Activity</h2>
            </div>
            <div className="flex-1 overflow-y-auto font-[DM_Sans]">
              {activity.length === 0 ? (
                <p className="text-center text-[#7A7166] text-xs py-10 font-medium">No activity yet</p>
              ) : (
                <div className="divide-y divide-[#FAF7F2]">
                  {activity.map((a, i) => (
                    <div key={i} className="flex items-start gap-4 px-6 py-4 hover:bg-[#FAF7F2]/50 transition-colors">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border ${a.type === 'checkin' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : a.status === 'WAITLISTED' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-[#FAF7F2] text-[#1A4A7A] border-[#E2D8CC]'}`}>
                        {a.type === 'checkin' ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        ) : a.status === 'WAITLISTED' ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[#1C1A17] text-sm truncate">{a.studentName}</p>
                        <p className="text-[#7A7166] text-xs truncate mt-0.5">{a.type === 'checkin' ? 'Checked in to' : a.status === 'WAITLISTED' ? 'Waitlisted for' : 'Registered for'} <span className="font-bold text-[#1A4A7A]">{a.eventName}</span></p>
                        <p className="text-[#7A7166] text-xs mt-1.5 truncate flex items-center gap-2">
                           <span>{a.college}</span>
                           <span className="w-1 h-1 bg-[#E2D8CC] rounded-full" />
                           <span>{new Date(a.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top Cities */}
          <div className="bg-[#FFFFFF] rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-[#E2D8CC] flex flex-col overflow-hidden h-full hover:-translate-y-[3px] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all duration-300 min-h-[320px] lg:min-h-0">
            <div className="px-6 py-5 border-b border-[#FAF7F2] flex justify-between items-center shrink-0">
              <h2 className="font-[Syne] font-[800] text-lg text-[#1C1A17]">Top Cities</h2>
              <span className="text-[10px] font-[DM_Sans] font-bold uppercase tracking-wider text-[#7A7166] bg-[#FAF7F2] border border-[#E2D8CC] px-2.5 py-1 rounded-md">By Reg</span>
            </div>
            <div className="flex-1 overflow-y-auto p-6 font-[DM_Sans]">
              {topCities.length === 0 ? (
                <p className="text-[#7A7166] text-xs text-center py-6 font-medium">No city data yet</p>
              ) : (
                <div className="space-y-6">
                  {topCities.map((c, i) => (
                    <div key={c.city} className="group">
                      <div className="flex justify-between items-center text-sm mb-3">
                        <span className="font-bold text-[#1C1A17] flex items-center gap-3">
                          <span className="text-[#C84B11] font-[Syne] font-[800] text-sm md:text-[15px]">#{i + 1}</span> 
                          <span className="text-[14px]">{c.city}</span>
                        </span>
                        <span className="text-[#7A7166] font-bold text-xs"><span className="text-[#1C1A17] font-[Syne] text-sm">{c.count}</span></span>
                      </div>
                      <div className="h-3 bg-[#FAF7F2] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#1A4A7A] to-[#4A90D9] rounded-full animate-fill-bar"
                          style={{ '--target-width': `${Math.round((c.count / maxCity) * 100)}%` } as React.CSSProperties} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      {/* ── KPI Detail Modal ─────────────────────────────────────── */}
      {activeKpiConfig && (
        <div className="fixed inset-0 bg-[#0E1B3D]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-body">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="font-heading font-extrabold text-[#0E1B3D] text-xl">{activeKpiConfig.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{activeKpiConfig.subtitle}</p>
              </div>
              <button onClick={() => setActiveKpi(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {activeKpiConfig.rows.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-[#C84B11]">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <p className="font-medium text-gray-500">{activeKpiConfig.empty}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeKpiConfig.rows.map((evt) => (
                    <div key={evt.eventId} className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-gray-100 bg-white shadow-sm hover:border-blue-100 transition-colors">
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${evt.status === 'COMPLETED' ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-700'}`}>
                            {evt.status}
                          </span>
                        </div>
                        <p className="font-bold text-[#0E1B3D] text-sm truncate">{evt.name}</p>
                        <p className="text-xs text-gray-500 mt-1 truncate">{activeKpiConfig.detailLabel(evt)}</p>
                      </div>
                      <div className="text-right shrink-0 min-w-[112px]">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Event Detail</p>
                        <p className={`font-extrabold text-lg ${activeKpiConfig.accentClass}`}>{activeKpiConfig.valueLabel(evt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
              <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">{activeKpiConfig.totalLabel}</span>
              <span className={`font-extrabold text-2xl ${activeKpiConfig.accentClass}`}>{activeKpiConfig.totalValue}</span>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
    </>
  );
}




