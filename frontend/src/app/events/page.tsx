"use client";

import { useState, useMemo } from 'react';
import { Section } from '@/components/ui/Section';
import { Input } from '@/components/ui/Input';
import { EventCard } from '@/components/events/EventCard';
import type { TechEvent } from '@/data/mockEvents';
import { useEffect } from 'react';

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

  // Extract unique cities from mock data
  const cities = useMemo(() => {
    const uniqueCities = new Set(events.map(e => e.city));
    return ['ALL', ...Array.from(uniqueCities)];
  }, [events]);

  // Filter logic
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
    <div className="pt-20 bg-background min-h-screen font-body">
      {/* Header */}
      <Section className="bg-secondary text-white py-16 md:py-24 relative overflow-hidden">
        {/* Decorative blur */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        
        <div className="max-w-7xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10">
          <h1 className="font-heading font-extrabold text-5xl md:text-6xl mb-6 text-[#FF8C00] drop-shadow-md tracking-tight">Explore TechTrek Events</h1>
          <p className="text-white/90 font-medium max-w-2xl mx-auto text-lg md:text-xl leading-relaxed">
            Discover upcoming summits, hands-on workshops, and exclusive networking sessions at top engineering colleges across India.
          </p>
        </div>
      </Section>
      
      {/* Filters and Grid */}
      <Section className="py-12 md:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Filters Bar */}
          <div className="bg-card border border-border p-4 md:p-6 rounded-2xl shadow-sm mb-12 flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="w-full md:w-1/3 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/50">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </span>
              <Input 
                placeholder="Search college or event name..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 bg-background border-2 border-border focus:border-primary"
              />
            </div>
            
            {/* Dropdowns & Toggles */}
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <select 
                className="bg-background border-2 border-border rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors text-foreground font-medium appearance-none cursor-pointer"
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
              >
                {cities.map(city => (
                  <option key={city} value={city}>{city === 'ALL' ? 'All Cities' : city}</option>
                ))}
              </select>
              
              <div className="flex bg-background border border-border rounded-xl p-1 shrink-0 shadow-inner">
                <button 
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-5 py-2 rounded-lg text-sm font-bold transition-colors ${statusFilter === 'ALL' ? 'bg-secondary text-white shadow-md' : 'text-foreground/70 hover:bg-black/5 hover:text-foreground'}`}
                >
                  All
                </button>
                <button 
                  onClick={() => setStatusFilter('UPCOMING')}
                  className={`px-5 py-2 rounded-lg text-sm font-bold transition-colors ${statusFilter === 'UPCOMING' ? 'bg-primary text-white shadow-md' : 'text-foreground/70 hover:bg-black/5 hover:text-foreground'}`}
                >
                  Upcoming
                </button>
                <button 
                  onClick={() => setStatusFilter('COMPLETED')}
                  className={`px-5 py-2 rounded-lg text-sm font-bold transition-colors ${statusFilter === 'COMPLETED' ? 'bg-secondary text-white shadow-md' : 'text-foreground/70 hover:bg-black/5 hover:text-foreground'}`}
                >
                  Completed
                </button>
              </div>
            </div>
          </div>

          {/* Events Grid */}
          {initialLoading ? (
            <div className="text-center py-20"><p className="text-secondary font-bold text-xl animate-pulse">Loading Events...</p></div>
          ) : filteredEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredEvents.map(event => (
                <div key={event.eventId || event._id} className="h-full">
                  <EventCard event={event} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-black/5 rounded-3xl border border-dashed border-border max-w-3xl mx-auto">
              <div className="flex justify-center mb-4 opacity-50">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
              <h3 className="text-2xl font-bold text-secondary mb-2">No events found</h3>
              <p className="text-foreground/70 text-lg">Try adjusting your search terms or filters to find what you're looking for.</p>
              <button 
                onClick={() => { setSearchTerm(''); setCityFilter('ALL'); setStatusFilter('ALL'); }}
                className="mt-6 text-primary font-bold hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}

        </div>
      </Section>
    </div>
  );
}
