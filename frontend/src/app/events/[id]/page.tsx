import { notFound } from 'next/navigation';
import { Section } from '@/components/ui/Section';
import { Card } from '@/components/ui/Card';
import { EventSidebarWrapper } from '@/components/events/EventSidebarWrapper';
import { SpeakerCarousel } from '@/components/events/SpeakerCarousel';
import { SummitAgenda } from '@/components/events/SummitAgenda';
import { CalendarIcon, StarIcon, ClockIcon, MicIcon, TagIcon, LocationIcon } from '@/components/Icons';
import { EventMediaAndFeedback } from '@/components/events/EventMediaAndFeedback';
import Link from 'next/link';

type Speaker = { _id: string; name: string; role: string; company: string; bio: string };
type AgendaItem = { _id: string; time: string; title: string; duration: string; speaker?: string };
type DaySchedule = { day: number; label?: string; agenda: AgendaItem[] };

export default async function EventDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const res = await fetch(`http://localhost:5000/api/events/${id}`, { next: { revalidate: 5 } }).catch(() => null);
  
  if (!res || !res.ok) {
    notFound();
  }
  
  const event = await res.json();

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const formatShortDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isMultiDay = Array.isArray(event.days) && event.days.length > 0;
  const totalDays = isMultiDay ? event.days.length : 1;

  const fillPercentage = Math.min(100, Math.round((event.registeredCount / event.capacity) * 100));

  return (
    <div className="bg-[#F9F8F6] min-h-screen font-body w-full">
      {/* Header Section */}
      <section className="bg-[#0E1B3D] w-full text-white pt-10 md:pt-14 pb-4 relative h-[85vh] min-h-[600px] overflow-hidden flex flex-col">
        {/* Subtle grid background */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm20 20h20v20H20V20zM0 20h20v20H0V20z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E\")" }}></div>
        <div className="absolute top-0 right-0 w-[20rem] h-[20rem] md:w-[40rem] md:h-[40rem] bg-[#e8631a]/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        
        {/* Absolute Back Button */}
        <Link href="/events" className="absolute top-6 left-6 md:top-8 md:left-10 z-50 inline-flex items-center text-white/50 hover:text-white transition-colors text-xs md:text-sm font-bold uppercase tracking-[0.15em] group w-fit">
          <span className="mr-2 transition-transform group-hover:-translate-x-1">←</span> Back to Events
        </Link>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full flex-1 flex flex-col justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-20 xl:gap-24 items-center mt-4 md:mt-0">
            {/* Left Column - Hero Content */}
            <div className="flex flex-col items-start text-left font-heading">
              <div className="flex flex-wrap items-center gap-4 mb-3 md:mb-5">
                <span className={`inline-block px-3 py-1.5 md:px-5 md:py-2.5 rounded-full text-[10px] md:text-[11px] font-bold uppercase tracking-[0.15em] border ${event.status === 'UPCOMING' ? 'border-[#e8631a]/30 text-[#e8631a] bg-[#e8631a]/10' : 'border-white/20 text-white/50'}`}>
                  • {event.status}
                </span>
                {isMultiDay && (
                  <span className="inline-block px-3 py-1.5 md:px-5 md:py-2.5 rounded-full text-[10px] md:text-[11px] font-bold uppercase tracking-[0.15em] border border-blue-400/30 text-blue-300 bg-blue-400/10">
                    {totalDays}-Day Summit
                  </span>
                )}
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] font-heading font-extrabold text-white mb-3 md:mb-5 tracking-tight leading-[1.05] drop-shadow-md">
                {event.name.split('@').map((part: string, index: number) => (
                  index === 0 ? <span key={index}>{part.trim()}</span> : <span key={index} className="text-[#e8631a] block mt-1">@ {part.trim()}</span>
                ))}
              </h1>
              
              <p className="text-sm md:text-lg lg:text-xl text-white/60 mb-5 md:mb-8 font-medium tracking-wide leading-relaxed max-w-lg">
                Join the biggest tech gathering at <strong className="text-white/90">{event.collegeName}</strong> in {event.city}. Two tracks. One unforgettable afternoon. No limits.
              </p>
              
              <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-6 md:mb-10">
                <div className="flex items-center gap-2 md:gap-3 text-white/80 font-bold text-[10px] md:text-sm bg-white/5 px-4 py-2.5 md:px-5 md:py-3 rounded-xl border border-white/5 backdrop-blur-sm shadow-sm">
                  <CalendarIcon className="text-[#e8631a] w-3 h-3 md:w-4 md:h-4 opacity-80" />
                  {isMultiDay && event.endDateTime
                    ? `${formatShortDate(event.dateTime)} – ${formatShortDate(event.endDateTime)}`
                    : formatDate(event.dateTime).split(' at ')[0]}
                </div>
                <div className="flex items-center gap-2 md:gap-3 text-white/80 font-bold text-[10px] md:text-sm bg-white/5 px-4 py-2.5 md:px-5 md:py-3 rounded-xl border border-white/5 backdrop-blur-sm shadow-sm">
                  <ClockIcon className="text-[#e8631a] w-3 h-3 md:w-4 md:h-4 opacity-80" />
                  {isMultiDay ? `${totalDays} Days` : (formatDate(event.dateTime).includes(' at ') ? formatDate(event.dateTime).split(' at ')[1] + ' onwards' : '3:30 PM onwards')}
                </div>
                <div className="flex items-center gap-2 md:gap-3 text-white/80 font-bold text-[10px] md:text-sm bg-white/5 px-4 py-2.5 md:px-5 md:py-3 rounded-xl border border-white/5 backdrop-blur-sm shadow-sm">
                  <LocationIcon className="text-[#e8631a] w-3 h-3 md:w-4 md:h-4 opacity-80" /> {event.venue}
                </div>
              </div>

            </div>

            {/* Right Column - About Event */}
            <div className="flex flex-col justify-center lg:pl-10 relative z-20 w-full h-auto">
              <div className="bg-[#0E1B3D] border-2 border-white/20 p-8 md:p-10 rounded-[2rem] shadow-[0_0_40px_rgba(255,255,255,0.05)] relative overflow-hidden flex flex-col w-full">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#e8631a]/5 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <h2 className="text-sm md:text-xl font-bold uppercase tracking-[0.2em] text-[#e8631a] mb-4 md:mb-5 flex items-center gap-3 relative z-10 shrink-0">
                  <span className="w-6 md:w-8 h-px bg-[#e8631a]"></span> About the Event
                </h2>
                <div className="relative z-10">
                  <p className="text-sm md:text-base lg:text-lg text-white/70 leading-relaxed font-medium">
                    {event.description}
                  </p>
                </div>
                
                {/* Topics */}
                <div className="flex flex-wrap gap-2 mt-8 relative z-10 shrink-0 border-t border-white/5 pt-6">
                  {(event.topics as string[]).map((topic: string) => (
                    <span key={topic} className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-xl text-[10px] md:text-xs font-bold text-white/60 hover:text-[#e8631a] transition-all shadow-sm">
                      #{topic.replace(/\s+/g, '')}
                    </span>
                  ))}
                </div>

                {/* Stats Integrated */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-8 pt-6 border-t border-white/5 relative z-10 shrink-0">
                  <div className="text-center md:text-left relative group">
                    <p className="font-heading font-black text-3xl md:text-4xl text-white mb-1 tracking-tight">{event.capacity}</p>
                    <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Total</p>
                  </div>
                  <div className="text-center md:text-left relative group border-l border-white/5 pl-2 sm:pl-4">
                    <p className="font-heading font-black text-3xl md:text-4xl text-white mb-1 tracking-tight">{Math.max(0, event.capacity - event.registeredCount)}</p>
                    <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-[#e8631a]/80">Available</p>
                  </div>
                  <div className="text-center md:text-left relative group border-l border-white/5 pl-2 sm:pl-4">
                    <p className="font-heading font-black text-3xl md:text-4xl text-white mb-1 tracking-tight">{(event.speakers as any[]).length || '12'} {((event.speakers as any[]).length || 12) > 10 ? '+' : ''}</p>
                    <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Speakers</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll button */}
        <div className="relative w-full flex justify-center mt-auto pb-4 pt-8 z-30 shrink-0">
           <a href="#register-section" className="flex flex-col items-center gap-2 text-white/40 hover:text-white transition-colors group">
             <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-[0.2em]">Scroll to Register</span>
             <div className="w-5 h-8 md:w-6 md:h-10 rounded-full border border-white/20 flex justify-center p-1 group-hover:border-white/40 group-hover:bg-[#e8631a]/10 transition-all">
               <div className="w-1 h-2 md:w-1 md:h-2.5 bg-[#e8631a] rounded-full animate-bounce mt-0.5"></div>
             </div>
           </a>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 md:py-24 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16 items-start">
            
            {/* Left Column (Content) */}
            <div className="lg:col-span-2 flex flex-col gap-16 md:gap-24 relative z-10 w-full min-w-0">
              {/* Summit Agenda */}
              <SummitAgenda agenda={event.agenda as AgendaItem[]} days={event.days as DaySchedule[]} />
              
              {event.status === 'COMPLETED' && (
                 <EventMediaAndFeedback eventId={event.eventId} photos={event.photos || []} />
              )}
            </div>

            {/* Right Column (Register & Event Details) */}
            <div className="lg:col-span-1 space-y-8" id="register-section">
              <div className="relative z-20">
                <div className="bg-[#182645] p-1 rounded-[2.2rem] shadow-xl">
                  <EventSidebarWrapper
                    eventId={event.eventId}
                    disabled={event.status === 'COMPLETED' || fillPercentage >= 100}
                    status={event.status}
                    registered={event.registeredCount}
                    capacity={event.capacity}
                    percentage={fillPercentage}
                    venue={event.venue}
                    hallLayout={event.hallLayout ?? null}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Speakers Section (Full Width layout) */}
          {Array.isArray(event.speakers) && event.speakers.length > 0 && event.status !== 'COMPLETED' && (
            <div className="mt-16 md:mt-24 pt-16 md:pt-24 border-t border-[#0E1B3D]/10 w-full">
              <SpeakerCarousel speakers={event.speakers as Speaker[]} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
