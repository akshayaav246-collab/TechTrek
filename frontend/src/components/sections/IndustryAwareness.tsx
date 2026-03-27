import Link from 'next/link';
import { CalendarIcon, ClockIcon, NewsIcon } from '@/components/Icons';
import { SpeakerCarousel } from './SpeakerCarousel';

interface RSSItem {
  title: string;
  link: string;
}

const FALLBACK_ITEMS = [
  { title: "India's startup ecosystem crosses 1.4 lakh registered firms", label: "Startup", color: "text-green-400" },
  { title: "PLI scheme drives manufacturing output up 22% in Q3 FY25", label: "Policy", color: "text-blue-400" },
  { title: "Nifty IT index rallies 3.8% on strong Q4 guidance", label: "Markets", color: "text-[#e8631a]" },
  { title: "India's EV sector sees record ₹9,000 Cr investment in 2025", label: "Tech", color: "text-purple-400" },
  { title: "UPI transactions hit ₹20 lakh crore in March 2025", label: "Policy", color: "text-blue-400" },
  { title: "India climbs to 39th in Global Innovation Index 2024", label: "Policy", color: "text-blue-400" }
];

function categorizeHeadline(title: string) {
  const t = title.toLowerCase();
  if (t.includes('startup') || t.includes('unicorn') || t.includes('funding')) return { label: 'Startup', color: 'text-green-400' };
  if (t.includes('policy') || t.includes('government') || t.includes('scheme') || t.includes('pli')) return { label: 'Policy', color: 'text-blue-400' };
  if (t.includes('market') || t.includes('nifty') || t.includes('sensex') || t.includes('gdp')) return { label: 'Markets', color: 'text-[#e8631a]' };
  if (t.includes('tech') || t.includes('ai') || t.includes('ev') || t.includes('digital')) return { label: 'Tech', color: 'text-purple-400' };
  return { label: 'Industry', color: 'text-foreground/50' };
}

async function fetchTickers() {
  try {
    const feedUrl = encodeURIComponent('https://news.google.com/rss/search?q="Information+Technology"+OR+"Artificial+Intelligence"+OR+"Emerging+Technology"+India+when:1d&hl=en-IN&gl=IN&ceid=IN:en');
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${feedUrl}`, { 
      next: { revalidate: 86400 } // Revalidate every 24 hours as requested
    });
    if (!res.ok) {
      console.error('RSS fetch failed:', res.status);
      return FALLBACK_ITEMS;
    }
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      let parsed = data.items.map((item: RSSItem) => ({
        title: item.title.split(' - ')[0], // Clean suffix usually attached by Google News
        link: item.link,
        ...categorizeHeadline(item.title)
      }));
      if (parsed.length < 5) {
        // Pad with fallbacks to guarantee at least 5 items
        parsed = [...parsed, ...FALLBACK_ITEMS.slice(0, 5 - parsed.length)];
      }
      return parsed;
    }
  } catch (error) {
    // return fallbacks safely without crashing
  }
  return FALLBACK_ITEMS;
}

export default async function IndustryAwareness() {
  const tickerItems = await fetchTickers();

  // Create an array long enough to fill the screen
  let baseBlock = [...tickerItems];
  while (baseBlock.length < 15) { // increased length to ensure it overflows the screen easily
    baseBlock = [...baseBlock, ...tickerItems];
  }
  
  // Create infinite array by duplicating the base block once
  // This ensures that when the animation reaches 50% (the end of the first half),
  // it seamlessly loops back to the beginning.
  const marqueeItems = [...baseBlock, ...baseBlock];
  
  // Calculate dynamic duration based on the number of items in the base block (much faster speed)
  const duration = baseBlock.length * 6.0;

  return (
    <section className="bg-background text-foreground font-body w-full overflow-hidden pt-12">
      
      {/* SECTION 1 - HEADER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 text-center">
        <h2 className="font-bebas text-5xl md:text-7xl tracking-wider text-secondary uppercase mb-4">
          Industry Awareness Summit
        </h2>
        <p className="font-dm italic text-2xl md:text-3xl text-foreground/70">
          Where students meet the minds shaping India's future
        </p>
      </div>

      {/* SECTION 4 - LIVE ROTATING INDUSTRY NEWS (TICKER) */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="bg-secondary rounded-xl flex items-center overflow-hidden border border-white/10 shadow-lg">
           <div className="bg-secondary text-primary font-bold px-6 py-4 flex-shrink-0 z-10 font-heading tracking-widest uppercase text-sm border-r border-white/10 flex items-center gap-2">
             <NewsIcon className="w-5 h-5" /> Industry Pulse
           </div>
           
           <div className="flex-grow overflow-hidden relative group">
             <div 
               className="flex w-max whitespace-nowrap animate-marquee group-hover:[animation-play-state:paused] items-center py-4"
               style={{ animationDuration: `${duration}s` }}
             >
               {marqueeItems.map((item, idx) => (
                 <div key={idx} className="flex items-center text-white/90 px-8 text-sm md:text-base">
                   {item.link ? (
                     <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors hover:underline">
                        {item.title}
                     </a>
                   ) : (
                     <span>{item.title}</span>
                   )}
                   <span className="ml-8 text-white/20">|</span>
                 </div>
               ))}
             </div>
           </div>
        </div>
      </div>

      {/* SECTION 2 - TED-STYLE TALK CARDS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <SpeakerCarousel />
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
        .group:hover .animate-marquee {
          animation-play-state: paused !important;
        }
      `}</style>
    </section>
  );
}
