import { NewsIcon } from '@/components/Icons';
import { SpeakerCarousel } from './SpeakerCarousel';

interface RSSItem {
  title: string;
  link: string;
  pubDate?: string;
}

type RSSResponse = {
  items?: RSSItem[];
};

type TickerItem = {
  title: string;
  link?: string;
  label: string;
  color: string;
  publishedAt: number;
};

type EventSpeaker = {
  _id?: string;
  id?: string;
  name: string;
  role: string;
  company?: string;
  bio: string;
};

type EventAgendaItem = {
  time: string;
  title: string;
  duration: string;
  speaker?: string;
};

type LandingEvent = {
  eventId?: string;
  _id?: string;
  name: string;
  dateTime: string;
  status: string;
  speakers?: EventSpeaker[];
  agenda?: EventAgendaItem[];
  days?: Array<{
    day: number;
    label?: string;
    agenda: EventAgendaItem[];
  }>;
};

type SpeakerCard = {
  initials: string;
  name: string;
  title: string;
  tags: string[];
  headline: string;
  description: string;
  date: string;
  duration: string;
};

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');
}

function inferRoleTags(role: string) {
  const lower = role.toLowerCase();
  const rules: Array<{ match: string[]; tag: string }> = [
    { match: ['artificial intelligence', 'ai'], tag: '#AI' },
    { match: ['machine learning', 'ml'], tag: '#MachineLearning' },
    { match: ['data scientist', 'data science', 'data engineer'], tag: '#Data' },
    { match: ['cyber', 'security', 'ciso', 'infosec'], tag: '#Cybersecurity' },
    { match: ['cloud', 'devops', 'platform'], tag: '#Cloud' },
    { match: ['fintech', 'payments', 'upi'], tag: '#FinTech' },
    { match: ['product'], tag: '#Product' },
    { match: ['design', 'ux', 'ui'], tag: '#Design' },
    { match: ['founder', 'co-founder'], tag: '#Startups' },
    { match: ['strategy'], tag: '#Strategy' },
    { match: ['quantum'], tag: '#Quantum' },
    { match: ['robotics'], tag: '#Robotics' },
    { match: ['iot'], tag: '#IoT' },
    { match: ['engineer', 'engineering'], tag: '#Engineering' },
  ];

  const tags = rules
    .filter(rule => rule.match.some(keyword => lower.includes(keyword)))
    .map(rule => rule.tag);

  const unique = Array.from(new Set(tags));
  if (unique.length > 0) return unique.slice(0, 2);

  return role
    .split(/[\s,/&-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => `#${word.replace(/[^a-z0-9]/gi, '')}`);
}

const FALLBACK_ITEMS: TickerItem[] = [
  { title: "India's startup ecosystem crosses 1.4 lakh registered firms", label: 'Startup', color: 'text-green-400', publishedAt: 0 },
  { title: 'PLI scheme drives manufacturing output up 22% in Q3 FY25', label: 'Policy', color: 'text-blue-400', publishedAt: 0 },
  { title: 'Nifty IT index rallies 3.8% on strong Q4 guidance', label: 'Markets', color: 'text-[#e8631a]', publishedAt: 0 },
  { title: "India's EV sector sees record ₹9,000 Cr investment in 2025", label: 'Tech', color: 'text-purple-400', publishedAt: 0 },
  { title: 'UPI transactions hit ₹20 lakh crore in March 2025', label: 'Policy', color: 'text-blue-400', publishedAt: 0 },
  { title: 'India climbs to 39th in Global Innovation Index 2024', label: 'Policy', color: 'text-blue-400', publishedAt: 0 },
];

function categorizeHeadline(title: string) {
  const t = title.toLowerCase();
  if (t.includes('startup') || t.includes('unicorn') || t.includes('funding'))
    return { label: 'Startup', color: 'text-green-400' };
  if (t.includes('policy') || t.includes('government') || t.includes('scheme') || t.includes('pli'))
    return { label: 'Policy', color: 'text-blue-400' };
  if (t.includes('market') || t.includes('nifty') || t.includes('sensex') || t.includes('gdp'))
    return { label: 'Markets', color: 'text-[#e8631a]' };
  if (t.includes('tech') || t.includes('ai') || t.includes('ev') || t.includes('digital'))
    return { label: 'Tech', color: 'text-purple-400' };
  return { label: 'Industry', color: 'text-foreground/50' };
}

async function fetchTickers(): Promise<TickerItem[]> {
  try {
    const feedUrl = encodeURIComponent(
      'https://news.google.com/rss/search?q=("Information+Technology"+OR+"Artificial+Intelligence"+OR+"Emerging+Technology")+India+when:12h&hl=en-IN&gl=IN&ceid=IN:en'
    );
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${feedUrl}`, {
      next: { revalidate: 43200 },
    });
    if (!res.ok) {
      console.error('RSS fetch failed:', res.status);
      return FALLBACK_ITEMS;
    }
    const data: RSSResponse = await res.json();
    if (data.items && data.items.length > 0) {
      const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;

      let parsed: TickerItem[] = data.items
        .map((item: RSSItem) => ({
          title: item.title.split(' - ')[0],
          link: item.link,
          publishedAt: item.pubDate ? new Date(item.pubDate).getTime() : 0,
          ...categorizeHeadline(item.title),
        }))
        .filter((item: TickerItem) => item.publishedAt === 0 || item.publishedAt >= twelveHoursAgo)
        .sort((a: TickerItem, b: TickerItem) => b.publishedAt - a.publishedAt)
        .slice(0, 8);

      if (parsed.length < 5) {
        parsed = [...parsed, ...FALLBACK_ITEMS.slice(0, 5 - parsed.length)];
      }
      return parsed;
    }
  } catch (err) {
    console.error('fetchTickers failed:', err);
  }
  return FALLBACK_ITEMS;
}

async function fetchUpcomingSpeakerCards(): Promise<SpeakerCard[]> {
  try {
    const res = await fetch('http://localhost:5000/api/events', {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      console.error('Events fetch failed:', res.status);
      return [];
    }

    const events = (await res.json()) as LandingEvent[];

    const upcomingEvents = events
      .filter(event => event.status === 'UPCOMING')
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

    console.log('Upcoming events found:', upcomingEvents.length);
    for (const event of upcomingEvents) {
      console.log('Event:', event.name);
      console.log('Speakers:', event.speakers?.map(s => s.name));
      console.log('Agenda items with speakers:', event.agenda?.filter(i => i.speaker).map(i => i.speaker));
      console.log('Days agenda with speakers:', event.days?.flatMap(d => d.agenda ?? []).filter(i => i.speaker).map(i => i.speaker));
    }

    const firstUpcomingEvent = upcomingEvents[0];
    if (!firstUpcomingEvent) return [];

    const eventDate = new Date(firstUpcomingEvent.dateTime).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    });

    const scheduleItems: EventAgendaItem[] = [
      ...(firstUpcomingEvent.agenda ?? []),
      ...(firstUpcomingEvent.days ?? []).flatMap(day => day.agenda ?? []),
    ];

    const seenSpeakers = new Set<string>();
    const cards: SpeakerCard[] = [];

    for (const item of scheduleItems) {
      if (!item.speaker) continue;

      const speakerName = item.speaker.trim().toLowerCase();
      if (seenSpeakers.has(speakerName)) continue;

      const matchedSpeaker = (firstUpcomingEvent.speakers ?? []).find(s => {
        const sName = s.name.trim().toLowerCase();
        return sName === speakerName ||
          sName.includes(speakerName) ||
          speakerName.includes(sName);
      });

      if (!matchedSpeaker) {
        console.warn(`No speaker match found for agenda item speaker: "${item.speaker}"`);
        continue;
      }

      seenSpeakers.add(speakerName);
      cards.push({
        initials: getInitials(matchedSpeaker.name),
        name: matchedSpeaker.name,
        title: matchedSpeaker.company
          ? `${matchedSpeaker.role}, ${matchedSpeaker.company}`
          : matchedSpeaker.role,
        tags: inferRoleTags(matchedSpeaker.role),
        headline: item.title,
        description: matchedSpeaker.bio,
        date: `${eventDate}, ${item.time}`,
        duration: item.duration,
      });
    }

    console.log('Speaker cards built:', cards.length);
    return cards;

  } catch (err) {
    console.error('fetchUpcomingSpeakerCards failed:', err);
    return [];
  }
}

export default async function IndustryAwareness() {
  const tickerItems = await fetchTickers();
  const speakerCards = await fetchUpcomingSpeakerCards();

  let baseBlock = [...tickerItems];
  while (baseBlock.length < 15) {
    baseBlock = [...baseBlock, ...tickerItems];
  }

  const marqueeItems = [...baseBlock, ...baseBlock];
  const duration = baseBlock.length * 6.0;

  return (
    <section className="bg-background text-foreground font-body w-full overflow-hidden pt-12">

      {/* SECTION 1 - HEADER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 text-center">
        <h2 className="font-bebas text-5xl md:text-7xl tracking-wider text-secondary uppercase mb-4">
          Industry Awareness Summit
        </h2>
        <p className="font-dm italic text-2xl md:text-3xl text-foreground/70">
          Where students meet the minds shaping India&apos;s future
        </p>
      </div>

      {/* SECTION 2 - LIVE ROTATING INDUSTRY NEWS TICKER */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="bg-secondary rounded-xl flex items-center overflow-hidden border border-white/10 shadow-lg">
          <div className="bg-secondary text-primary font-bold px-6 py-4 flex-shrink-0 z-10 font-heading tracking-widest uppercase text-sm border-r border-white/10 flex items-center gap-2">
            <NewsIcon className="w-5 h-5" /> Industry Pulse
          </div>

          <div className="flex-grow overflow-hidden relative group">
            {/* FIX 1: Added the missing closing `>` on the style prop */}
            <div
              className="flex w-max whitespace-nowrap animate-marquee group-hover:[animation-play-state:paused] items-center py-4"
              style={{ animationDuration: `${duration}s` }}
            >
              {marqueeItems.map((item, idx) => (
                <div key={idx} className="flex items-center text-white/90 px-8 text-sm md:text-base">
                  {item.link ? (
                    // FIX 2: Added the missing opening `<a` tag
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors hover:underline"
                    >
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

      {/* SECTION 3 - SPEAKER CARDS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        {speakerCards.length > 0 ? (
          <SpeakerCarousel speakers={speakerCards} />
        ) : (
          <p className="text-center text-foreground/40 text-sm py-12">
            Speaker profiles will appear here once sessions are announced.
          </p>
        )}
      </div>

      {/* FIX 3: Use the dynamic `duration` variable instead of the hardcoded 20s */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee ${duration}s linear infinite;
        }
        .group:hover .animate-marquee {
          animation-play-state: paused !important;
        }
      `}</style>
    </section>
  );
}
