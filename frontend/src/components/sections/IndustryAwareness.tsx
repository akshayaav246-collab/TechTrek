import Link from 'next/link';

interface RSSItem {
  title: string;
  link: string;
}

const FALLBACK_ITEMS = [
  { title: "India's startup ecosystem crosses 1.4 lakh registered firms", label: "Startup", color: "text-green-400" },
  { title: "PLI scheme drives manufacturing output up 22% in Q3 FY25", label: "Policy", color: "text-blue-400" },
  { title: "Nifty IT index rallies 3.8% on strong Q4 guidance", label: "Markets", color: "text-orange-400" },
  { title: "India's EV sector sees record ₹9,000 Cr investment in 2025", label: "Tech", color: "text-purple-400" },
  { title: "UPI transactions hit ₹20 lakh crore in March 2025", label: "Policy", color: "text-blue-400" },
  { title: "India climbs to 39th in Global Innovation Index 2024", label: "Policy", color: "text-blue-400" }
];

function categorizeHeadline(title: string) {
  const t = title.toLowerCase();
  if (t.includes('startup') || t.includes('unicorn') || t.includes('funding')) return { label: 'Startup', color: 'text-green-400' };
  if (t.includes('policy') || t.includes('government') || t.includes('scheme') || t.includes('pli')) return { label: 'Policy', color: 'text-blue-400' };
  if (t.includes('market') || t.includes('nifty') || t.includes('sensex') || t.includes('gdp')) return { label: 'Markets', color: 'text-orange-400' };
  if (t.includes('tech') || t.includes('ai') || t.includes('ev') || t.includes('digital')) return { label: 'Tech', color: 'text-purple-400' };
  return { label: 'Industry', color: 'text-foreground/50' };
}

