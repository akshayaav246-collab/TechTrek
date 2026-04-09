"use client";
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import dynamic from 'next/dynamic';
import type { HallLayoutData } from '@/components/VenueMap';

const VenueMap = dynamic(() => import('@/components/VenueMap'), { ssr: false });

type Step = 1 | 2 | 3 | 4 | 5;
type LayoutFormState = Omit<HallLayoutData, 'total_rows' | 'seats_per_row'> & { total_rows: number | ''; seats_per_row: number | '' };
type SpeakerForm = { title: string; name: string; role: string; company: string; linkedIn: string; bio: string };
type AgendaItemForm = { time: string; title: string; duration: string; speaker: string };
type DayAgendaForm = { day: number; label: string; agenda: AgendaItemForm[] };
type TimeOption = { value: string; label: string; duration: string };
const STEPS = ['Basic Info', 'Speakers', 'Schedule', 'Hall Layout', 'Review'];

const defaultLayout: LayoutFormState = {
  hall_name: '', total_rows: '', seats_per_row: '',
  aisle_after_seat: [], reserved_rows: [],
  stage_position: 'front', entry_points: 'both',
};

const defaultForm = {
  name: '', collegeName: '', collegeDomain: '', city: '', venue: '',
  dateTime: '', endDateTime: '', capacity: '', description: '', topics: '', amount: '500',
  speakers: [{ title: '', name: '', role: '', company: '', linkedIn: '', bio: '' }] as SpeakerForm[],
  agenda: [{ time: '', title: '', duration: '', speaker: '' }] as AgendaItemForm[],
  // Multi-day: array of days, each with their own agenda
  days: [] as DayAgendaForm[],
};

const formFieldClassName = "w-full bg-[#FAF7F2] text-[#1C1A17] border border-[#E2D8CC] placeholder-[#B3A79A] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#C84B11] transition-colors";
const compactFormFieldClassName = "bg-[#FAF7F2] text-[#1C1A17] border border-[#E2D8CC] placeholder-[#B3A79A] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#C84B11] transition-colors";
const fieldLabelClassName = "block text-[11px] font-bold uppercase tracking-[0.18em] text-[#6F665C] mb-2";

function parseLocalDateTime(value: string) {
  if (!value) return null;
  const [datePart, timePart] = value.split('T');
  if (!datePart || !timePart) return null;

  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  if ([year, month, day, hour, minute].some(Number.isNaN)) return null;

  return new Date(year, month - 1, day, hour, minute);
}

function isSameCalendarDay(start: Date | null, end: Date | null) {
  if (!start || !end) return false;
  return (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()
  );
}

function formatTimeLabel(date: Date) {
  return date.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function buildTimeOptions(startValue: string, endValue: string) {
  const start = parseLocalDateTime(startValue);
  if (!start) return [] as TimeOption[];

  const rawEnd = parseLocalDateTime(endValue);
  const singleDayEnd = rawEnd && isSameCalendarDay(start, rawEnd) && rawEnd > start
    ? rawEnd
    : new Date(start.getTime() + 8 * 60 * 60 * 1000);

  const options: TimeOption[] = [];
  let current = new Date(start);

  while (current <= singleDayEnd) {
    const next = new Date(Math.min(current.getTime() + 15 * 60 * 1000, singleDayEnd.getTime()));
    const durationMinutes = Math.max(15, Math.round((next.getTime() - current.getTime()) / 60000));
    options.push({
      value: formatTimeLabel(current),
      label: formatTimeLabel(current),
      duration: `${durationMinutes} mins`,
    });
    current = new Date(current.getTime() + 15 * 60 * 1000);
  }

  return options;
}

function splitTimeRange(value: string) {
  const parts = value.split(' - ').map(part => part.trim());
  if (parts.length === 2) {
    return { start: parts[0], end: parts[1] };
  }
  return { start: value, end: '' };
}

function getDurationFromRange(start: string, end: string, options: TimeOption[]) {
  const startIndex = options.findIndex(option => option.value === start);
  const endIndex = options.findIndex(option => option.value === end);
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) return '';
  return `${(endIndex - startIndex) * 15} mins`;
}

