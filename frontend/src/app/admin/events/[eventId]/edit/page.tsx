"use client";
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import dynamic from 'next/dynamic';
import type { HallLayoutData } from '@/components/VenueMap';
import { CheckCircleIcon, AlertIcon, GridIcon, PlusIcon, QrIcon, ListIcon } from '@/components/Icons';

const VenueMap = dynamic(() => import('@/components/VenueMap'), { ssr: false });

type Step = 1 | 2 | 3 | 4 | 5;
const STEPS = ['Basic Info', 'Schedule', 'Hall Layout', 'Speakers', 'Review'];

type Speaker = { name: string; role: string; company: string; bio: string };
type AgendaItem = { time: string; title: string; duration: string; speaker: string };
type FormData = {
  name: string; collegeName: string; collegeDomain: string; city: string;
  venue: string; dateTime: string; capacity: string; description: string;
  topics: string; status: string; amount: string;
  speakers: Speaker[];
  agenda: AgendaItem[];
};

const defaultLayout: HallLayoutData = {
  hall_name: '', total_rows: 10, seats_per_row: 20,
  aisle_after_seat: [], reserved_rows: [],
  stage_position: 'front', entry_points: 'both',
};

const defaultForm: FormData = {
  name: '', collegeName: '', collegeDomain: '', city: '', venue: '',
  dateTime: '', capacity: '', description: '', topics: '', status: 'UPCOMING', amount: '',
  speakers: [{ name: '', role: '', company: '', bio: '' }],
  agenda: [{ time: '', title: '', duration: '', speaker: '' }],
};

