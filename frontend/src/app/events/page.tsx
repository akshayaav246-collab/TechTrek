"use client";

import { useState, useMemo, useEffect } from 'react';
import { EventCard } from '@/components/events/EventCard';
import type { TechEvent } from '@/data/mockEvents';

export default function EventsPage() {
  const [events, setEvents] = useState<TechEvent[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UPCOMING' | 'COMPLETED'>('ALL');
  const [cityFilter, setCityFilter] = useState<string>('ALL');

  useEffect(() => {
    fetch('http://localhost:5000/api/events')
      .then(res => res.json())
      .then(data => {
        setEvents(data);
        setInitialLoading(false);
      })
      .catch(console.error);
  }, []);

  const cities = useMemo(() => {
    const uniqueCities = new Set(events.map(e => e.city));
    return ['ALL', ...Array.from(uniqueCities)];
  }, [events]);

  const upcomingCount = events.filter(e => e.status === 'UPCOMING').length;
  const completedCount = events.filter(e => e.status === 'COMPLETED').length;
  const totalCount = events.length;

  const filteredEvents = useMemo(() => {
    const filtered = events.filter((event) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = event.name.toLowerCase().includes(searchLower) || 
                            event.collegeName.toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === 'ALL' || event.status === statusFilter;
      const matchesCity = cityFilter === 'ALL' || event.city === cityFilter;
      return matchesSearch && matchesStatus && matchesCity;
    });

    return filtered.sort((a, b) => {
      if (a.status === 'UPCOMING' && b.status !== 'UPCOMING') return -1;
      if (a.status !== 'UPCOMING' && b.status === 'UPCOMING') return 1;
      if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return 1;
      if (a.status !== 'COMPLETED' && b.status === 'COMPLETED') return -1;
      return 0;
    });
  }, [events, searchTerm, statusFilter, cityFilter]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background font-body items-start">
      
      {/* ─── LEFT SIDEBAR ────────────────────────────────────────────── */}
      <aside className="w-full md:w-64 lg:w-72 shrink-0 border-r border-[#0E1B3D]/50 bg-transparent flex-col py-8 px-5 lg:px-7 md:sticky md:top-[80px] md:h-[calc(100vh-80px)] overflow-y-auto hidden md:flex">
        
        {/* Search */}
        <div className="mb-8">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#0E1B3D]/40 mb-3 ml-1">Search</h3>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0E1B3D]/40">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </span>
            <input 
              placeholder="College or event name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-[#E5E7EB] rounded-xl text-[13px] font-bold outline-none focus:border-[#e8631a] transition-colors text-[#0E1B3D] placeholder-[#0E1B3D]/30"
            />
          </div>
        </div>

        {/* Status */}
        <div className="mb-8">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#0E1B3D]/40 mb-3 ml-1">Status</h3>
          <div className="flex flex-col gap-1.5">
            <button onClick={() => setStatusFilter('ALL')} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${statusFilter === 'ALL' ? 'bg-[#e8631a]/10 text-[#e8631a] font-bold' : 'text-[#0E1B3D]/70 hover:bg-[#0E1B3D]/5 font-medium'}`}>
              <span>All Events</span>
              {statusFilter === 'ALL' && <span className="bg-[#e8631a] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{totalCount}</span>}
            </button>
            <button onClick={() => setStatusFilter('UPCOMING')} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${statusFilter === 'UPCOMING' ? 'bg-[#e8631a]/10 text-[#e8631a] font-bold' : 'text-[#0E1B3D]/70 hover:bg-[#0E1B3D]/5 font-medium'}`}>
              <span>Upcoming</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${statusFilter === 'UPCOMING' ? 'bg-[#e8631a] text-white' : 'bg-[#0E1B3D]/10 text-[#0E1B3D]/50'}`}>{upcomingCount}</span>
            </button>
            <button onClick={() => setStatusFilter('COMPLETED')} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${statusFilter === 'COMPLETED' ? 'bg-[#e8631a]/10 text-[#e8631a] font-bold' : 'text-[#0E1B3D]/70 hover:bg-[#0E1B3D]/5 font-medium'}`}>
              <span>Completed</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${statusFilter === 'COMPLETED' ? 'bg-[#e8631a] text-white' : 'bg-[#0E1B3D]/10 text-[#0E1B3D]/50'}`}>{completedCount}</span>
            </button>
          </div>
        </div>

        {/* City */}
        <div className="mb-8">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#0E1B3D]/40 mb-3 ml-1">City</h3>
          <div className="flex flex-col gap-2">
            {cities.map(city => (
              <label key={city} onClick={() => setCityFilter(city)} className="flex items-center gap-3 cursor-pointer group px-2 py-1">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${cityFilter === city ? 'bg-[#e8631a] border-[#e8631a]' : 'border-[#E5E7EB] bg-background group-hover:border-[#e8631a]/50'}`}>
                  {cityFilter === city && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>}
                </div>
                <span className={`text-[13px] transition-colors ${cityFilter === city ? 'font-bold text-[#0E1B3D]' : 'font-medium text-[#0E1B3D]/70 group-hover:text-[#0E1B3D]'}`}>
                  {city === 'ALL' ? 'All Cities' : city}
                </span>
              </label>
            ))}
          </div>
        </div>

      </aside>

      {/* ─── RIGHT MAIN CONTENT ────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
        
        {/* Banner */}
        <div className="bg-[#0E1B3D] p-6 sm:p-8 lg:p-10 xl:p-12 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-8 shadow-xl border-b-[4px] border-[#e8631a]">
          {/* Decorative Grid SVG */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm20 20h20v20H20V20zM0 20h20v20H0V20z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E\")" }}></div>
          <div className="absolute -right-32 -top-32 w-96 h-96 bg-[#e8631a]/20 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-px bg-[#e8631a]"></div>
              <span className="text-[10px] sm:text-xs font-bold tracking-[0.2em] text-[#e8631a] uppercase">Viksit Bharat Initiative</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-extrabold text-white mb-4 tracking-tight leading-[1.1]">
              Explore <span className="text-[#e8631a]">TechTrek</span> Events
            </h1>
            
            <p className="text-white/60 text-sm sm:text-base mb-8 max-w-lg font-medium leading-relaxed">
              Summits, hands-on workshops, and exclusive networking sessions at top engineering colleges across India.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/5 border border-white/10 shadow-inner">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                <span className="text-[11px] sm:text-xs font-bold text-white/90">{upcomingCount} Upcoming</span>
              </div>
              <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/5 border border-white/10 shadow-inner">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="text-[11px] sm:text-xs font-bold text-white/90">{completedCount} Completed</span>
              </div>
              <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/5 border border-white/10 shadow-inner">
                <div className="w-2 h-2 rounded-full bg-white/30"></div>
                <span className="text-[11px] sm:text-xs font-bold text-white/90">{totalCount} Total</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-10 flex-1 flex flex-col">
          {/* Action Bar / Sort */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 px-1">
            <h2 className="text-[13px] font-bold text-[#0E1B3D]/60 tracking-wider">
              Showing <span className="text-[#0E1B3D] text-sm tabular-nums">{filteredEvents.length}</span> events
            </h2>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <span className="text-[10px] font-bold text-[#0E1B3D]/40 uppercase tracking-widest">Sort by</span>
            <div className="relative bg-card border border-[#E5E7EB] rounded-lg">
              <select className="bg-transparent text-[12px] font-bold text-[#0E1B3D] py-2 pl-3 pr-8 outline-none cursor-pointer appearance-none rounded-lg focus:border-[#e8631a] transition-colors relative z-10">
                <option value="upcoming">Date (Upcoming)</option>
                <option value="name">College Name</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0E1B3D]/40 pointer-events-none z-0">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"/></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Grid Output */}
        {initialLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-[#e8631a]/20 border-t-[#e8631a] rounded-full animate-spin mb-4"></div>
            <p className="text-[#0E1B3D]/50 font-bold text-sm uppercase tracking-widest animate-pulse">Loading Grid...</p>
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filteredEvents.map(event => (
              <div key={event.eventId || event._id} className="h-full transform hover:-translate-y-1 transition-transform duration-300">
                <EventCard event={event} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-[#0E1B3D]/5 rounded-3xl border border-dashed border-[#0E1B3D]/10 max-w-2xl mx-auto w-full mt-4">
            <div className="flex justify-center mb-5 opacity-30 text-[#0E1B3D]">
              <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <h3 className="text-xl font-extrabold text-[#0E1B3D] mb-2 font-heading">No events found</h3>
            <p className="text-[#0E1B3D]/60 text-sm font-medium max-w-sm mx-auto">Try adjusting your search terms or filters to find what you're looking for.</p>
            <button 
              onClick={() => { setSearchTerm(''); setCityFilter('ALL'); setStatusFilter('ALL'); }}
              className="mt-6 text-[#e8631a] font-bold text-sm hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