// Defined OUTSIDE the page component to prevent remount on every keystroke
function FormInput({ label, type = 'text', placeholder = '', value, onChange, required = false }: {
  label: string; type?: string; placeholder?: string; value: string; onChange: (v: string) => void; required?: boolean;
}) {
  return (
    <div>
      <label className="text-[11px] font-bold uppercase tracking-widest text-[#0E1B3D]/70 ml-1 mb-1.5 block">{label}</label>
      <input type={type} placeholder={placeholder} value={value} required={required}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-[#FAF7F2] text-[#1C1A17] border border-[#E2D8CC] placeholder-[#B3A79A] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#C84B11] transition-colors" />
    </div>
  );
}

function ComboboxInput({ label, placeholder = '', value, options, onChange, required = false }: {
  label: string; placeholder?: string; value: string; options: string[]; onChange: (v: string) => void; required?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(value.toLowerCase()) && opt !== value);

  return (
    <div className="relative" ref={containerRef}>
      <label className="text-[11px] font-bold uppercase tracking-widest text-[#0E1B3D]/70 ml-1 mb-1.5 block">{label}</label>
      <input type="text" placeholder={placeholder} value={value} required={required}
        onChange={e => { onChange(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        className="w-full bg-[#FAF7F2] text-[#1C1A17] border border-[#E2D8CC] placeholder-[#B3A79A] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#C84B11] transition-colors" />
      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-xl bg-white border border-[#E2D8CC] shadow-xl py-1">
          {filteredOptions.map((option, idx) => (
            <li key={idx} onClick={() => { onChange(option); setIsOpen(false); }}
              className="cursor-pointer px-4 py-2 text-sm text-[#1C1A17] hover:bg-[#F2EBE0] hover:text-[#C84B11] font-semibold transition-colors">
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CreateEventPage() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState(defaultForm);
  const [layout, setLayout] = useState<LayoutFormState>(defaultLayout);
  const [aisleInput, setAisleInput] = useState('');
  const [reservedInput, setReservedInput] = useState('');
  const [saveHall, setSaveHall] = useState(true);
  const [savedHalls, setSavedHalls] = useState<(HallLayoutData & { _id: string })[]>([]);
  const [selectedHallId, setSelectedHallId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [locations, setLocations] = useState<{city: string, collegeName: string, collegeDomain: string}[]>([]);
  const [apiColleges, setApiColleges] = useState<string[]>([]);
  const [linkedInStatus, setLinkedInStatus] = useState<Record<number, 'idle' | 'fetching' | 'success' | 'failed'>>({});

  const predefinedCities = [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Tiruppur', 'Vellore', 'Erode',
    'Thoothukudi', 'Thanjavur', 'Dindigul', 'Ranipet', 'Sivakasi', 'Kumbakonam', 'Nagercoil', 'Kanchipuram',
    'Cuddalore', 'Hosur', 'Villupuram', 'Karur', 'Udhagamandalam (Ooty)', 'Nagapattinam', 'Pudukkottai',
    'Ramanathapuram', 'Krishnagiri', 'Namakkal', 'Ariyalur', 'Perambalur', 'Thiruvallur', 'Virudhunagar',
    'Sivaganga', 'Tiruvannamalai', 'Dharmapuri', 'Theni', 'Kallakurichi', 'Tenkasi', 'Chengalpattu',
    'Mayiladuthurai', 'Tirupattur', 'Palani', 'Pollachi', 'Karaikudi', 'Ambattur', 'Avadi', 'Tambaram',
    'Tiruvottiyur', 'Mettur', 'Bhavani', 'Gobichettipalayam', 'Vaniyambadi', 'Arakkonam', 'Gudiyatham', 'Ambur',
    'Tiruttani', 'Ponneri', 'Tirunelveli (Town)', 'Manamadurai', 'Paramakudi', 'Rameswaram', 'Kodaikanal',
    'Vatlugundu', 'Srivilliputhur', 'Sattur', 'Kovilpatti', 'Tiruchendur', 'Sankarankovil', 'Tenkasi (Town)',
    'Courtallam', 'Nanjilnad / Marthandam', 'Padmanabhapuram', 'Colachel', 'Papanasam', 'Mannargudi', 'Tiruvarur',
    'Needamangalam', 'Sirkazhi', 'Velankanni', 'Chidambaram', 'Panruti', 'Virudhachalam', 'Tindivanam', 'Gingee',
    'Vandavasi', 'Cheyyar', 'Maduranthagam', 'Maraimalai Nagar', 'Poonamallee', 'Sriperumbudur', 'Uthiramerur',
    'Periyakulam', 'Bodinayakanur', 'Oddanchatram', 'Musiri', 'Lalgudi', 'Aruppukkottai', 'Rasipuram',
    'Tiruchengode', 'Sankari', 'Yercaud'
  ];

  useEffect(() => {
    if (!form.city) {
      setApiColleges([]);
      return;
    }
    fetch(`http://universities.hipolabs.com/search?country=india&name=${encodeURIComponent(form.city)}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setApiColleges(data.map((u: any) => u.name));
        }
      })
      .catch(() => setApiColleges([]));
  }, [form.city]);

  useEffect(() => {
    fetch('http://localhost:5000/api/events')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLocations(data.map(e => ({ city: e.city || '', collegeName: e.collegeName || '', collegeDomain: e.collegeDomain || '' })));
        } else if (data.events && Array.isArray(data.events)) {
           setLocations(data.events.map((e: any) => ({ city: e.city || '', collegeName: e.collegeName || '', collegeDomain: e.collegeDomain || '' })));
        }
      })
      .catch(() => {});
  }, []);



  useEffect(() => {
    if (step === 4 && token) {
      fetch('http://localhost:5000/api/halls', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(setSavedHalls).catch(() => {});
    }
  }, [step, token]);

  if (isLoading) {
    return null;
  }

  if (!user || (user.role !== 'admin' && user.role !== 'superAdmin')) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Access Denied</div>;
  }

  const set = (field: string, val: string) => setForm(p => ({ ...p, [field]: val }));
  const setL = (field: keyof LayoutFormState, val: unknown) => setLayout(p => ({ ...p, [field]: val }));
  const filledSpeakers = form.speakers.filter(s => s.name.trim());
  const speakerNames = filledSpeakers.map(s => s.name.trim());
  const topicsList = form.topics.split(',').map(topic => topic.trim()).filter(Boolean);

  const replaceSpeakerReferences = (source: typeof defaultForm, oldName: string, newName: string) => {
    const normalize = (value: string) => value.trim();
    const from = normalize(oldName);
    const to = normalize(newName);
    if (!from || from === to) return source;

    return {
      ...source,
      agenda: source.agenda.map(item => item.speaker.trim() === from ? { ...item, speaker: to } : item),
      days: source.days.map(day => ({
        ...day,
        agenda: day.agenda.map(item => item.speaker.trim() === from ? { ...item, speaker: to } : item),
      })),
    };
  };

  const clearSpeakerReferences = (source: typeof defaultForm, removedName: string) => {
    const target = removedName.trim();
    if (!target) return source;

    return {
      ...source,
      agenda: source.agenda.map(item => item.speaker.trim() === target ? { ...item, speaker: '' } : item),
      days: source.days.map(day => ({
        ...day,
        agenda: day.agenda.map(item => item.speaker.trim() === target ? { ...item, speaker: '' } : item),
      })),
    };
  };

  const setSpeaker = (i: number, key: string, val: string) => {
    setForm(prev => {
      const oldName = key === 'name' ? prev.speakers[i]?.name || '' : '';
      const updatedSpeakers = [...prev.speakers];
      updatedSpeakers[i] = { ...updatedSpeakers[i], [key]: val };
      const nextForm = { ...prev, speakers: updatedSpeakers };
      return key === 'name' ? replaceSpeakerReferences(nextForm, oldName, val) : nextForm;
    });
  };

  const fetchLinkedInData = async (i: number, url: string) => {
    const LINKEDIN_RE = /^https?:\/\/(?:www\.|[a-z]{2,3}\.)?linkedin\.com\/in\/[\w\-.]+(?:\/.*)?$/;
    if (!url || !LINKEDIN_RE.test(url)) return;
    setLinkedInStatus(prev => ({ ...prev, [i]: 'fetching' }));
    try {
      const res = await fetch('http://localhost:5000/api/speakers/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ linkedinUrl: url }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const { name, role, organization, short_bio } = json.data;
        setForm(prev => {
          const speakers = [...prev.speakers];
          const sp = { ...speakers[i] };
          if (name) sp.name = name;
          if (role) sp.role = role;
          if (organization) sp.company = organization;
          if (short_bio) sp.bio = short_bio;
          speakers[i] = sp;
          return { ...prev, speakers };
        });
        setLinkedInStatus(prev => ({ ...prev, [i]: 'success' }));
      } else {
        setLinkedInStatus(prev => ({ ...prev, [i]: 'failed' }));
      }
    } catch {
      setLinkedInStatus(prev => ({ ...prev, [i]: 'failed' }));
    }
  };
  const setAgenda = (i: number, key: string, val: string) => {
    setForm(prev => {
      const agenda = [...prev.agenda];
      agenda[i] = { ...agenda[i], [key]: val };
      return { ...prev, agenda };
    });
  };
  const addSpeaker = () => setForm(p => ({ ...p, speakers: [...p.speakers, { title: '', name: '', role: '', company: '', linkedIn: '', bio: '' }] }));
  const addAgenda = () => setForm(p => ({ ...p, agenda: [...p.agenda, { time: '', title: '', duration: '', speaker: '' }] }));
  const removeSpeaker = (i: number) => setForm(prev => {
    const removedName = prev.speakers[i]?.name || '';
    const nextForm = { ...prev, speakers: prev.speakers.filter((_, idx) => idx !== i) };
    return clearSpeakerReferences(nextForm, removedName);
  });
  const removeAgenda = (i: number) => setForm(p => ({ ...p, agenda: p.agenda.filter((_, idx) => idx !== i) }));
  const setAgendaSpeaker = (i: number, speakerName: string) => setForm(prev => {
    const agenda = [...prev.agenda];
    agenda[i] = { ...agenda[i], speaker: speakerName };
    return { ...prev, agenda };
  });

  // Multi-day helpers
  const startDate = parseLocalDateTime(form.dateTime);
  const endDate = parseLocalDateTime(form.endDateTime);
  const isMultiDay = !!startDate && !!endDate && !isSameCalendarDay(startDate, endDate) && endDate > startDate;
  const agendaTimeOptions = buildTimeOptions(form.dateTime, form.endDateTime);
  const agendaTimeStartOptions = agendaTimeOptions.length > 1 ? agendaTimeOptions.slice(0, -1) : agendaTimeOptions;
  const addDay = () => setForm(p => ({
    ...p,
    days: [...p.days, { day: p.days.length + 1, label: `Day ${p.days.length + 1}`, agenda: [{ time: '', title: '', duration: '', speaker: '' }] }],
  }));
  const removeDay = (dayIdx: number) => setForm(p => ({ ...p, days: p.days.filter((_, i) => i !== dayIdx).map((d, i) => ({ ...d, day: i + 1 })) }));
  const setDayAgenda = (dayIdx: number, agendaIdx: number, key: string, val: string) => {
    setForm(p => {
      const nd = [...p.days];
      const na = [...nd[dayIdx].agenda];
      na[agendaIdx] = { ...na[agendaIdx], [key]: val };
      nd[dayIdx] = { ...nd[dayIdx], agenda: na };
      return { ...p, days: nd };
    });
  };
  const addDayAgenda = (dayIdx: number) => setForm(p => {
    const nd = [...p.days];
    nd[dayIdx] = { ...nd[dayIdx], agenda: [...nd[dayIdx].agenda, { time: '', title: '', duration: '', speaker: '' }] };
    return { ...p, days: nd };
  });
  const removeDayAgenda = (dayIdx: number, agendaIdx: number) => setForm(p => {
    const nd = [...p.days];
    nd[dayIdx] = { ...nd[dayIdx], agenda: nd[dayIdx].agenda.filter((_, i) => i !== agendaIdx) };
    return { ...p, days: nd };
  });
  const setDayAgendaSpeaker = (dayIdx: number, agendaIdx: number, speakerName: string) => setForm(prev => {
    const days = [...prev.days];
    const agenda = [...days[dayIdx].agenda];
    agenda[agendaIdx] = { ...agenda[agendaIdx], speaker: speakerName };
    days[dayIdx] = { ...days[dayIdx], agenda };
    return { ...prev, days };
  });
  const setAgendaRange = (i: number, part: 'start' | 'end', value: string) => {
    setForm(prev => {
      const agenda = [...prev.agenda];
      const current = agenda[i];
      const range = splitTimeRange(current.time);
      const nextRange = { ...range, [part]: value };
      const duration = getDurationFromRange(nextRange.start, nextRange.end, agendaTimeOptions);
      agenda[i] = {
        ...current,
        time: nextRange.start && nextRange.end ? `${nextRange.start} - ${nextRange.end}` : nextRange.start || nextRange.end,
        duration,
      };
      return { ...prev, agenda };
    });
  };
  const setDayAgendaRange = (dayIdx: number, agendaIdx: number, part: 'start' | 'end', value: string) => {
    setForm(prev => {
      const days = [...prev.days];
      const agenda = [...days[dayIdx].agenda];
      const current = agenda[agendaIdx];
      const range = splitTimeRange(current.time);
      const nextRange = { ...range, [part]: value };
      const duration = getDurationFromRange(nextRange.start, nextRange.end, agendaTimeOptions);
      agenda[agendaIdx] = {
        ...current,
        time: nextRange.start && nextRange.end ? `${nextRange.start} - ${nextRange.end}` : nextRange.start || nextRange.end,
        duration,
      };
      days[dayIdx] = { ...days[dayIdx], agenda };
      return { ...prev, days };
    });
  };
  const persistSpeakers = async () => {
    if (!token) return true;
    const speakersToSave = form.speakers.filter(speaker => speaker.name.trim());
    if (!speakersToSave.length) return true;

    try {
      const responses = await Promise.all(
        speakersToSave.map(speaker =>
          fetch('http://localhost:5000/api/speakers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(speaker),
          })
        )
      );
      if (responses.some(response => !response.ok)) {
        setError('Failed to save one or more speakers to the speaker library.');
        return false;
      }
      return true;
    } catch {
      setError('Failed to save speakers to the speaker library.');
      return false;
    }
  };

  // Parse comma-separated aisle/reserved inputs into layout
  const applyAisles = (raw: string) => {
    setAisleInput(raw);
    const nums = raw.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0);
    setL('aisle_after_seat', nums);
  };
  const applyReserved = (raw: string) => {
    setReservedInput(raw);
    const rows = raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    setL('reserved_rows', rows);
  };

  const autofillHall = (id: string) => {
    setSelectedHallId(id);
    if (id === '') { setLayout(defaultLayout); setAisleInput(''); setReservedInput(''); return; }
    const hall = savedHalls.find(h => h._id === id);
    if (!hall) return;
    setLayout({ ...hall });
    setAisleInput(hall.aisle_after_seat.join(', '));
    setReservedInput(hall.reserved_rows.join(', '));
  };

  const handleSubmit = async () => {
    setSubmitting(true); setError('');
    try {
      // Optionally save/update hall
      let hallLayoutId: string | null = null;
      if (saveHall && layoutPreviewReady) {
        const method = selectedHallId ? 'PUT' : 'POST';
        const url = selectedHallId
          ? `http://localhost:5000/api/halls/${selectedHallId}`
          : 'http://localhost:5000/api/halls';
        const hr = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(layout),
        });
        const hd = await hr.json();
        if (hr.ok) hallLayoutId = hd._id;
      } else if (selectedHallId) {
        hallLayoutId = selectedHallId;
      }

      const payload = {
        ...form,
        capacity: Number(form.capacity),
        amount: Number(form.amount) || 0,
        topics: form.topics.split(',').map(t => t.trim()).filter(Boolean),
        speakers: form.speakers.filter(s => s.name),
        agenda: isMultiDay ? [] : form.agenda.filter(a => a.title),
        days: isMultiDay ? form.days.map(d => ({
          day: d.day,
          label: d.label,
          agenda: d.agenda.filter(a => a.title),
        })) : [],
        ...(form.endDateTime ? { endDateTime: form.endDateTime } : {}),
        ...(hallLayoutId ? { hallLayoutId } : {}),
      };
      const res = await fetch('http://localhost:5000/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Failed to create event'); return; }
      router.push('/admin');
    } catch { setError('Network error'); }
    finally { setSubmitting(false); }
  };

  const layoutPreviewReady = layout.hall_name && Number(layout.total_rows) > 0 && Number(layout.seats_per_row) > 0;
  const goToStep = (targetStep: Step) => setStep(targetStep);
  const handleNext = async () => {
    setError('');
    if (step === 2) {
      const saved = await persistSpeakers();
      if (!saved) return;
    }
    setStep(s => (s + 1) as Step);
  };

  const titleNode = "Create New Event";

  const combinedCities = Array.from(new Set([
    ...predefinedCities,
    ...locations.map(l => l.city).filter(Boolean)
  ]));

  const combinedColleges = Array.from(new Set([
    ...apiColleges,
    ...locations.filter(l => l.city.toLowerCase() === form.city.toLowerCase() && l.collegeName).map(l => l.collegeName)
  ]));

  return (
    <AdminLayout title={titleNode}>
      <div className="max-w-4xl mx-auto rounded-[32px] bg-[#FAF7F2]">
        {/* Step indicator */}
        <div className="overflow-x-auto pb-2 mb-6">
          <div className="flex min-w-[640px] items-center">
            {STEPS.map((s, i) => {
              const stepNumber = (i + 1) as Step;
              const isCurrent = stepNumber === step;
              const isComplete = stepNumber < step;
              return (
                <div key={s} className="flex items-center flex-1 last:flex-none">
                  <button
                    type="button"
                    onClick={() => goToStep(stepNumber)}
                    className={`flex items-center gap-3 transition-colors ${isCurrent ? 'text-[#C84B11]' : isComplete ? 'text-emerald-700' : 'text-[#8D99AE]'}`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-bold shadow-sm transition-all ${
                        isCurrent
                          ? 'border-[#C84B11] bg-[#C84B11] text-white'
                          : isComplete
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-[#E2D8CC] bg-[#FAF7F2] text-[#8D99AE]'
                      }`}
                    >
                      {isComplete ? '✓' : i + 1}
                    </span>
                    <span className="text-sm font-semibold whitespace-nowrap">{s}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={`mx-4 h-[2px] flex-1 min-w-[28px] ${isComplete ? 'bg-emerald-500' : 'bg-[#E6DDD2]'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

          <div className="bg-white rounded-3xl shadow-sm border border-[#E2D8CC] p-5 sm:p-8">

            {/* Step 1 */}
            {step === 1 && (
                <div className="space-y-4">
                <h2 className="font-bold text-lg text-[#0E1B3D] mb-5">Event Details</h2>
                <FormInput label="Event Name *" value={form.name} onChange={v => set('name', v)} placeholder="TechTrek 2026 " />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ComboboxInput label="City *" value={form.city} onChange={v => set('city', v)} placeholder="Chennai" 
                    options={combinedCities} />
                  <ComboboxInput label="College Name *" value={form.collegeName} onChange={v => {
                    set('collegeName', v);
                    const found = locations.find(l => l.collegeName.toLowerCase() === v.toLowerCase() && l.collegeDomain);
                    if (found) set('collegeDomain', found.collegeDomain);
                  }} placeholder="Select a city first" options={combinedColleges} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput label="College Email Domain *" value={form.collegeDomain} onChange={v => set('collegeDomain', v)} placeholder="ksrce.ac.in" />
                  <FormInput label="Venue *" value={form.venue} onChange={v => set('venue', v)} placeholder="Main Auditorium" />
                </div>
                <div>
                  <label className={fieldLabelClassName}>Description</label>
                  <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4} placeholder="Describe the event…"
                    className="w-full bg-[#FAF7F2] text-[#1C1A17] border border-[#E2D8CC] placeholder-[#B3A79A] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#C84B11] resize-none transition-colors"/>
                </div>
                <FormInput label="Topics (comma separated)" value={form.topics} onChange={v => set('topics', v)} placeholder="AI, ML, IoT, Robotics" />
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-bold text-lg text-[#0E1B3D]">Speakers</h2>
                </div>

                {form.speakers.map((sp, i) => (
                  <div key={i} className="border border-[#E2D8CC] rounded-2xl p-5 mb-4 bg-[#F2EBE0]">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm font-bold text-[#0E1B3D]">Speaker {i + 1}</p>
                      {form.speakers.length > 1 && (
                        <button onClick={() => removeSpeaker(i)} className="text-red-400 text-xs font-bold hover:text-red-600">Remove</button>
                      )}
                    </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                      <div className="flex flex-col">
                        <label className={fieldLabelClassName}>Full Name</label>
                        <div className="flex">
                          <select 
                            value={sp.title || ''} 
                            onChange={e => setSpeaker(i, 'title', e.target.value)}
                            className="bg-[#FAF7F2] text-[#1C1A17] border border-[#E2D8CC] border-r-0 rounded-l-xl px-2 text-sm outline-none focus:border-[#C84B11] focus:ring-1 focus:ring-[#C84B11] focus:z-10 transition-colors w-[80px]"
                          >
                            <option value="">Title</option>
                            <option value="Dr.">Dr.</option>
                            <option value="Mr.">Mr.</option>
                            <option value="Mrs.">Mrs.</option>
                            <option value="Ms.">Ms.</option>
                            <option value="Prof.">Prof.</option>
                          </select>
                          <input 
                            value={sp.name} 
                            onChange={e => setSpeaker(i, 'name', e.target.value)} 
                            placeholder="Full Name" 
                            className="flex-1 bg-[#FAF7F2] text-[#1C1A17] border border-[#E2D8CC] placeholder-[#B3A79A] rounded-r-xl px-4 py-3 text-sm outline-none focus:border-[#C84B11] focus:z-10 focus:ring-1 focus:ring-[#C84B11] transition-colors" 
                          />
                        </div>
                      </div>
                      <div>
                        <label className={fieldLabelClassName}>Title/Role</label>
                        <input value={sp.role} onChange={e => setSpeaker(i, 'role', e.target.value)} placeholder="Title/Role" className={formFieldClassName} />
                      </div>
                      <div>
                        <label className={fieldLabelClassName}>Company</label>
                        <input value={sp.company} onChange={e => setSpeaker(i, 'company', e.target.value)} placeholder="Company" className={formFieldClassName} />
                      </div>
                      <div>
                        <label className={fieldLabelClassName}>LinkedIn Profile</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="url"
                            pattern="^https?:\/\/(?:www\.|[a-z]{2,3}\.)?linkedin\.com\/in\/[\w\-.]+(?:\/.*)?$"
                            value={sp.linkedIn || ''}
                            onChange={e => {
                              setSpeaker(i, 'linkedIn', e.target.value);
                              if (linkedInStatus[i] && linkedInStatus[i] !== 'idle') {
                                setLinkedInStatus(prev => ({ ...prev, [i]: 'idle' }));
                              }
                            }}
                            onInvalid={e => (e.target as HTMLInputElement).setCustomValidity('Must be a valid LinkedIn URL starting with https://www.linkedin.com/in/')}
                            onInput={e => (e.target as HTMLInputElement).setCustomValidity('')}
                            placeholder="https://linkedin.com/in/..."
                            className={`flex-1 ${formFieldClassName} invalid:border-red-400 invalid:text-red-600 focus:invalid:border-red-500`}
                          />
                          <button
                            type="button"
                            onClick={() => fetchLinkedInData(i, sp.linkedIn)}
                            className="flex-shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white p-[11px] rounded-xl transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                            disabled={!sp.linkedIn || linkedInStatus[i] === 'fetching'}
                            title="Fetch LinkedIn Details"
                          >
                            {linkedInStatus[i] === 'fetching' ? (
                              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        </div>
                        {/* Inline status */}
                        {linkedInStatus[i] === 'fetching' && (
                          <p className="flex items-center gap-1.5 text-[#C84B11] text-[10px] mt-1.5 font-semibold">
                            <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                            Fetching details…
                          </p>
                        )}
                        {linkedInStatus[i] === 'success' && (
                          <p className="flex items-center gap-1.5 text-emerald-600 text-[10px] mt-1.5 font-semibold">✓ Details auto-filled from LinkedIn</p>
                        )}
                        {linkedInStatus[i] === 'failed' && (
                          <p className="flex items-center gap-1.5 text-red-500 text-[10px] mt-1.5 font-semibold">⚠ Fetching failed — please fill manually</p>
                        )}
                        {(sp.linkedIn && !/^https?:\/\/(?:www\.|[a-z]{2,3}\.)?linkedin\.com\/in\/[\w\-.]+(?:\/.*)?$/.test(sp.linkedIn)) && (
                          <p className="text-red-500 text-[10px] mt-1 font-semibold">Valid LinkedIn /in/ URL required</p>
                        )}
                      </div>
                      <div className="sm:col-span-2">
                        <label className={fieldLabelClassName}>Short Bio</label>
                        <textarea value={sp.bio} onChange={e => setSpeaker(i, 'bio', e.target.value)} rows={3} placeholder="Short Bio"
                          className="w-full bg-[#FAF7F2] text-[#1C1A17] border border-[#E2D8CC] placeholder-[#B3A79A] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#C84B11] resize-none transition-colors"/>
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={addSpeaker} className="shine-button inline-flex items-center justify-center bg-gradient-to-br from-[#C84B11] to-[#E8622A] px-4 py-2.5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(200,75,17,0.18)] transition-transform hover:-translate-y-0.5">+ Add Speaker</button>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
                <div className="space-y-4">
                <h2 className="font-bold text-lg text-[#0E1B3D] mb-5">Schedule & Capacity</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput label="Start Date & Time *" type="datetime-local" value={form.dateTime} onChange={v => set('dateTime', v)} />
                  <div>
                  <label className={fieldLabelClassName}>End Date & Time </label>
                  <input type="datetime-local" value={form.endDateTime} onChange={e => set('endDateTime', e.target.value)}
                      className={formFieldClassName} />
                  </div>
                </div>
                {form.dateTime && form.endDateTime && isSameCalendarDay(startDate, endDate) && (
                  <p className="text-xs text-[#6F665C]">
                    Matching start and end dates will be treated as a 1-day event. Agenda time slots below use that single-day window.
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput label="Total Capacity *" type="number" value={form.capacity} onChange={v => set('capacity', v)} placeholder="500" />
                  <div>
                    <label className={fieldLabelClassName}>Registration Fee (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₹</span>
                      <input type="number" min={0} value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0 = Free"
                        className="w-full bg-[#FAF7F2] text-[#1C1A17] border border-[#E2D8CC] placeholder-[#B3A79A] rounded-xl pl-8 pr-4 py-3 text-sm outline-none focus:border-[#C84B11] transition-colors" />
                    </div>
                  </div>
                </div>

                {!isMultiDay && (
                  <div className="bg-[#F2EBE0] border border-[#E2D8CC] rounded-2xl p-5 mt-4">
                    <h3 className="font-bold text-[#0E1B3D] mb-4 text-sm">Agenda Items</h3>
                    {form.agenda.map((item, i) => {
                      const timeRange = splitTimeRange(item.time);
                      const startIdx = agendaTimeOptions.findIndex(o => o.value === timeRange.start);
                      const endOptions = startIdx >= 0 ? agendaTimeOptions.slice(startIdx + 1) : agendaTimeOptions;
                      return (
                      <div key={i} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-3">
                        <select value={timeRange.start} onChange={e => setAgendaRange(i, 'start', e.target.value)} className={compactFormFieldClassName}>
                          <option value="">{agendaTimeStartOptions.length ? 'Start Time' : 'Set event time first'}</option>
                          {agendaTimeStartOptions.map(option => (
                            <option key={`start-${option.value}`} value={option.value}>{option.value}</option>
                          ))}
                        </select>
                        <select value={timeRange.end} onChange={e => setAgendaRange(i, 'end', e.target.value)} className={compactFormFieldClassName}>
                          <option value="">{endOptions.length ? 'End Time' : 'Set event time first'}</option>
                          {endOptions.map(option => (
                            <option key={`end-${option.value}`} value={option.value}>{option.value}</option>
                          ))}
                        </select>
                        <input value={item.title} onChange={e => setAgenda(i, 'title', e.target.value)} placeholder="Title" className={compactFormFieldClassName}/>
                        <input value={item.duration} readOnly placeholder="Duration" className={compactFormFieldClassName}/>
                        <select value={item.speaker} onChange={e => setAgendaSpeaker(i, e.target.value)} className={compactFormFieldClassName}>
                          <option value="">Select Speaker</option>
                          {speakerNames.map(name => (
                            <option key={`${name}-${i}`} value={name}>{name}</option>
                          ))}
                        </select>
                        {form.agenda.length > 1 && (
                          <button type="button" onClick={() => removeAgenda(i)} className="text-red-400 text-xs xl:col-start-5 text-right">Remove</button>
                        )}
                      </div>
                    )})}
                    <button type="button" onClick={addAgenda} className="shine-button mt-1 inline-flex items-center justify-center bg-gradient-to-br from-[#C84B11] to-[#E8622A] px-4 py-2 text-xs font-bold text-white shadow-[0_10px_20px_rgba(200,75,17,0.18)] transition-transform hover:-translate-y-0.5">+ Add Agenda Item</button>
                  </div>
                )}

                {isMultiDay && (
                  <div className="space-y-4 mt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-[#0E1B3D] text-sm">Per-Day Agenda</h3>
                      <button type="button" onClick={addDay} className="shine-button inline-flex items-center justify-center bg-gradient-to-br from-[#C84B11] to-[#E8622A] px-4 py-2 text-xs font-bold text-white shadow-[0_10px_20px_rgba(200,75,17,0.18)] transition-transform hover:-translate-y-0.5">+ Add Day</button>
                    </div>
                    {form.days.map((d, dayIdx) => (
                      <div key={dayIdx} className="bg-[#F2EBE0] border border-[#E2D8CC] rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="bg-[#0E1B3D] text-white text-xs font-bold px-3 py-1 rounded-full">Day {d.day}</span>
                            <input value={d.label} onChange={e => setForm(p => { const nd = [...p.days]; nd[dayIdx] = { ...nd[dayIdx], label: e.target.value }; return { ...p, days: nd }; })}
                              placeholder={`Day ${d.day} label`}
                              className="bg-[#FAF7F2] text-[#1C1A17] border border-[#E2D8CC] placeholder-[#B3A79A] rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#C84B11] transition-colors" />
                          </div>
                          {form.days.length > 1 && (
                            <button type="button" onClick={() => removeDay(dayIdx)} className="text-red-400 text-xs font-bold">Remove Day</button>
                          )}
                        </div>
                        {d.agenda.map((item, ai) => {
                          const timeRange = splitTimeRange(item.time);
                          const startIdx = agendaTimeOptions.findIndex(o => o.value === timeRange.start);
                          const endOptions = startIdx >= 0 ? agendaTimeOptions.slice(startIdx + 1) : agendaTimeOptions;
                          return (
                          <div key={ai} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-3">
                            <select value={timeRange.start} onChange={e => setDayAgendaRange(dayIdx, ai, 'start', e.target.value)} className={compactFormFieldClassName}>
                              <option value="">{agendaTimeStartOptions.length ? 'Start Time' : 'Set event time first'}</option>
                              {agendaTimeStartOptions.map(option => (
                                <option key={`${d.day}-start-${option.value}`} value={option.value}>{option.value}</option>
                              ))}
                            </select>
                            <select value={timeRange.end} onChange={e => setDayAgendaRange(dayIdx, ai, 'end', e.target.value)} className={compactFormFieldClassName}>
                              <option value="">{endOptions.length ? 'End Time' : 'Set event time first'}</option>
                              {endOptions.map(option => (
                                <option key={`${d.day}-end-${option.value}`} value={option.value}>{option.value}</option>
                              ))}
                            </select>
                            <input value={item.title} onChange={e => setDayAgenda(dayIdx, ai, 'title', e.target.value)} placeholder="Title" className={compactFormFieldClassName}/>
                            <input value={item.duration} readOnly placeholder="Duration" className={compactFormFieldClassName}/>
                            <select value={item.speaker} onChange={e => setDayAgendaSpeaker(dayIdx, ai, e.target.value)} className={compactFormFieldClassName}>
                              <option value="">Select Speaker</option>
                              {speakerNames.map(name => (
                                <option key={`${name}-${dayIdx}-${ai}`} value={name}>{name}</option>
                              ))}
                            </select>
                            {d.agenda.length > 1 && (
                              <button type="button" onClick={() => removeDayAgenda(dayIdx, ai)} className="text-red-400 text-xs xl:col-start-5 text-right">Remove</button>
                            )}
                          </div>
                        )})}
                        <button type="button" onClick={() => addDayAgenda(dayIdx)} className="shine-button inline-flex items-center justify-center bg-gradient-to-br from-[#C84B11] to-[#E8622A] px-4 py-2 text-xs font-bold text-white shadow-[0_10px_20px_rgba(200,75,17,0.18)] transition-transform hover:-translate-y-0.5">+ Add Item to Day {d.day}</button>
                      </div>
                    ))}
                    {form.days.length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">Click &quot;+ Add Day&quot; to add agenda days</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 4 – Hall Layout */}
            {step === 4 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg text-[#0E1B3D]">Hall Layout</h2>
                </div>

                {/* Autofill from saved halls */}
                {savedHalls.length > 0 && (
                  <div className="bg-[#F2EBE0] border border-[#E2D8CC] rounded-2xl p-4">
                    <label className={fieldLabelClassName}>Select Hall</label>
                    <select value={selectedHallId} onChange={e => autofillHall(e.target.value)}
                      className="w-full bg-[#FAF7F2] text-[#1C1A17] border border-[#E2D8CC] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#C84B11]">
                      <option value="">— Create new layout —</option>
                      {savedHalls.filter(h => h.collegeName === form.collegeName).map(h => (
                        <option key={h._id} value={h._id}>{h.hall_name} ({h.total_rows} rows × {h.seats_per_row} seats)</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Hall config grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={fieldLabelClassName}>Hall Name</label>
                    <input value={layout.hall_name} onChange={e => setL('hall_name', e.target.value)} placeholder="Main Auditorium"
                      className="w-full bg-[#FAF7F2] text-[#1C1A17] border border-[#E2D8CC] placeholder-[#B3A79A] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#C84B11] transition-colors"/>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={fieldLabelClassName}>Total Rows</label>
                      <input type="number" min={1} max={52} value={layout.total_rows || ''}
                        onChange={e => setL('total_rows', e.target.value === '' ? '' : Math.max(1, Math.min(52, Number(e.target.value))))}
                        className="w-full bg-[#FAF7F2] text-[#1C1A17] border border-[#E2D8CC] placeholder-[#B3A79A] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#C84B11] transition-colors"/>
                    </div>
                    <div>
                      <label className={fieldLabelClassName}>Seats / Row</label>
                      <input type="number" min={1} value={layout.seats_per_row || ''}
                        onChange={e => setL('seats_per_row', e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
                        className="w-full bg-[#FAF7F2] text-[#1C1A17] border border-[#E2D8CC] placeholder-[#B3A79A] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#C84B11] transition-colors"/>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={fieldLabelClassName}>Aisle After Seat (comma separated)</label>
                    <input value={aisleInput} onChange={e => applyAisles(e.target.value)} placeholder="e.g. 10, 20"
                      className="w-full bg-[#FAF7F2] text-[#1C1A17] border border-[#E2D8CC] placeholder-[#B3A79A] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#C84B11] transition-colors"/>
                    <p className="text-[10px] text-gray-400 mt-1">Inserts an aisle gap after these seat positions</p>
                  </div>
                  <div>
                    <label className={fieldLabelClassName}>VIP / Reserved Rows (comma separated)</label>
                    <input value={reservedInput} onChange={e => applyReserved(e.target.value)} placeholder="e.g. A, B"
                      className="w-full bg-[#FAF7F2] text-[#1C1A17] border border-[#E2D8CC] placeholder-[#B3A79A] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#C84B11] transition-colors"/>
                    <p className="text-[10px] text-gray-400 mt-1">These rows will be highlighted as VIP</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={fieldLabelClassName}>Stage Position</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(['front', 'back'] as const).map(pos => (
                        <button key={pos} type="button" onClick={() => setL('stage_position', pos)}
                          className={`shine-button flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${layout.stage_position === pos ? 'bg-gradient-to-br from-[#C84B11] to-[#E8622A] text-white border-[#C84B11] shadow-[0_12px_24px_rgba(200,75,17,0.18)]' : 'bg-[#FAF7F2] border-[#E2D8CC] text-gray-600 hover:border-[#C84B11]'}`}>
                          {pos === 'front' ? 'Front Stage' : 'Back Stage'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={fieldLabelClassName}>Entry / Exit Points</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['left', 'right', 'both'] as const).map(ep => (
                        <button key={ep} type="button" onClick={() => setL('entry_points', ep)}
                          className={`shine-button flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all capitalize ${layout.entry_points === ep ? 'bg-gradient-to-br from-[#C84B11] to-[#E8622A] text-white border-[#C84B11] shadow-[0_12px_24px_rgba(200,75,17,0.18)]' : 'border-[#E2D8CC] bg-[#FAF7F2] text-gray-500 hover:border-[#0E1B3D]'}`}>
                          {ep}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Save hall toggle */}
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div onClick={() => setSaveHall(p => !p)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${saveHall ? 'bg-[#C84B11]' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${saveHall ? 'left-5' : 'left-0.5'}`}/>
                  </div>
                  <span className="text-sm text-gray-600 font-medium">Save this hall layout for future events</span>
                </label>

                {/* Live preview */}
                {layoutPreviewReady && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Live Preview</p>
                    <VenueMap layout={layout as HallLayoutData} compact={true} />
                  </div>
                )}
              </div>
            )}

            {/* Step 5 – Review */}
            {step === 5 && (
              <div>
                <h2 className="font-bold text-lg text-[#0E1B3D] mb-5">Review & Publish</h2>
                <div className="space-y-5 mb-6">
                  <div className="border border-[#E2D8CC] rounded-2xl p-5 bg-[#F2EBE0]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-[#0E1B3D] text-base">Basic Info</h3>
                      <button type="button" onClick={() => setStep(1)} className="text-[#C84B11] text-sm font-bold hover:underline">Edit</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div><span className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Event Name</span><span className="text-[#0E1B3D] font-medium">{form.name || '—'}</span></div>
                      <div><span className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">College Name</span><span className="text-[#0E1B3D] font-medium">{form.collegeName || '—'}</span></div>
                      <div><span className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">College Domain</span><span className="text-[#0E1B3D] font-medium">{form.collegeDomain || '—'}</span></div>
                      <div><span className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">City</span><span className="text-[#0E1B3D] font-medium">{form.city || '—'}</span></div>
                      <div><span className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Venue</span><span className="text-[#0E1B3D] font-medium">{form.venue || '—'}</span></div>
                    </div>
                    <div className="mt-4">
                      <span className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Description</span>
                      <p className="text-sm text-[#0E1B3D] font-medium whitespace-pre-wrap">{form.description || '—'}</p>
                    </div>
                    <div className="mt-4">
                      <span className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Topics</span>
                      {topicsList.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {topicsList.map(topic => (
                            <span key={topic} className="px-3 py-1 rounded-full bg-[#FAF7F2] border border-[#E2D8CC] text-sm text-[#0E1B3D] font-medium">{topic}</span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[#0E1B3D] font-medium">—</p>
                      )}
                    </div>
                  </div>

                  <div className="border border-[#E2D8CC] rounded-2xl p-5 bg-[#F2EBE0]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-[#0E1B3D] text-base">Speakers</h3>
                      <button type="button" onClick={() => setStep(2)} className="text-[#C84B11] text-sm font-bold hover:underline">Edit</button>
                    </div>
                    {filledSpeakers.length > 0 ? (
                      <div className="space-y-3">
                        {filledSpeakers.map((speaker, idx) => (
                          <div key={`${speaker.name}-${idx}`} className="rounded-xl border border-[#E2D8CC] bg-[#FAF7F2] p-4">
                            <p className="font-semibold text-[#0E1B3D]">{speaker.name}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              {[speaker.role, speaker.company].filter(Boolean).join(' • ') || 'Role/company not provided'}
                            </p>
                            <p className="text-sm text-[#0E1B3D] mt-2">{speaker.bio || 'No bio added.'}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[#0E1B3D] font-medium">No speakers added.</p>
                    )}
                  </div>

                  <div className="border border-[#E2D8CC] rounded-2xl p-5 bg-[#F2EBE0]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-[#0E1B3D] text-base">Schedule & Agenda</h3>
                      <button type="button" onClick={() => setStep(3)} className="text-[#C84B11] text-sm font-bold hover:underline">Edit</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
                      <div><span className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Start Date & Time</span><span className="text-[#0E1B3D] font-medium">{form.dateTime ? new Date(form.dateTime).toLocaleString() : '—'}</span></div>
                      <div><span className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">End Date & Time</span><span className="text-[#0E1B3D] font-medium">{form.endDateTime ? new Date(form.endDateTime).toLocaleString() : 'Single-day event'}</span></div>
                      <div><span className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Capacity</span><span className="text-[#0E1B3D] font-medium">{form.capacity || '—'}</span></div>
                      <div><span className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Registration Fee</span><span className="text-[#0E1B3D] font-medium">{form.amount ? `₹${form.amount}` : 'Free'}</span></div>
                    </div>

                    {!isMultiDay ? (
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Agenda Items</span>
                        {form.agenda.filter(item => item.title.trim()).length > 0 ? (
                          <div className="space-y-3">
                            {form.agenda.map((item, idx) => {
                              if (!item.title.trim()) return null;
                              return (
                                <div key={`${item.title}-${idx}`} className="rounded-xl border border-[#E2D8CC] bg-[#FAF7F2] p-4">
                                  <p className="font-semibold text-[#0E1B3D]">{item.title}</p>
                                  <p className="text-sm text-gray-500 mt-1">{item.time || 'Time TBD'} • {item.duration || 'Duration TBD'}</p>
                                  <p className="text-sm text-[#0E1B3D] mt-2">Speaker: <span className="font-medium">{item.speaker || 'Not linked'}</span></p>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-[#0E1B3D] font-medium">No agenda items added.</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <span className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Agenda Days</span>
                        {form.days.filter(day => day.agenda.some(item => item.title.trim())).length > 0 ? (
                          <div className="space-y-4">
                            {form.days.map(day => {
                              if (!day.agenda.some(item => item.title.trim())) return null;
                              return (
                                <div key={day.day} className="rounded-xl border border-[#E2D8CC] bg-[#FAF7F2] p-4">
                                  <p className="font-semibold text-[#0E1B3D] mb-3">{day.label || `Day ${day.day}`}</p>
                                  <div className="space-y-3">
                                    {day.agenda.map((item, idx) => {
                                      if (!item.title.trim()) return null;
                                      return (
                                        <div key={`${item.title}-${idx}`} className="border-t border-[#E2D8CC] pt-3 first:border-t-0 first:pt-0">
                                          <p className="font-medium text-[#0E1B3D]">{item.title}</p>
                                          <p className="text-sm text-gray-500 mt-1">{item.time || 'Time TBD'} • {item.duration || 'Duration TBD'}</p>
                                          <p className="text-sm text-[#0E1B3D] mt-1">Speaker: <span className="font-medium">{item.speaker || 'Not linked'}</span></p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-[#0E1B3D] font-medium">No agenda items added.</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="border border-[#E2D8CC] rounded-2xl p-5 bg-[#F2EBE0]">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-[#0E1B3D] text-base">Hall Layout</h3>
                      <button type="button" onClick={() => setStep(4)} className="text-[#C84B11] text-sm font-bold hover:underline">Edit</button>
                    </div>
                    {layoutPreviewReady ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
                          <div><span className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Hall Name</span><span className="text-[#0E1B3D] font-medium">{layout.hall_name}</span></div>
                          <div><span className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Rows × Seats</span><span className="text-[#0E1B3D] font-medium">{layout.total_rows} × {layout.seats_per_row}</span></div>
                          <div><span className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Aisles</span><span className="text-[#0E1B3D] font-medium">{aisleInput || '—'}</span></div>
                          <div><span className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Reserved Rows</span><span className="text-[#0E1B3D] font-medium">{reservedInput || '—'}</span></div>
                          <div><span className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Stage Position</span><span className="text-[#0E1B3D] font-medium">{layout.stage_position === 'front' ? 'Front Stage' : 'Back Stage'}</span></div>
                          <div><span className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Entry / Exit Points</span><span className="text-[#0E1B3D] font-medium capitalize">{layout.entry_points}</span></div>
                        </div>
                        <div className="mb-4">
                          <span className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Save Hall for Future</span>
                          <span className="text-sm text-[#0E1B3D] font-medium">{saveHall ? 'Yes' : 'No'}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-[#0E1B3D] font-medium mb-4">No hall layout configured.</p>
                    )}
                  </div>
                </div>

                {/* Hall preview in review */}
                {layoutPreviewReady && (
                  <div className="mb-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Venue Map Preview</p>
                    <VenueMap layout={layout as HallLayoutData} compact={true} />
                  </div>
                )}

                {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm mb-4">{error}</div>}
              </div>
            )}

            {/* Navigation */}
            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[#E2D8CC] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button onClick={() => setStep(s => Math.max(1, s - 1) as Step)} disabled={step === 1}
                className="w-full rounded-xl border border-[#E2D8CC] bg-[#FAF7F2] px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-[#F2EBE0] disabled:opacity-30 sm:w-auto">
                ← Back
              </button>
              {step < 5 ? (
                <button 
                  onClick={handleNext}
                  className="shine-button w-full bg-gradient-to-br from-[#C84B11] to-[#E8622A] px-6 py-2.5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(200,75,17,0.22)] transition-all hover:-translate-y-0.5 sm:w-auto">
                  Next →
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting}
                  className="shine-button w-full bg-gradient-to-br from-[#C84B11] to-[#E8622A] px-8 py-2.5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(200,75,17,0.22)] transition-all hover:-translate-y-0.5 disabled:opacity-50 sm:w-auto">
                  {submitting ? 'Publishing…' : 'Publish Event'}
                </button>
              )}
            </div>
          </div>
      </div>
    </AdminLayout>
  );
}
