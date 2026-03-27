import { notFound } from 'next/navigation';
import { Section } from '@/components/ui/Section';
import { Card } from '@/components/ui/Card';
import { EventSidebarWrapper } from '@/components/events/EventSidebarWrapper';
import { CalendarIcon, StarIcon, ClockIcon, MicIcon, TagIcon } from '@/components/Icons';
import Link from 'next/link';

type Speaker = { _id: string; name: string; role: string; company: string; bio: string };
type AgendaItem = { _id: string; time: string; title: string; duration: string; speaker?: string };

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

  const fillPercentage = Math.min(100, Math.round((event.registeredCount / event.capacity) * 100));

  return (
    <div className="pt-20 bg-background min-h-screen font-body">
      {/* Header Section */}
      <Section className="bg-secondary text-white py-16 md:py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <Link href="/events" className="inline-flex items-center text-white/60 hover:text-white transition-colors mb-10 text-sm font-bold uppercase tracking-widest group">
            <span className="mr-2 transition-transform group-hover:-translate-x-1">←</span> Back to Events
          </Link>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <span className={`inline-block px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest ${event.status === 'UPCOMING' ? 'bg-primary text-white shadow-md' : 'bg-white/20 text-white/80'}`}>
              {event.status}
            </span>
          </div>
          <h1 className="font-heading font-extrabold text-5xl md:text-7xl mb-6 leading-tight tracking-tight drop-shadow-md">{event.name}</h1>
          <p className="text-2xl md:text-3xl text-white/80 mb-10 font-medium">{event.collegeName} <span className="text-primary mx-3 opacity-50">•</span> {event.city}</p>
          <div className="flex items-center gap-4 text-white font-bold text-lg md:text-xl bg-black/20 w-fit px-8 py-4 rounded-2xl border border-white/10 backdrop-blur-sm shadow-inner">
            <CalendarIcon className="text-primary w-6 h-6" /> {formatDate(event.dateTime)}
          </div>
        </div>
      </Section>

      {/* Main Content Grid */}
      <Section className="py-16 md:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16 items-start">
            
            {/* Left Column (Content) */}
            <div className="lg:col-span-2 flex flex-col gap-16 md:gap-24">
              
              {/* About Event */}
              <div className="bg-card border border-border p-8 md:p-12 rounded-3xl shadow-sm">
                <h2 className="font-heading font-bold text-3xl md:text-4xl text-secondary mb-6 flex items-center gap-4">
                  <StarIcon className="text-primary w-6 h-6" /> About Event
                </h2>
                <p className="text-lg md:text-xl text-foreground/80 leading-relaxed font-medium">
                  {event.description}
                </p>
                
                {/* Topics */}
                <div className="flex flex-wrap gap-4 mt-10 pt-10 border-t border-border items-center">
                  <span className="text-xs font-bold text-foreground/50 uppercase tracking-widest mr-2">Tags:</span>
                  {(event.topics as string[]).map((topic: string) => (
                    <span key={topic} className="px-5 py-2.5 bg-primary/5 rounded-xl text-sm font-bold text-primary border border-primary/20 hover:bg-primary hover:text-white transition-colors cursor-default shadow-sm hover:shadow-md">
                      #{topic.replace(/\s+/g, '')}
                    </span>
                  ))}
                </div>
              </div>

              {/* Agenda Section */}
              <div>
                <h2 className="font-heading font-bold text-3xl md:text-4xl text-secondary mb-12 flex items-center gap-4">
                  <ClockIcon className="text-primary w-7 h-7" /> Summit Agenda
                </h2>
                <div className="flex flex-col gap-10 pl-6 border-l-[3px] border-border ml-4 md:ml-6 relative">
                  {(event.agenda as AgendaItem[]).map((item: AgendaItem, i: number) => (
                    <div key={i} className="relative pl-8 md:pl-10 group">
                      {/* Timeline dot */}
                      <div className="absolute -left-[45px] md:-left-[53px] top-1 w-6 h-6 rounded-full bg-border group-hover:bg-primary transition-colors ring-[6px] ring-background flex items-center justify-center shadow-sm">
                        <div className="w-2 h-2 bg-background rounded-full"></div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-5 mb-3">
                        <span className="font-bold text-primary text-2xl tracking-tight">{item.time}</span>
                        <span className="text-xs font-bold text-foreground/60 uppercase bg-black/5 px-3 py-1.5 rounded-lg border border-black/5 w-fit tracking-wider">
                          Duration: {item.duration}
                        </span>
                      </div>
                      <h4 className="text-2xl md:text-3xl font-bold text-secondary mb-4 leading-snug drop-shadow-sm">{item.title}</h4>
                      
                      {item.speaker && (
                        <div className="flex items-center gap-4 mt-5">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-sm font-bold shadow-inner border border-white/20">
                            {item.speaker.charAt(0)}
                          </div>
                          <div className="text-sm font-bold text-foreground/70 bg-card border border-border px-5 py-2.5 rounded-xl shadow-sm">
                            Led by: <span className="text-secondary ml-1">{item.speaker}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Speakers Section */}
              {(event.speakers as Speaker[]).length > 0 && (
                <div>
                  <h2 className="font-heading font-bold text-3xl md:text-4xl text-secondary mb-12 flex items-center gap-4">
                    <MicIcon className="text-primary w-7 h-7" /> Featured Speakers
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {(event.speakers as Speaker[]).map((speaker: Speaker) => (
                      <Card key={speaker._id} className="border border-border p-8 md:p-10 hover:shadow-xl transition-all duration-300 bg-card group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150 pointer-events-none"></div>
                        <div className="flex items-center justify-between mb-6 relative z-10">
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bebas text-4xl shadow-inner border-2 border-white/50">
                            {speaker.name.charAt(0)}
                          </div>
                          <div className="bg-black/5 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest text-foreground/50 border border-black/5">Speaker</div>
                        </div>
                        <h4 className="font-bold text-2xl text-secondary mb-2 relative z-10">{speaker.name}</h4>
                        <p className="text-primary font-bold text-sm mb-5 tracking-wide relative z-10 uppercase">{speaker.role} <span className="text-foreground/40 mx-2">|</span> <span className="text-foreground/80">{speaker.company}</span></p>
                        <p className="text-base text-foreground/70 leading-relaxed font-medium relative z-10">{speaker.bio}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              {/* Seat selection happens in a modal popup via RegisterCTA */}
            </div>

            <div className="lg:col-span-1">
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
      </Section>
    </div>
  );
}
