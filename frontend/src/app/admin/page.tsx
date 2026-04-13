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
type LiveAlert = { type?: string; message: string; timestamp?: string; studentName?: string; eventName?: string };
type KpiKey = 'events' | 'active' | 'registrations' | 'revenue';
type FeedbackPreview = {
  _id: string;
  studentName: string;
  college: string;
  comment: string;
  rating: number;
  isApprovedForLanding?: boolean;
  isApprovedForEventPage?: boolean;
};
type FeedbackCurationEvent = {
  eventId: string;
  name: string;
  dateTime: string;
  venue?: string;
  city?: string;
  totalFeedback: number;
  landingSelected: number;
  eventPageSelected: number;
  latestFeedbackAt?: string | null;
  preview: FeedbackPreview[];
};
type FeedbackCurationResponse = {
  summary: {
    completedEvents: number;
    totalFeedback: number;
    landingSelected: number;
    eventPageSelected: number;
  };
  events: FeedbackCurationEvent[];
};

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
      <span className="text-[12px] font-bold leading-none">{prefix.trim()}</span>
      <span className="text-[13px] font-bold leading-none">{value}</span>
      <span className="text-[11px] font-bold leading-none">{suffix}</span>
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
  icon?: React.ReactNode;
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
    className={`bg-[#FFFFFF] rounded-xl p-5 border border-[#E2D8CC] ${accent} flex flex-col justify-between h-[130px] w-full text-left transition-all hover:bg-gray-50/50`}
  >
    <div className="flex justify-between items-start w-full">
      <p className={`text-[13px] font-medium ${labelColor} tracking-wide`}>{label}</p>
      {icon && (
        <div className={`w-5 h-5 flex items-center justify-center shrink-0 ${labelColor}`}>
          {icon}
        </div>
      )}
    </div>
    <div className="flex items-end justify-between mt-auto">
      <p className="font-bold text-[28px] text-[#1C1A17] leading-none">{value}</p>
      {trendStr && (
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md ${trendColor} shrink-0 inline-flex items-center gap-1 whitespace-nowrap border-none`}>
          {renderTrend(trendStr)}
        </span>
      )}
    </div>
  </button>
);

export default function AdminPage() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [topCities, setTopCities] = useState<TopCity[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);
  const [feedbackCuration, setFeedbackCuration] = useState<FeedbackCurationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeKpi, setActiveKpi] = useState<KpiKey | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [analyticsRes, eventsRes, publicEventsRes, feedbackRes] = await Promise.all([
        fetch('http://localhost:5000/api/events/analytics', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/events/mine', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/events'),
        fetch('http://localhost:5000/api/events/feedback/curation/admin', { headers: { Authorization: `Bearer ${token}` } }),
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

      if (feedbackRes.ok) {
        setFeedbackCuration(await feedbackRes.json());
      } else {
        setFeedbackCuration(null);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    if (isLoading) return;
    if (!user || !token) { router.push('/admin/login'); return; }
    if (user.role !== 'admin' && user.role !== 'superAdmin') { router.push('/'); return; }
    fetchData();
  }, [user, token, isLoading, router, fetchData]);

  useEffect(() => {
    if (!token) return;
    const stream = new EventSource(`http://localhost:5000/api/admin/alerts/stream?token=${encodeURIComponent(token)}`);

    const handleAlert = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as LiveAlert;
        setLiveAlerts(prev => [payload, ...prev].slice(0, 6));
        if (payload.type === 'registration.cancelled' || payload.type === 'registration.promoted') {
          fetchData();
        }
      } catch {
        // Ignore malformed alert payloads.
      }
    };

    stream.addEventListener('attendance-alert', handleAlert);
    stream.addEventListener('registration-cancelled', handleAlert);
    stream.addEventListener('participant-promoted', handleAlert);

    return () => {
      stream.removeEventListener('attendance-alert', handleAlert);
      stream.removeEventListener('registration-cancelled', handleAlert);
      stream.removeEventListener('participant-promoted', handleAlert);
      stream.close();
    };
  }, [token, fetchData]);

  if (isLoading) return null;
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
    regTrendColor = p >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-600";
  } else if (regsThisMonth > 0) regTrendStr = "↑ 100%";

  const revThisMonth = events.filter(e => new Date(e.dateTime).getMonth() === thisMonth && new Date(e.dateTime).getFullYear() === thisYear).reduce((acc, e) => acc + e.revenue, 0);
  const revLastMonth = events.filter(e => new Date(e.dateTime).getMonth() === lastMonth && new Date(e.dateTime).getFullYear() === yearForLastMonth).reduce((acc, e) => acc + e.revenue, 0);
  let revTrendStr = "0%"; let revTrendColor = "bg-emerald-50 text-emerald-600";
  if (revLastMonth > 0) {
    const p = Math.round(((revThisMonth - revLastMonth) / revLastMonth) * 100);
    revTrendStr = `${p > 0 ? '↑' : '↓'} ${Math.abs(p)}%`;
    revTrendColor = p >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-600";
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
          className="bg-gradient-to-r from-[#C84B11] to-[#E8622A] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:brightness-110 transition-all shadow-[0_4px_14px_rgba(200,75,17,0.3)] hover:shadow-[0_6px_20px_rgba(200,75,17,0.5)] w-full sm:w-auto text-center flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Create Event
        </Link>
      }
    >
      <div className="flex flex-col gap-6 h-full w-full pb-2">

        {/* ── Row 1: KPI Cards ─────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-[#FFFFFF] rounded-xl min-h-[130px] animate-pulse border border-[#E2D8CC]" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both">
            <Metric 
              label="Total events" 
              value={summary?.totalEvents || events.length} 
              trendStr={`↑ ${eventsThisMonth} this month`} 
              trendColor="bg-[#FAF7F2] text-[#C84B11]" 
              accent="border-t-[3px] border-t-[#C84B11]" 
              labelColor="text-[#C84B11]"
              onClick={() => setActiveKpi('events')}
              icon={<svg className="w-5 h-5 text-[#C84B11]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} 
            />
            <Metric 
              label="Active events" 
              value={summary?.upcoming || 0} 
              trendStr={`↑ ${activeEventsWeek} this week`} 
              trendColor="bg-[#e2e8f0] text-[#1e293b]" 
              accent="border-t-[3px] border-t-[#1A4A7A]" 
              labelColor="text-[#1A4A7A]"
              onClick={() => setActiveKpi('active')}
              icon={<svg className="w-5 h-5 text-[#1A4A7A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} 
            />
            <Metric 
              label="Total registrations" 
              value={summary?.totalRegistrations || 0} 
              trendStr={regTrendStr} 
              trendColor={regTrendColor.includes('emerald') ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-600"} 
              accent="border-t-[3px] border-t-[#9e1b4b]" 
              labelColor="text-[#9e1b4b]"
              onClick={() => setActiveKpi('registrations')}
              icon={<svg className="w-5 h-5 text-[#9e1b4b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} 
            />
            <Metric 
              label="Revenue generated" 
              value={formatRevenue(summary?.totalRevenue || 0)} 
              trendStr={revTrendStr} 
              trendColor={revTrendColor.includes('emerald') ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-600"} 
              accent="border-t-[3px] border-t-[#e8622a]" 
              labelColor="text-[#e8622a]"
              onClick={() => setActiveKpi('revenue')}
              icon={<svg className="w-5 h-5 text-[#e8622a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} 
            />
          </div>
        )}

        {liveAlerts.length > 0 && (
          <div className="bg-white mx-1 my-2 rounded-xl border border-[#E2D8CC] p-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-bold text-lg text-[#1C1A17]">Live alerts</h2>
                <p className="text-xs text-[#7A7166]">Unauthorized scans, cancellations, and promotions appear here in real time.</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#C84B11] bg-[#FAF7F2] border border-[#E2D8CC] px-2.5 py-1 rounded-md">SSE</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {liveAlerts.map((alert, index) => (
                <div key={`${alert.timestamp || 'alert'}-${index}`} className="rounded-xl border border-gray-100 bg-[#FAF7F2]/70 p-4">
                  <p className="text-sm font-bold text-[#1C1A17]">{alert.message}</p>
                  <p className="text-xs text-[#7A7166] mt-1">
                    {[alert.studentName, alert.eventName, alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''].filter(Boolean).join(' • ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Row 2: Top Events by Reg & Revenue Breakdown ────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 shrink-0">
            <div className="bg-white rounded-xl h-56 animate-pulse border border-[#E2D8CC]" /><div className="bg-white rounded-xl h-56 animate-pulse border border-[#E2D8CC]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 fill-mode-both">
            {/* Top Events by Registrations */}
            <div className="bg-[#FFFFFF] rounded-xl border border-[#E2D8CC] p-6 h-[270px] flex flex-col hover:bg-gray-50/20 transition-all">
              <h2 className="font-bold text-md text-[#1a202c] mb-6">Top events by registrations</h2>
              <div className="flex-1 overflow-y-auto pr-2 space-y-5">
                {topEventsByReg.length === 0 ? (
                  <p className="text-gray-400 text-sm">No other events to compare yet.</p>
                ) : topEventsByReg.map((evt) => {
                  return (
                    <div key={evt.eventId} className="flex items-center gap-4 group">
                      <span className="w-[30%] truncate text-sm text-[#4a5568] group-hover:text-[#1C1A17] transition-colors">{evt.name}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full bg-[#C84B11] rounded-full animate-fill-bar`} style={{'--target-width': `${Math.round((evt.registeredCount/maxReg)*100)}%`} as React.CSSProperties} />
                      </div>
                      <span className="w-8 text-right text-sm font-bold text-[#1C1A17]">{evt.registeredCount}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Revenue Breakdown */}
            <div className="bg-[#FFFFFF] rounded-xl border border-[#E2D8CC] p-6 h-[270px] flex flex-col hover:bg-gray-50/20 transition-all">
              <h2 className="font-bold text-md text-[#1a202c] mb-6">Revenue breakdown</h2>
              <div className="flex-1 overflow-y-auto pr-2 space-y-5">
                {topEventsByRev.every(e => e.revenue === 0) ? (
                  <>
                    <div className="flex items-center gap-4 group">
                      <span className="w-[30%] truncate text-sm text-[#4a5568]">TechTrek 2026</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden" />
                      <span className="w-8 text-right text-sm font-bold text-[#1C1A17]">₹0</span>
                    </div>
                    <p className="text-gray-400 text-sm mt-4">Revenue tracking will reflect once paid registrations are processed.</p>
                  </>
                ) : topEventsByRev.map((evt) => {
                  return (
                    <div key={evt.eventId} className="flex items-center gap-4 group">
                      <span className="w-[30%] truncate text-sm text-[#4a5568] group-hover:text-[#1C1A17] transition-colors">{evt.name}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full bg-[#1A4A7A] rounded-full animate-fill-bar`} style={{'--target-width': `${Math.round((evt.revenue/maxRev)*100)}%`} as React.CSSProperties} />
                      </div>
                      <span className="w-16 text-right text-sm font-bold text-[#1C1A17]">{formatRevenue(evt.revenue)}</span>
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
          <div className="bg-[#FFFFFF] rounded-xl border border-[#E2D8CC] flex flex-col overflow-hidden h-full min-h-[320px] lg:min-h-0 relative">
            <div className="px-6 py-5 border-b border-[#FAF7F2] flex justify-between items-center shrink-0">
              <h2 className="font-bold text-md text-[#1a202c]">Upcoming events</h2>
              <Link href="/admin/events" className="text-[#C84B11] text-[13px] hover:underline">View all →</Link>
            </div>
            <div className="flex-1 overflow-y-auto">
              {events.filter(e => e.status === 'UPCOMING').length === 0 ? (
                <p className="text-center text-[#7A7166] text-xs py-10 font-medium">
                  <div className="flex items-center justify-center p-3 w-10 h-10 mx-auto rounded-lg bg-red-50 text-red-400 border border-red-100 mb-3"><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg></div>
                  No upcoming events scheduled.<br/>Create one to get started.
                </p>
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
                            <span className="text-[#1C1A17] text-sm">{evt.registeredCount}</span> / {evt.capacity}
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
          <div className="bg-[#FFFFFF] rounded-xl border border-[#E2D8CC] flex flex-col overflow-hidden h-full min-h-[320px] lg:min-h-0">
            <Link href="/admin/activity" className="px-6 py-5 border-b border-[#FAF7F2] shrink-0 block hover:bg-gray-50/50 transition-colors">
              <h2 className="font-bold text-md text-[#1a202c]">Recent activity</h2>
            </Link>
            <div className="flex-1 overflow-y-auto">
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
          <div className="bg-[#FFFFFF] rounded-xl border border-[#E2D8CC] flex flex-col overflow-hidden h-full min-h-[320px] lg:min-h-0">
            <div className="px-6 py-5 border-b border-[#FAF7F2] flex justify-between items-center shrink-0">
              <h2 className="font-bold text-md text-[#1a202c]">Top cities</h2>
              <span className="text-[12px] text-gray-500">by reg.</span>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {topCities.length === 0 ? (
                <p className="text-gray-400 text-sm py-6">More cities will appear as registrations grow.</p>
              ) : (
                <div className="space-y-6">
                  {topCities.map((c, i) => (
                    <div key={c.city} className="group">
                      <div className="flex justify-between items-center text-sm mb-3">
                        <span className="font-medium text-[#1a202c] flex items-center gap-2">
                          <span className="text-gray-400 font-bold text-sm">#{i + 1}</span> 
                          <span className="text-[14px]">{c.city}</span>
                        </span>
                        <span className="text-gray-600 text-sm font-medium">{c.count}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#1A4A7A] rounded-full animate-fill-bar"
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