// Defined OUTSIDE component to prevent remount on each keystroke
function FormInput({ label, type = 'text', placeholder = '', value, onChange, required = false }: {
  label: string; type?: string; placeholder?: string; value: string;
  onChange: (v: string) => void; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-bold tracking-wide text-gray-600 mb-1.5">{label}</label>
      <input type={type} placeholder={placeholder} value={value} required={required}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-white text-[#1C1A17] border border-gray-200 placeholder-gray-400 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#e8631a] transition-colors shadow-sm" />
    </div>
  );
}

export default function EditEventPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [layout, setLayout] = useState<HallLayoutData>(defaultLayout);
  const [aisleInput, setAisleInput] = useState('');
  const [reservedInput, setReservedInput] = useState('');
  const [savedHalls, setSavedHalls] = useState<(HallLayoutData & { _id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchEvent = useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/events/${eventId}`);
      const data = await res.json();
      setForm({
        name: data.name || '',
        collegeName: data.collegeName || '',
        collegeDomain: data.collegeDomain || '',
        city: data.city || '',
        venue: data.venue || '',
        dateTime: data.dateTime ? new Date(data.dateTime).toISOString().slice(0, 16) : '',
        capacity: data.capacity?.toString() || '',
        description: data.description || '',
        topics: Array.isArray(data.topics) ? data.topics.join(', ') : '',
        status: data.status || 'UPCOMING',
        amount: data.amount?.toString() || '0',
        speakers: data.speakers?.length ? data.speakers : [{ name: '', role: '', company: '', bio: '' }],
        agenda: data.agenda?.length ? data.agenda : [{ time: '', title: '', duration: '', speaker: '' }],
      });
      if (data.hallLayout && typeof data.hallLayout === 'object') {
        setLayout(data.hallLayout);
        setAisleInput(data.hallLayout.aisle_after_seat?.join(', ') || '');
        setReservedInput(data.hallLayout.reserved_rows?.join(', ') || '');
      }
    } catch { setError('Failed to load event'); }
    finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => {
    if (!user || !token) { router.push('/admin/login'); return; }
    if (user.role !== 'admin' && user.role !== 'superAdmin') { router.push('/'); return; }
    fetchEvent();
    fetch('http://localhost:5000/api/halls', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setSavedHalls).catch(() => {});
  }, [user, token, router, fetchEvent]);

  const set = (k: keyof FormData, v: string) => setForm(prev => ({ ...prev, [k]: v }));
  const setL = (k: keyof HallLayoutData, v: unknown) => setLayout(prev => ({ ...prev, [k]: v }));

  const applyAisles = (raw: string) => {
    setAisleInput(raw);
    setL('aisle_after_seat', raw.split(',').map(x => parseInt(x.trim())).filter(n => !isNaN(n)));
  };
  const applyReserved = (raw: string) => {
    setReservedInput(raw);
    setL('reserved_rows', raw.split(',').map(x => x.trim()).filter(Boolean));
  };
  const autofillHall = (id: string) => {
    const h = savedHalls.find(s => s._id === id);
    if (h) { setLayout(h); setAisleInput(h.aisle_after_seat?.join(', ') || ''); setReservedInput(h.reserved_rows?.join(', ') || ''); }
  };

  const setSpeaker = (i: number, k: string, v: string) =>
    setForm(prev => { const s = [...prev.speakers]; s[i] = { ...s[i], [k]: v }; return { ...prev, speakers: s }; });
  const addSpeaker = () => setForm(prev => ({ ...prev, speakers: [...prev.speakers, { name: '', role: '', company: '', bio: '' }] }));
  const removeSpeaker = (i: number) => setForm(prev => ({ ...prev, speakers: prev.speakers.filter((_, idx) => idx !== i) }));

  const setAgenda = (i: number, k: string, v: string) =>
    setForm(prev => { const a = [...prev.agenda]; a[i] = { ...a[i], [k]: v }; return { ...prev, agenda: a }; });
  const addAgenda = () => setForm(prev => ({ ...prev, agenda: [...prev.agenda, { time: '', title: '', duration: '', speaker: '' }] }));
  const removeAgenda = (i: number) => setForm(prev => ({ ...prev, agenda: prev.agenda.filter((_, idx) => idx !== i) }));

  const handleSubmit = async () => {
    setSaving(true); setError('');
    try {
      const body = {
        name: form.name, collegeName: form.collegeName, collegeDomain: form.collegeDomain,
        city: form.city, venue: form.venue, status: form.status,
        dateTime: new Date(form.dateTime).toISOString(),
        capacity: Number(form.capacity),
        amount: Number(form.amount) || 0,
        description: form.description,
        topics: form.topics.split(',').map(t => t.trim()).filter(Boolean),
        speakers: form.speakers.filter(s => s.name),
        agenda: form.agenda.filter(a => a.title),
      };
      const res = await fetch(`http://localhost:5000/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        router.push(`/admin/events/${eventId}`);
      } else {
        const d = await res.json();
        setError(d.message || 'Update failed');
      }
    } catch { setError('Network error'); }
    finally { setSaving(false); }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'superAdmin')) return null;

  const layoutPreviewReady = layout.hall_name && layout.total_rows > 0 && layout.seats_per_row > 0;

  const titleNode = "Edit Event";

  return (
    <AdminLayout title={titleNode}>
      <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="space-y-4">{Array.from({length:5}).map((_,i) => <div key={i} className="h-14 bg-white rounded-2xl animate-pulse border border-gray-100"/>)}</div>
          ) : (
            <>
              {/* Step indicator */}
              <div className="flex items-center gap-0 mb-8">
                {STEPS.map((s, i) => (
                  <div key={i} className="flex items-center flex-1 last:flex-none">
                    <div className={`flex items-center gap-2 ${i + 1 === step ? 'text-[#e8631a]' : i + 1 < step ? 'text-emerald-600' : 'text-gray-300'}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 cursor-pointer ${i + 1 === step ? 'border-[#e8631a] bg-[#e8631a] text-white' : i + 1 < step ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-200 text-gray-400'}`}
                        onClick={() => setStep((i + 1) as Step)}>
                        {i + 1 < step ? '✓' : i + 1}
                      </div>
                      <span className="text-xs font-bold hidden md:block cursor-pointer" onClick={() => setStep((i + 1) as Step)}>{s}</span>
                    </div>
                    {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-3 ${i + 1 < step ? 'bg-emerald-400' : 'bg-gray-200'}`}/>}
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">

                {/* Step 1 — Basic Info */}
                {step === 1 && (
                  <div className="space-y-4">
                    <h2 className="font-bold text-lg text-[#0E1B3D] mb-5">Event Details</h2>
                    <FormInput label="Event Name *" value={form.name} onChange={v => set('name', v)} placeholder="Tech Summit 2025" required />
                    <div className="grid grid-cols-2 gap-4">
                      <FormInput label="College Name *" value={form.collegeName} onChange={v => set('collegeName', v)} placeholder="KSR College of Engineering" required />
                      <FormInput label="College Email Domain *" value={form.collegeDomain} onChange={v => set('collegeDomain', v)} placeholder="ksrce.ac.in" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormInput label="City *" value={form.city} onChange={v => set('city', v)} placeholder="Tiruchengode" required />
                      <FormInput label="Venue *" value={form.venue} onChange={v => set('venue', v)} placeholder="Main Auditorium" required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold tracking-wide text-gray-600 mb-1.5">Description</label>
                      <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4} placeholder="Describe the event…"
                        className="w-full bg-white text-[#1C1A17] border border-gray-200 placeholder-gray-400 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#e8631a] resize-none transition-colors shadow-sm"/>
                    </div>
                    <FormInput label="Topics (comma separated)" value={form.topics} onChange={v => set('topics', v)} placeholder="AI, ML, IoT, Robotics" />
                  </div>
                )}

                {/* Step 2 — Schedule & Capacity */}
                {step === 2 && (
                  <div className="space-y-4">
                    <h2 className="font-bold text-lg text-[#0E1B3D] mb-5">Schedule & Capacity</h2>
                    <FormInput label="Date & Time *" type="datetime-local" value={form.dateTime} onChange={v => set('dateTime', v)} required />
                    <div className="grid grid-cols-2 gap-4">
                      <FormInput label="Total Capacity *" type="number" value={form.capacity} onChange={v => set('capacity', v)} placeholder="500" required />
                      <div>
                        <label className="block text-sm font-bold tracking-wide text-gray-600 mb-1.5">Registration Fee (₹)</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₹</span>
                          <input type="number" min={0} value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0 = Free"
                            className="w-full bg-white text-[#1C1A17] border border-gray-200 placeholder-gray-400 rounded-xl pl-8 pr-4 py-3 text-sm outline-none focus:border-[#e8631a] transition-colors shadow-sm" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold tracking-wide text-gray-600 mb-1.5">Status</label>
                      <select className="w-full bg-white text-[#1C1A17] border border-gray-200 placeholder-gray-400 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#e8631a] transition-colors shadow-sm" value={form.status} onChange={e => set('status', e.target.value)}>
                        <option value="UPCOMING">Upcoming</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </div>
                    <div className="bg-[#FAF8F4] border border-[#e8631a]/20 rounded-2xl p-5 mt-4">
                      <h3 className="font-bold text-[#0E1B3D] mb-4 text-sm">Agenda Items (Optional)</h3>
                      {form.agenda.map((item, i) => (
                        <div key={i} className="grid grid-cols-4 gap-3 mb-3">
                          {['time', 'title', 'duration', 'speaker'].map(k => (
                            <input key={k} value={item[k as keyof AgendaItem]} onChange={e => setAgenda(i, k, e.target.value)}
                              placeholder={k.charAt(0).toUpperCase() + k.slice(1)}
                              className="bg-white text-[#1C1A17] border border-gray-200 placeholder-gray-400 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#e8631a] transition-colors shadow-sm"/>
                          ))}
                          {form.agenda.length > 1 && (
                            <button type="button" onClick={() => removeAgenda(i)} className="text-red-400 text-xs col-start-4 text-right">Remove</button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={addAgenda} className="text-[#e8631a] text-xs font-bold mt-1 hover:underline">+ Add Agenda Item</button>
                    </div>
                  </div>
                )}

                {/* Step 3 — Hall Layout */}
                {step === 3 && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <h2 className="font-bold text-lg text-[#0E1B3D]">Hall Layout</h2>
                      <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full border">Optional — skip to use text venue only</span>
                    </div>
                    {savedHalls.length > 0 && (
                      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                        <label className="block text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">Autofill from Saved Hall</label>
                        <select onChange={e => autofillHall(e.target.value)}
                          className="w-full border border-blue-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#e8631a] bg-white">
                          <option value="">— Keep current layout —</option>
                          {savedHalls.map(h => (
                            <option key={h._id} value={h._id}>{h.hall_name} ({h.total_rows} rows × {h.seats_per_row} seats)</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold tracking-wide text-gray-600 mb-1.5">Hall Name *</label>
                        <input value={layout.hall_name} onChange={e => setL('hall_name', e.target.value)} placeholder="Main Auditorium"
                          className="w-full bg-white text-[#1C1A17] border border-gray-200 placeholder-gray-400 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#e8631a] transition-colors shadow-sm"/>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-bold tracking-wide text-gray-600 mb-1.5">Total Rows</label>
                          <input type="number" min={1} max={52} value={layout.total_rows}
                            onChange={e => setL('total_rows', Math.max(1, Math.min(52, Number(e.target.value))))}
                            className="w-full bg-white text-[#1C1A17] border border-gray-200 placeholder-gray-400 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#e8631a] transition-colors shadow-sm"/>
                        </div>
                        <div>
                          <label className="block text-sm font-bold tracking-wide text-gray-600 mb-1.5">Seats / Row</label>
                          <input type="number" min={1} value={layout.seats_per_row}
                            onChange={e => setL('seats_per_row', Math.max(1, Number(e.target.value)))}
                            className="w-full bg-white text-[#1C1A17] border border-gray-200 placeholder-gray-400 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#e8631a] transition-colors shadow-sm"/>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold tracking-wide text-gray-600 mb-1.5">Aisle After Seat (comma separated)</label>
                        <input value={aisleInput} onChange={e => applyAisles(e.target.value)} placeholder="e.g. 10, 20"
                          className="w-full bg-white text-[#1C1A17] border border-gray-200 placeholder-gray-400 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#e8631a] transition-colors shadow-sm"/>
                        <p className="text-[10px] text-gray-400 mt-1">Inserts an aisle gap after these seat positions</p>
                      </div>
                      <div>
                        <label className="block text-sm font-bold tracking-wide text-gray-600 mb-1.5">VIP / Reserved Rows (comma separated)</label>
                        <input value={reservedInput} onChange={e => applyReserved(e.target.value)} placeholder="e.g. A, B"
                          className="w-full bg-white text-[#1C1A17] border border-gray-200 placeholder-gray-400 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#e8631a] transition-colors shadow-sm"/>
                        <p className="text-[10px] text-gray-400 mt-1">These rows will be highlighted as VIP</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold tracking-wide text-gray-600 mb-1.5">Stage Position</label>
                        <div className="flex gap-3">
                          {(['front', 'back'] as const).map(pos => (
                            <button key={pos} type="button" onClick={() => setL('stage_position', pos)}
                              className={`flex-1 bg-white shadow-sm py-2.5 rounded-xl border text-sm font-bold transition-all ${layout.stage_position === pos ? 'bg-[#e8631a] text-white border-[#e8631a]' : 'border-gray-200 text-gray-500 hover:border-[#e8631a]'}`}>
                              {pos === 'front' ? '⬛ Front' : 'Back ⬛'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-bold tracking-wide text-gray-600 mb-1.5">Entry / Exit Points</label>
                        <div className="flex gap-3">
                          {(['left', 'right', 'both'] as const).map(ep => (
                            <button key={ep} type="button" onClick={() => setL('entry_points', ep)}
                              className={`flex-1 bg-white shadow-sm py-2.5 rounded-xl border text-xs font-bold transition-all capitalize ${layout.entry_points === ep ? 'bg-[#0E1B3D] text-white border-[#0E1B3D]' : 'border-gray-200 text-gray-500 hover:border-[#0E1B3D]'}`}>
                              {ep}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    {layoutPreviewReady && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Live Preview</p>
                        <VenueMap layout={layout} compact={true} />
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4 — Speakers */}
                {step === 4 && (
                  <div>
                    <h2 className="font-bold text-lg text-[#0E1B3D] mb-5">Speakers (Optional)</h2>
                    {form.speakers.map((sp, i) => (
                      <div key={i} className="border border-gray-100 rounded-2xl p-5 mb-4 bg-gray-50">
                        <div className="flex justify-between items-center mb-3">
                          <p className="text-sm font-bold text-[#0E1B3D]">Speaker {i + 1}</p>
                          {form.speakers.length > 1 && (
                            <button onClick={() => removeSpeaker(i)} className="text-red-400 text-xs font-bold hover:text-red-600">Remove</button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {([['name', 'Full Name'], ['role', 'Title/Role'], ['company', 'Company'], ['bio', 'Short Bio']] as [keyof Speaker, string][]).map(([k, lbl]) => (
                            <div key={k} className={k === 'bio' ? 'col-span-2' : ''}>
                              <label className="block text-xs font-bold tracking-wide text-gray-500 mb-1">{lbl}</label>
                              <input value={sp[k]} onChange={e => setSpeaker(i, k, e.target.value)} placeholder={lbl}
                                className="w-full bg-white text-[#1C1A17] border border-gray-200 placeholder-gray-400 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#e8631a] transition-colors shadow-sm"/>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button onClick={addSpeaker} className="text-[#e8631a] text-sm font-bold hover:underline">+ Add Speaker</button>
                  </div>
                )}

                {/* Step 5 — Review & Save */}
                {step === 5 && (
                  <div>
                    <h2 className="font-bold text-lg text-[#0E1B3D] mb-5">Review & Save Changes</h2>
                    <div className="space-y-3 mb-6">
                      {[
                        ['Event', form.name], ['College', form.collegeName], ['Domain', form.collegeDomain],
                        ['City', form.city], ['Venue', form.venue],
                        ['Date', form.dateTime ? new Date(form.dateTime).toLocaleString() : '—'],
                        ['Capacity', form.capacity], ['Fee', form.amount ? `₹${form.amount}` : 'Free'],
                        ['Topics', form.topics || '—'],
                        ['Status', form.status],
                        ['Speakers', `${form.speakers.filter(s => s.name).length} added`],
                        ['Agenda', `${form.agenda.filter(a => a.title).length} items`],
                        ['Hall Layout', layout.hall_name || '—'],
                      ].map(([k, v]) => (
                        <div key={k} className="flex gap-4 py-2 border-b border-gray-50">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 w-28 shrink-0">{k}</span>
                          <span className="text-sm text-[#0E1B3D] font-medium">{v}</span>
                        </div>
                      ))}
                    </div>
                    {layoutPreviewReady && (
                      <div className="mb-6">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Venue Map Preview</p>
                        <VenueMap layout={layout} compact={true} />
                      </div>
                    )}
                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm mb-4 flex items-center gap-2">
                        <AlertIcon className="w-4 h-4 shrink-0"/>{error}
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
                  <button onClick={() => setStep(s => Math.max(1, s - 1) as Step)} disabled={step === 1}
                    className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 disabled:opacity-30">
                    ← Back
                  </button>
                  {step < 5 ? (
                    <button onClick={() => setStep(s => (s + 1) as Step)}
                      className="bg-[#e8631a] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#d4741a] transition-colors">
                      {step === 3 && !layout.hall_name ? 'Skip Hall Layout →' : 'Next →'}
                    </button>
                  ) : (
                    <button onClick={handleSubmit} disabled={saving}
                      className="bg-[#0E1B3D] text-white px-8 py-2.5 rounded-xl font-bold text-sm hover:bg-[#1a2d5a] transition-colors disabled:opacity-50 flex items-center gap-2">
                      {saving
                        ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> Saving…</>
                        : <><CheckCircleIcon className="w-4 h-4"/> Save Changes</>}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
      </div>
    </AdminLayout>
  );
}
