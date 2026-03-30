"use client";

import { useState } from 'react';

type Speaker = { _id: string; name: string; role: string; company: string; bio: string };

export function SpeakerCarousel({ speakers }: { speakers: Speaker[] }) {
  const [startIndex, setStartIndex] = useState(0);

  // Render 3 at a time normally, responsiveness handles scaling down to 1 
  // column but practically the DOM holds 3 for the user to swipe/scroll or just be blocks
  const visibleSpeakers = speakers.slice(startIndex, startIndex + 3);
  const showPrev = startIndex > 0;
  const showNext = startIndex + 3 < speakers.length;

  const next = () => {
    if (showNext) setStartIndex(s => s + 1);
  };

  const prev = () => {
    if (showPrev) setStartIndex(s => s - 1);
  };

  if (speakers.length === 0) return null;

  return (
    <div className="w-full">
      <h2 className="text-lg md:text-xl font-bold uppercase tracking-[0.2em] text-[#e8631a] mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="w-8 h-px bg-[#e8631a]"></span> Featured Speakers
        </div>
        
        {speakers.length > 3 && (
          <div className="flex items-center gap-2">
            <button 
              onClick={prev}
              disabled={!showPrev}
              className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${showPrev ? 'border-[#0E1B3D]/20 text-[#0E1B3D] hover:bg-[#0E1B3D] hover:border-[#0E1B3D] hover:text-white hover:scale-105 shadow-sm' : 'border-gray-200 text-gray-300 cursor-not-allowed opacity-50'}`}
              aria-label="Previous speakers"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <button 
              onClick={next}
              disabled={!showNext}
              className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${showNext ? 'border-[#0E1B3D]/20 text-[#0E1B3D] hover:bg-[#0E1B3D] hover:border-[#0E1B3D] hover:text-white hover:scale-105 shadow-sm' : 'border-gray-200 text-gray-300 cursor-not-allowed opacity-50'}`}
              aria-label="Next speakers"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        )}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-all duration-300">
        {visibleSpeakers.map((speaker, index) => (
          <div key={`${speaker._id}-${index}`} className="border-none shadow-xl hover:shadow-2xl transition-all duration-300 bg-white group relative overflow-hidden rounded-[2rem] h-full min-h-[440px] flex flex-col p-0">
            {/* Top Half (Dark edge-to-edge block) */}
            <div className="bg-[#0E1B3D] border-b-[4px] border-[#e8631a] flex flex-col items-center pt-8 pb-6 px-4 relative shrink-0 text-center w-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#e8631a]/10 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150 pointer-events-none"></div>
              
              <div className="w-20 h-20 rounded-full bg-[#e8631a] flex items-center justify-center text-white font-bebas text-4xl shadow-lg border-[3px] border-[#0E1B3D] mb-4 relative z-10 shrink-0">
                {speaker.name.charAt(0).toUpperCase()}{speaker.name.split(' ')[1] ? speaker.name.split(' ')[1].charAt(0).toUpperCase() : ''}
              </div>
              
              <h4 className="font-extrabold font-heading tracking-tight text-3xl text-white mb-2 relative z-10 shrink-0">{speaker.name}</h4>
              <div className="text-white/60 font-semibold text-xs tracking-wide relative z-10 capitalize shrink-0">
                {speaker.role}, <span className="text-white/40">{speaker.company}</span>
              </div>
            </div>

            {/* Bottom Half (Light) */}
            <div className="flex-1 flex flex-col bg-white relative text-left px-6 py-8 w-full">
              <div className="flex flex-wrap gap-2 mb-4 shrink-0">
                <span className="px-2.5 py-1 bg-[#e8631a]/10 text-[#e8631a] text-[9px] font-extrabold uppercase rounded-lg tracking-widest">#TECHINDUSTRY</span>
                <span className="px-2.5 py-1 bg-[#e8631a]/10 text-[#e8631a] text-[9px] font-extrabold uppercase rounded-lg tracking-widest">#AI</span>
              </div>
              
              <h5 className="font-heading font-black text-xl text-[#0E1B3D] mb-3 leading-snug shrink-0">
                "India's $1T Tech Dream: What It Means for the Class of {new Date().getFullYear() + 1}"
              </h5>
              
              <p className="text-[13px] text-[#0E1B3D]/70 leading-relaxed font-semibold flex-1 mb-2">
                {speaker.bio}
              </p>

              <div className="border-t border-[#0E1B3D]/10 mt-4 pt-4 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#0E1B3D]/30">{speaker.company}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
