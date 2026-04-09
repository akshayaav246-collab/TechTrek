'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getRecommendation } from '@/utils/recommendation';

type AgendaItem = { time: string; title: string; duration: string; speaker?: string; topics?: string[] };
type DaySchedule = { day: number; label?: string; date?: string; agenda: AgendaItem[] };



export function DaySelectionModal({
  days,
  eventName,
  perDayAmount,
  discipline,
  onClose,
  onConfirm,
  loading,
}: {
  days: DaySchedule[];
  eventName: string;
  perDayAmount: number;
  discipline?: string;
  onClose: () => void;
  onConfirm: (selectedDays: number[]) => void;
  loading: boolean;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [expandedDay, setExpandedDay] = useState<number | null>(days[0]?.day ?? null);

  const toggle = (dayNum: number) => {
    setSelected(prev => {
      const isNowSelected = !prev.includes(dayNum);
      if (isNowSelected) setExpandedDay(dayNum);
      return isNowSelected ? [...prev, dayNum] : prev.filter(d => d !== dayNum);
    });
  };

  const totalCost = selected.length * perDayAmount;
  const refundIfCancelled = selected.length * (perDayAmount - 100); // ₹400/day

  const [aiRec, setAiRec] = useState<{recommendedDay: string, reason: string} | null>(null);

  useEffect(() => {
    if (!discipline) return;
    const agendaText = days.map(d => `Day ${d.day}:\n${d.agenda.map(a => `- ${a.title} (${a.duration})`).join('\n')}`).join('\n\n');
    let isCancelled = false;

    getRecommendation(discipline, "Student", agendaText)
      .then(res => {
        if (!isCancelled) setAiRec(res);
      })
      .catch(err => console.error("AI recommendation failed", err));

    return () => { isCancelled = true; };
  }, [days, discipline]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start pt-[100px] justify-center p-4">
      <div className="w-full max-w-2xl max-h-[calc(100vh-120px)] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#0E1B3D] to-[#1a2d5c] px-6 py-5 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[#e8631a] text-xs font-bold uppercase tracking-widest mb-1">Multi-Day Summit</p>
              <h2 className="text-white font-bold text-xl leading-tight">{eventName}</h2>
              <p className="text-white/50 text-sm mt-1">Select the days you want to attend · ₹{perDayAmount}/day</p>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors shrink-0 mt-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {aiRec ? (
            <div className="mt-4 flex items-start gap-3 bg-[#e8631a]/10 border border-[#e8631a]/30 rounded-xl px-4 py-3">
              <div className="text-xl mt-0.5">✨</div>
              <div>
                <span className="text-[#e8631a] text-sm font-bold block mb-1">AI Recommendation for {discipline} — {aiRec.recommendedDay}</span>
                <span className="text-white/85 text-xs leading-relaxed inline-block">{aiRec.reason}</span>
              </div>
            </div>
          ) : discipline ? (
            <div className="mt-4 flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
               <svg className="animate-spin h-5 w-5 text-[#e8631a]" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               <span className="text-white/60 text-xs">AI analyzing agenda to find the best day for you...</span>
            </div>
          ) : null}
        </div>

        {/* Day list — scrollable */}
        <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
          {days.map(dayData => {
            const isSelected = selected.includes(dayData.day);
            const isExpanded = expandedDay === dayData.day;

            return (
              <div key={dayData.day} className={`transition-colors ${isSelected ? 'bg-[#e8631a]/5' : 'bg-white'}`}>
                {/* Day card header */}
                <div className="flex items-center gap-3 px-5 py-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggle(dayData.day)}
                    className={`shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-[#e8631a] border-[#e8631a]'
                        : 'border-gray-300 hover:border-[#e8631a]'
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                    )}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0" onClick={() => toggle(dayData.day)} style={{ cursor: 'pointer' }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#0E1B3D] text-sm">
                        {dayData.label ?? `Day ${dayData.day}`}
                      </span>
                      {dayData.date && (
                        <span className="text-xs text-gray-400 font-medium">
                          {new Date(dayData.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{dayData.agenda.length} sessions · ₹{perDayAmount}</p>
                  </div>

                  {/* Expand toggle */}
                  <button
                    onClick={() => setExpandedDay(isExpanded ? null : dayData.day)}
                    className="shrink-0 w-8 h-8 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#0E1B3D] hover:border-[#0E1B3D] transition-all"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </button>
                </div>

                {/* Expanded sessions with smooth accordion animation */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      key={`expanded-${dayData.day}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 space-y-2 border-t border-gray-100 pt-3">
                        {dayData.agenda.length === 0 ? (
                          <p className="text-sm text-gray-400 italic">No sessions scheduled yet.</p>
                        ) : dayData.agenda.map((item, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-xl border transition-colors bg-gray-50 border-gray-100">
                            <div className="shrink-0 mt-0.5">
                              <div className="w-4 h-4 rounded-full bg-[#0E1B3D]/10 mt-0.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold leading-snug text-[#0E1B3D]">
                                {item.title}
                              </p>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className="text-[11px] text-[#e8631a] font-bold">{item.time}</span>
                                <span className="text-[11px] text-gray-400">{item.duration}</span>
                                {item.speaker && (
                                  <span className="text-[11px] text-gray-500">by {item.speaker}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Footer — cost summary + confirm */}
        <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-6 py-5">
          {selected.length === 0 ? (
            <p className="text-center text-gray-400 text-sm mb-4 font-medium">Select at least one day to continue</p>
          ) : (
            <div className="flex flex-wrap gap-4 justify-between items-start mb-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">
                  Selected: {selected.sort((a,b)=>a-b).map(d => {
                    const day = days.find(x => x.day === d);
                    return day?.label ?? `Day ${d}`;
                  }).join(', ')}
                </p>
                <p className="text-2xl font-extrabold text-[#0E1B3D]">
                  ₹{totalCost}
                  <span className="text-sm font-medium text-gray-400 ml-2">
                    ({selected.length} day{selected.length > 1 ? 's' : ''} × ₹{perDayAmount})
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-gray-400 font-medium">If cancelled before event day</p>
                <p className="text-sm font-bold text-emerald-600">Refund: ₹{refundIfCancelled}</p>
                <p className="text-[10px] text-gray-400">(₹{perDayAmount - 100}/day × {selected.length})</p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(selected)}
              disabled={selected.length === 0 || loading}
              className="flex-1 py-3 rounded-xl bg-[#e8631a] hover:bg-[#d4741a] text-white font-bold text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Registering…
                </>
              ) : (
                <>
                  Confirm & Register
                  {selected.length > 0 && <span className="bg-white/20 rounded-lg px-2 py-0.5 text-xs">₹{totalCost}</span>}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
