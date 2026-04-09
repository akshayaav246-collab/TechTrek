"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";

export default function TestimonialCarousel({ featuredFeedback }: { featuredFeedback: any[] }) {
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);

  const defaultFeedback = [
    { name: "Rahul S.", uni: "IIT Delhi", quote: "TechTrek totally changed my perspective on the tech industry. I landed my first internship because of the networks I built here!", eventName: "AI Leadership Summit" },
    { name: "Priya M.", uni: "VIT Vellore", quote: "The hands-on workshops on Cloud Native architectures gave me the exact skills I needed to stand out in my interviews.", eventName: "Cloud Futures Forum" },
    { name: "Arjun K.", uni: "NIT Trichy", quote: "Meeting mentors from top enterprises was invaluable. The guidance I received helped me shape my career path in AI.", eventName: "Industry Awareness Summit" },
    { name: "Neha R.", uni: "KSRCE", quote: "An electrifying experience! The energy, the knowledge sharing, and the community are unmatched. A must-attend for tech enthusiasts.", eventName: "TechTrek Chennai Edition" },
    { name: "Vikram D.", uni: "BITS Pilani", quote: "I came for the cybersecurity talks and stayed for the incredible networking opportunities. Truly a flagship event.", eventName: "Cyber Resilience Forum" }
  ];

  const feedbackList = featuredFeedback && featuredFeedback.length > 0 
    ? featuredFeedback.map((f: any) => ({
        name: f.studentName,
        uni: f.college,
        quote: f.comment,
        eventName: f.eventName,
      }))
    : defaultFeedback;

  return (
    <>
      <div 
        className="slider w-full max-w-7xl mx-auto" 
        style={{ 
          '--width': '400px', 
          '--height': '280px', 
          '--quantity': feedbackList.length 
        } as React.CSSProperties}
      >
        <div className="list">
          {feedbackList.map((item: any, index: number) => (
            <div 
              key={index} 
              className="item p-4" 
              style={{ '--position': index + 1 } as React.CSSProperties}
              onClick={() => setSelectedFeedback(item)}
            >
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm h-full w-full text-white slider-card shadow-lg flex flex-col justify-center transition-all duration-300 hover:bg-white/10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-lg shadow-inner">
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{item.name}</h4>
                    <span className="text-sm text-primary font-medium">{item.uni}</span>
                  </div>
                </div>
                {item.eventName && (
                  <p className="mb-3 inline-flex w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
                    {item.eventName}
                  </p>
                )}
                {/* Removed title attribute to disable native tooltip */}
                <p className="italic text-white/80 leading-snug text-base font-light overflow-hidden text-ellipsis line-clamp-2">&quot;{item.quote}&quot;</p>
              </Card>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .slider {
          width: 100%;
          height: var(--height);
          overflow: hidden;
          mask-image: linear-gradient(to right, transparent, #000 10%, #000 90%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, #000 10%, #000 90%, transparent);
        }
        .slider .list {
          display: flex;
          width: 100%;
          min-width: calc(var(--width) * var(--quantity));
          position: relative;
        }
        .slider .list .item {
          width: var(--width);
          height: var(--height);
          position: absolute;
          left: 100%;
          animation: autoRun 30s linear infinite;
          transition: transform 0.4s ease, filter 0.4s ease;
          animation-delay: calc(
            (30s / var(--quantity)) * (var(--position) - 1) - 30s
          ) !important;
          cursor: pointer;
        }
        @keyframes autoRun {
          from { left: 100%; }
          to { left: calc(var(--width) * -1); }
        }
        
        /* Decrease Speed / Pause on Hover */
        .slider:hover .item {
          animation-play-state: paused !important;
        }
        
        /* Enlarge on Hover */
        .slider .list .item:hover {
          transform: scale(1.05);
          z-index: 10;
        }
        
        /* Responsive sizing */
        @media (max-width: 768px) {
          .slider {
            --width: 320px !important;
            --height: 280px !important;
          }
        }
      `}</style>

      {/* Pop-up Modal for Full Feedback */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedFeedback(null)}>
          <div 
            className="bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl max-w-2xl w-full p-8 relative scale-in-center transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
              onClick={() => setSelectedFeedback(null)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-2xl shadow-inner text-white">
                {selectedFeedback.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-2xl text-white">{selectedFeedback.name}</h4>
                <span className="text-base text-primary font-medium">{selectedFeedback.uni}</span>
              </div>
            </div>
            {selectedFeedback.eventName && (
              <p className="mb-6 inline-flex w-fit rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                {selectedFeedback.eventName}
              </p>
            )}
            <p className="italic text-white/90 leading-relaxed text-lg font-light">&quot;{selectedFeedback.quote}&quot;</p>
          </div>
        </div>
      )}
    </>
  );
}
