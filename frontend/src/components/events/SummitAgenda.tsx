'use client';

import { useState } from 'react';

type AgendaItem = { time: string; title: string; duration: string; speaker?: string };
type DaySchedule = { day: number; label?: string; agenda: AgendaItem[] };

function AgendaList({ items }: { items: AgendaItem[] }) {
  return (
    <div className="flex flex-col gap-10 pl-6 border-l-[3px] border-[#0E1B3D]/10 ml-2 md:ml-4 py-4">
      {items.map((item, i) => (
        <div key={i} className="relative pl-8 md:pl-10 group">
          <div className="absolute -left-[45px] md:-left-[53px] top-1 w-6 h-6 rounded-full bg-[#0E1B3D]/10 group-hover:bg-[#e8631a] transition-colors ring-[6px] ring-[#F9F8F6] flex items-center justify-center">
            <div className="w-2 h-2 bg-[#F9F8F6] rounded-full" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-5 mb-3">
            <span className="font-bold text-[#e8631a] text-2xl tracking-tight">{item.time}</span>
            <span className="text-xs font-bold text-[#0E1B3D]/50 uppercase bg-[#0E1B3D]/5 px-3 py-1.5 rounded-lg border border-[#0E1B3D]/5 w-fit tracking-wider">
              Duration: {item.duration}
            </span>
          </div>
          <h4 className="text-2xl md:text-3xl font-bold text-[#0E1B3D] mb-4 leading-snug">{item.title}</h4>
          {item.speaker && (
            <div className="flex items-center gap-4 mt-5">
              <div className="w-10 h-10 rounded-full bg-[#0E1B3D] flex items-center justify-center text-white text-sm font-bold shadow-inner">
                {item.speaker.charAt(0)}
              </div>
              <div className="text-sm font-bold text-[#0E1B3D] bg-white border border-[#0E1B3D]/5 px-5 py-2.5 rounded-xl shadow-sm">
                Led by: <span className="text-[#0E1B3D]/60 ml-1">{item.speaker}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function SummitAgenda({
  agenda,
  days,
}: {
  agenda: AgendaItem[];
  days: DaySchedule[];
}) {
  const isMultiDay = days && days.length > 0;
  const [activeDay, setActiveDay] = useState(isMultiDay ? days[0].day : 0);

  if (!isMultiDay) {
    return (
      <div>
        <h2 className="text-lg md:text-xl font-bold uppercase tracking-[0.2em] text-[#e8631a] mb-8 flex items-center gap-4">
          <span className="w-8 h-px bg-[#e8631a]" /> Summit Agenda
        </h2>
        <div className="max-h-[500px] overflow-y-auto no-scrollbar relative px-2">
          <AgendaList items={agenda} />
        </div>
      </div>
    );
  }

  const activeDayData = days.find(d => d.day === activeDay) ?? days[0];

  return (
    <div>
      <h2 className="text-lg md:text-xl font-bold uppercase tracking-[0.2em] text-[#e8631a] mb-6 flex items-center gap-4">
        <span className="w-8 h-px bg-[#e8631a]" /> Summit Agenda
      </h2>

      {/* Day tabs */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {days.map(d => (
          <button
            key={d.day}
            onClick={() => setActiveDay(d.day)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
              activeDay === d.day
                ? 'bg-[#0E1B3D] text-white border-[#0E1B3D] shadow-lg'
                : 'bg-white text-[#0E1B3D]/60 border-[#0E1B3D]/10 hover:border-[#e8631a] hover:text-[#e8631a]'
            }`}
          >
            {d.label ?? `Day ${d.day}`}
          </button>
        ))}
      </div>

      <div className="max-h-[500px] overflow-y-auto no-scrollbar relative px-2">
        <AgendaList items={activeDayData.agenda} />
      </div>
    </div>
  );
}