async function fetchTickers() {
  try {
    const feedUrl = encodeURIComponent('https://news.google.com/rss/search?q=Technology+AI+India&hl=en-IN&gl=IN&ceid=IN:en');
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${feedUrl}`, { cache: 'no-store' });
    if (!res.ok) {
      console.error('RSS fetch failed:', res.status);
      return FALLBACK_ITEMS;
    }
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      return data.items.map((item: RSSItem) => ({
        title: item.title.split(' - ')[0], // Clean suffix usually attached by Google News
        link: item.link,
        ...categorizeHeadline(item.title)
      }));
    }
  } catch (error) {
    // return fallbacks safely without crashing
  }
  return FALLBACK_ITEMS;
}

export default async function IndustryAwareness() {
  const tickerItems = await fetchTickers();

  // Create infinite array by duplicating items to ensure marquee fills the screen
  const marqueeItems = [...tickerItems, ...tickerItems];

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
           <div className="bg-secondary text-primary font-bold px-6 py-4 flex-shrink-0 z-10 font-heading tracking-widest uppercase text-sm border-r border-white/10">
             📰 Industry Pulse
           </div>
           
           <div className="flex-grow overflow-hidden relative group">
             <div className="flex whitespace-nowrap animate-marquee group-hover:[animation-play-state:paused] items-center py-4">
               {marqueeItems.map((item, idx) => (
                 <div key={idx} className="flex items-center text-white/90 px-8 text-sm md:text-base border-r border-white/10 last:border-r-0">
                   <span className={`mr-2 ${item.color}`}>●</span>
                   <span className={`font-bold mr-2 opacity-90 uppercase tracking-widest text-[11px] ${item.color}`}>{item.label}</span>
                   {item.link ? (
                     <a href={item.link} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors hover:underline">
                        {item.title}
                     </a>
                   ) : (
                     <span>{item.title}</span>
                   )}
                 </div>
               ))}
             </div>
           </div>
        </div>
      </div>

      {/* SECTION 2 - TED-STYLE TALK CARDS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Card 1 */}
          <div className="flex flex-col rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-border group bg-card">
            <div className="bg-secondary/95 p-8 flex flex-col items-center justify-center text-center relative overflow-hidden h-48 stretch-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white font-bebas text-3xl mb-4 relative z-10 shadow-md">
                RS
              </div>
              <h3 className="text-white font-bold text-xl relative z-10">Rohit Sharma</h3>
              <p className="text-white/70 text-sm mt-1 relative z-10">VP Strategy, Infosys</p>
            </div>
            <div className="p-8 flex-grow flex flex-col">
              <div className="flex gap-2 mb-4">
                <span className="text-[10px] font-bold tracking-widest uppercase text-primary bg-primary/10 px-2 py-1 rounded">#TechIndustry</span>
                <span className="text-[10px] font-bold tracking-widest uppercase text-primary bg-primary/10 px-2 py-1 rounded">#AI</span>
              </div>
              <h4 className="font-dm font-bold text-xl leading-snug mb-3 text-secondary">
                "India's $1T Tech Dream: What It Means for the Class of 2026"
              </h4>
              <p className="text-foreground/70 text-sm mb-6 flex-grow">
                A deep dive into how generative AI and cloud infrastructure will reshape entry-level careers.
              </p>
              <div className="flex justify-between items-center text-xs text-foreground/70 font-medium border-t border-border pt-4 mb-6">
                <div className="flex items-center gap-1"><span className="text-base text-foreground">📅</span> Mar 12, 10:00 AM</div>
                <div className="flex items-center gap-1"><span className="text-base text-foreground">⏱</span> 45 mins</div>
              </div>
              <button className="w-full bg-secondary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary transition-colors group/btn">
                Explore Talk <span className="ml-1 transition-transform inline-block group-hover/btn:translate-x-1">→</span>
              </button>
            </div>
          </div>

          {/* Card 2 */}
          <div className="flex flex-col rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-border group bg-card">
            <div className="bg-secondary/95 p-8 flex flex-col items-center justify-center text-center relative overflow-hidden h-48 stretch-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white font-bebas text-3xl mb-4 relative z-10 shadow-md">
                PK
              </div>
              <h3 className="text-white font-bold text-xl relative z-10">Priya Krishnan</h3>
              <p className="text-white/70 text-sm mt-1 relative z-10">Founder, GreenLeaf Ventures</p>
            </div>
            <div className="p-8 flex-grow flex flex-col">
              <div className="flex gap-2 mb-4">
                <span className="text-[10px] font-bold tracking-widest uppercase text-primary bg-primary/10 px-2 py-1 rounded">#GreenEnergy</span>
                <span className="text-[10px] font-bold tracking-widest uppercase text-primary bg-primary/10 px-2 py-1 rounded">#Startups</span>
              </div>
              <h4 className="font-dm font-bold text-xl leading-snug mb-3 text-secondary">
                "Climate Tech is the New Software: Building Green in Bharat"
              </h4>
              <p className="text-foreground/70 text-sm mb-6 flex-grow">
                Why the next wave of unicorn startups will focus on sustainability and renewable resources.
              </p>
              <div className="flex justify-between items-center text-xs text-foreground/70 font-medium border-t border-border pt-4 mb-6">
                <div className="flex items-center gap-1"><span className="text-base text-foreground">📅</span> Mar 12, 11:30 AM</div>
                <div className="flex items-center gap-1"><span className="text-base text-foreground">⏱</span> 30 mins</div>
              </div>
              <button className="w-full bg-secondary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary transition-colors group/btn">
                Explore Talk <span className="ml-1 transition-transform inline-block group-hover/btn:translate-x-1">→</span>
              </button>
            </div>
          </div>

          {/* Card 3 */}
          <div className="flex flex-col rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-border group bg-card">
            <div className="bg-secondary/95 p-8 flex flex-col items-center justify-center text-center relative overflow-hidden h-48 stretch-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white font-bebas text-3xl mb-4 relative z-10 shadow-md">
                AM
              </div>
              <h3 className="text-white font-bold text-xl relative z-10">Arjun Mehta</h3>
              <p className="text-white/70 text-sm mt-1 relative z-10">Head of FinTech, HDFC Bank</p>
            </div>
            <div className="p-8 flex-grow flex flex-col">
              <div className="flex gap-2 mb-4">
                <span className="text-[10px] font-bold tracking-widest uppercase text-primary bg-primary/10 px-2 py-1 rounded">#FinTech</span>
                <span className="text-[10px] font-bold tracking-widest uppercase text-primary bg-primary/10 px-2 py-1 rounded">#UPI</span>
              </div>
              <h4 className="font-dm font-bold text-xl leading-snug mb-3 text-secondary">
                "From UPI to Neo-Banks: Cracking the Next Decade of Money"
              </h4>
              <p className="text-foreground/70 text-sm mb-6 flex-grow">
                Understanding the architecture behind India's digital payment revolution and future projections.
              </p>
              <div className="flex justify-between items-center text-xs text-foreground/70 font-medium border-t border-border pt-4 mb-6">
                <div className="flex items-center gap-1"><span className="text-base text-foreground">📅</span> Mar 12, 02:00 PM</div>
                <div className="flex items-center gap-1"><span className="text-base text-foreground">⏱</span> 60 mins</div>
              </div>
              <button className="w-full bg-secondary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary transition-colors group/btn">
                Explore Talk <span className="ml-1 transition-transform inline-block group-hover/btn:translate-x-1">→</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </section>
  );
}
