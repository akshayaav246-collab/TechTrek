import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TechEvent } from '@/data/mockEvents';

export function EventCard({ event }: { event: TechEvent }) {
  const percentage = Math.min(100, Math.round((event.registeredCount / event.capacity) * 100));
  
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  return (
    <Link href={`/events/${event.eventId || event.id}`} className="block h-full">
      <Card className="flex flex-col h-full border border-border hover:border-primary/50 hover:shadow-xl transition-all duration-300 bg-card group relative overflow-hidden cursor-pointer">
        {/* Decorative gradient blur based on status */}
        {event.status === 'COMPLETED' ? (
          <div className="absolute top-0 right-0 w-32 h-32 bg-black/5 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
        ) : (
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
        )}

        <div className="flex justify-between items-start mb-4 relative z-10">
          <div>
            <h3 className="font-heading font-bold text-xl text-secondary mb-1">{event.name}</h3>
            <p className="text-foreground/70 text-sm font-medium">{event.collegeName} • {event.city}</p>
          </div>
          <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest ${event.status === 'UPCOMING' ? 'bg-primary text-white shadow-md' : 'bg-black/10 text-foreground/50'}`}>
            {event.status}
          </span>
        </div>
        
        <div className="text-sm font-medium text-foreground/80 mb-6 flex items-center gap-2 relative z-10">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> {formatDate(event.dateTime)}
        </div>
        
        <div className="mt-auto pt-6 border-t border-border relative z-10">
          <div className="flex justify-between text-xs mb-2">
            <span className="font-semibold text-secondary">Seats Filled</span>
            <span className="text-foreground/70 font-bold">{event.registeredCount} / {event.capacity}</span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full h-2 bg-black/5 rounded-full overflow-hidden mb-6">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-out ${percentage >= 100 ? 'bg-[#b91d1d]' : 'bg-primary'}`} 
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
          
          <Button
            variant={event.status === 'UPCOMING' ? 'primary' : 'secondary'}
            className={`w-full pointer-events-none ${event.status === 'COMPLETED' ? 'opacity-80' : ''}`}
          >
            View Details
          </Button>
        </div>
      </Card>
    </Link>
  );
}
