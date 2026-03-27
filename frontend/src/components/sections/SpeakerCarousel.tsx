"use client";

import { useState, useEffect } from 'react';

// SVGs
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

const SPEAKERS = [
  {
    initials: "RS",
    name: "Rohit Sharma",
    title: "VP Strategy, Infosys",
    tags: ["#TechIndustry", "#AI"],
    headline: "\"India's $1T Tech Dream: What It Means for the Class of 2026\"",
    description: "A deep dive into how generative AI and cloud infrastructure will reshape entry-level careers.",
    date: "Mar 12, 10:00 AM",
    duration: "45 mins"
  },
  {
    initials: "PK",
    name: "Priya Krishnan",
    title: "Founder, GreenLeaf Ventures",
    tags: ["#GreenEnergy", "#Startups"],
    headline: "\"Climate Tech is the New Software: Building Green in Bharat\"",
    description: "Why the next wave of unicorn startups will focus on sustainability and renewable resources.",
    date: "Mar 12, 11:30 AM",
    duration: "30 mins"
  },
  {
    initials: "AM",
    name: "Arjun Mehta",
    title: "Head of FinTech, HDFC Bank",
    tags: ["#FinTech", "#UPI"],
    headline: "\"From UPI to Neo-Banks: Cracking the Next Decade of Money\"",
    description: "Understanding the architecture behind India's digital payment revolution and future projections.",
    date: "Mar 12, 02:00 PM",
    duration: "60 mins"
  },
  {
    initials: "SV",
    name: "Sneha Varma",
    title: "Lead AI Engineer, Google",
    tags: ["#AI", "#MachineLearning"],
    headline: "\"Beyond Pattern Matching: The Frontier of Reasoning Logic in AI\"",
    description: "Exploring the next steps of fundamental AGI architecture and prompt logic breakthroughs.",
    date: "Mar 13, 10:30 AM",
    duration: "40 mins"
  },
  {
    initials: "MK",
    name: "Manoj Kumar",
    title: "CISO, CyberTech India",
    tags: ["#Cybersecurity", "#Infosec"],
    headline: "\"Zero Trust Architecture in a Decentralized Remote Workforce\"",
    description: "How modern security infrastructure is fundamentally adapting to distributed engineering teams.",
    date: "Mar 13, 01:00 PM",
    duration: "35 mins"
  },
  {
    initials: "AD",
    name: "Anjali Desai",
    title: "VP Product, Zomato",
    tags: ["#ProductManagement", "#UX"],
    headline: "\"Psychology of Scale: Building UX for the Next Billion Users\"",
    description: "Learning interaction design that organically bridges language barriers across emerging markets.",
    date: "Mar 14, 09:30 AM",
    duration: "50 mins"
  }
];

export function SpeakerCarousel() {
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

  const maxIndex = Math.max(0, SPEAKERS.length - cardsToShow);

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

  return (
    <div className="relative group w-full px-16 md:px-24">
      
      {/* Left Arrow */}
      {currentIndex > 0 && (
        <button 
          onClick={handlePrev}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-secondary text-primary hover:bg-primary hover:text-white transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50"
          aria-label="Previous speakers"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
            width: `${(SPEAKERS.length * 100) / cardsToShow}%`, 
            transform: `translateX(-${currentIndex * (100 / SPEAKERS.length)}%)` 
          }}
        >
          {SPEAKERS.map((speaker, idx) => (
            <div 
              key={idx} 
              className="flex-shrink-0 px-4"
              style={{ width: `${100 / SPEAKERS.length}%` }}
            >
              <div className="flex flex-col h-full rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border border-border group/card bg-card">
                <div className="bg-secondary/95 p-8 flex flex-col items-center justify-center text-center relative overflow-hidden h-48 shrink-0">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover/card:scale-150"></div>
                  <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white font-bebas text-3xl mb-4 relative z-10 shadow-md">
                    {speaker.initials}
                  </div>
                  <h3 className="text-white font-bold text-xl relative z-10">{speaker.name}</h3>
                  <p className="text-white/70 text-sm mt-1 relative z-10">{speaker.title}</p>
                </div>
                
                <div className="p-8 flex-grow flex flex-col">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {speaker.tags.map(tag => (
                      <span key={tag} className="text-[10px] font-bold tracking-widest uppercase text-[#e8631a] bg-[#e8631a]/10 px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h4 className="font-dm font-bold text-xl leading-snug mb-3 text-secondary">
                    {speaker.headline}
                  </h4>
                  <p className="text-foreground/70 text-sm mb-6 flex-grow">
                    {speaker.description}
                  </p>
                  <div className="flex justify-between items-center text-xs text-foreground/70 font-medium border-t border-border pt-4 mb-6">
                    <div className="flex items-center gap-1"><CalendarIcon className="w-4 h-4 text-foreground/60" /> {speaker.date}</div>
                    <div className="flex items-center gap-1"><ClockIcon className="w-4 h-4 text-foreground/60" /> {speaker.duration}</div>
                  </div>
                  <button className="w-full bg-secondary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary transition-colors group/btn">
                    Explore Talk <span className="ml-1 transition-transform inline-block group-hover/btn:translate-x-1">→</span>
                  </button>
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
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-full bg-secondary text-primary hover:bg-primary hover:text-white transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50"
          aria-label="Next speakers"
        >
          <svg className="w-6 h-6 -mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

    </div>
  );
}
