"use client";

import { useState, useEffect } from 'react';

type Speaker = { _id: string; name: string; role: string; company: string; bio: string; headline?: string; tags?: string[]; date?: string; duration?: string; image?: string; };

function CalendarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  );
}

function ClockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

export function SpeakerCarousel({ speakers }: { speakers: Speaker[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardsToShow, setCardsToShow] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setCardsToShow(1);
      else if (window.innerWidth < 1024) setCardsToShow(2);
      else setCardsToShow(3);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxIndex = Math.max(0, speakers.length - cardsToShow);

  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [maxIndex, currentIndex]);

  const handleNext = () => {
    if (currentIndex < maxIndex) setCurrentIndex(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  if (speakers.length === 0) return null;

  return (
    <div className="w-full">
      <h2 className="text-lg md:text-xl font-bold uppercase tracking-[0.2em] text-[#e8631a] mb-8 flex items-center">
        <span className="w-8 h-px bg-[#e8631a] mr-4"></span> Featured Speakers
      </h2>

      <div className="relative group w-full px-8 md:px-20 lg:px-24">
        
        {/* Left Arrow */}
        {currentIndex > 0 && (
          <button 
            onClick={handlePrev}
            className="absolute left-0 md:left-4 lg:left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-secondary text-primary hover:bg-primary hover:text-white transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="Previous speakers"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Overflow Container */}
        <div className="overflow-hidden p-4 -mx-4">
          {/* Sliding Track */}
          <div 
            className="flex transition-transform duration-500 ease-in-out"
            style={{ 
              width: `${(speakers.length * 100) / cardsToShow}%`, 
              transform: `translateX(-${currentIndex * (100 / speakers.length)}%)` 
            }}
          >
            {speakers.map((speaker, idx) => (
              <div 
                key={`${speaker._id}-${idx}`} 
                className="flex-shrink-0 px-4"
                style={{ width: `${100 / speakers.length}%` }}
              >
                <div className="flex flex-col h-full rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border border-border group/card bg-card">
                  <div className="bg-secondary/95 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden h-36 md:h-40 shrink-0">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover/card:scale-150"></div>
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-primary flex items-center justify-center text-white font-bebas text-xl md:text-2xl mb-3 md:mb-4 relative z-10 shadow-md">
                      {speaker.name.charAt(0).toUpperCase()}{speaker.name.split(' ')[1] ? speaker.name.split(' ')[1].charAt(0).toUpperCase() : ''}
                    </div>
                    <h3 className="text-white font-bold text-lg md:text-xl relative z-10">{speaker.name}</h3>
                    <p className="text-white/70 text-xs md:text-sm mt-1 relative z-10">{speaker.role}, {speaker.company}</p>
                  </div>
                  
                  <div className="p-6 md:p-8 flex-grow flex flex-col">
                    <div className="flex flex-wrap gap-2 mb-3 md:mb-4">
                      {(speaker.tags || ['#TECH', '#FEATURED']).map((tag: string) => (
                        <span key={tag} className="text-[10px] font-bold tracking-widest uppercase text-[#e8631a] bg-[#e8631a]/10 px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h4 className="font-dm font-bold text-xl leading-snug mb-3 text-secondary">
                      {speaker.headline || `Insights from ${speaker.name} on ${speaker.company}'s innovations`}
                    </h4>
                    <p className="text-foreground/70 text-sm mb-6 flex-grow">
                      {speaker.bio || "Join this exciting session to gain industry-leading insights."}
                    </p>
                    <div className="flex justify-between items-center text-xs text-foreground/70 font-medium border-t border-border pt-4 mb-6">
                      <div className="flex items-center gap-1"><CalendarIcon className="w-4 h-4 text-foreground/60" /> {speaker.date || "TBD"}</div>
                      <div className="flex items-center gap-1"><ClockIcon className="w-4 h-4 text-foreground/60" /> {speaker.duration || "45 mins"}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Arrow */}
        {currentIndex < maxIndex && (
          <button 
            onClick={handleNext}
            className="absolute right-0 md:right-4 lg:right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-secondary text-primary hover:bg-primary hover:text-white transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="Next speakers"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6 -mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

      </div>
    </div>
  );
}

