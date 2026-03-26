"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import { GridIcon, PlusIcon, QrIcon, ListIcon } from '@/components/Icons';
import dynamic from 'next/dynamic';
import type { HallLayoutData } from '@/components/VenueMap';

const VenueMap = dynamic(() => import('@/components/VenueMap'), { ssr: false });

type Step = 1 | 2 | 3 | 4 | 5;
const STEPS = ['Basic Info', 'Schedule', 'Hall Layout', 'Speakers', 'Review'];

const defaultLayout: HallLayoutData = {
  hall_name: '', total_rows: 10, seats_per_row: 20,
  aisle_after_seat: [], reserved_rows: [],
  stage_position: 'front', entry_points: 'both',
};

const defaultForm = {
  name: '', collegeName: '', collegeDomain: '', city: '', venue: '',
  dateTime: '', capacity: '', description: '', topics: '', amount: '',
  speakers: [{ name: '', role: '', company: '', bio: '' }],
  agenda: [{ time: '', title: '', duration: '', speaker: '' }],
};

// Defined OUTSIDE the page component to prevent remount on every keystroke
function FormInput({ label, type = 'text', placeholder = '', value, onChange }: {
  label: string; type?: string; placeholder?: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">{label}</label>
      <input type={type} placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8831A] transition-colors" />
    </div>
  );
}

export default function CreateEventPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState(defaultForm);
  const [layout, setLayout] = useState<HallLayoutData>(defaultLayout);
  const [aisleInput, setAisleInput] = useState('');
  const [reservedInput, setReservedInput] = useState('');
  const [saveHall, setSaveHall] = useState(true);
  const [savedHalls, setSavedHalls] = useState<(HallLayoutData & { _id: string })[]>([]);
  const [selectedHallId, setSelectedHallId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (step === 3 && token) {
      fetch('http://localhost:5000/api/halls', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(setSavedHalls).catch(() => {});
    }
  }, [step, token]);

  if (!user || (user.role !== 'admin' && user.role !== 'superAdmin')) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Access Denied</div>;
  }

  const set = (field: string, val: string) => setForm(p => ({ ...p, [field]: val }));
  const setL = (field: keyof HallLayoutData, val: unknown) => setLayout(p => ({ ...p, [field]: val }));

  const setSpeaker = (i: number, key: string, val: string) => {
    const u = [...form.speakers]; u[i] = { ...u[i], [key]: val }; setForm(p => ({ ...p, speakers: u }));
  };
  const setAgenda = (i: number, key: string, val: string) => {
    const u = [...form.agenda]; u[i] = { ...u[i], [key]: val }; setForm(p => ({ ...p, agenda: u }));
  };
  const addSpeaker = () => setForm(p => ({ ...p, speakers: [...p.speakers, { name: '', role: '', company: '', bio: '' }] }));
  const addAgenda = () => setForm(p => ({ ...p, agenda: [...p.agenda, { time: '', title: '', duration: '', speaker: '' }] }));
  const removeSpeaker = (i: number) => setForm(p => ({ ...p, speakers: p.speakers.filter((_, idx) => idx !== i) }));
  const removeAgenda = (i: number) => setForm(p => ({ ...p, agenda: p.agenda.filter((_, idx) => idx !== i) }));

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
      if (saveHall && layout.hall_name) {
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
        agenda: form.agenda.filter(a => a.title),
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

  const layoutPreviewReady = layout.hall_name && layout.total_rows > 0 && layout.seats_per_row > 0;

  const titleNode = (
    <div>
      <Link href="/admin" className="text-gray-400 text-xs hover:text-gray-600 transition-colors mb-1 inline-block">← Back to Dashboard</Link>
      <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#0E1B3D]">Create New Event</h1>
    </div>
  );

  return (
    <AdminLayout title={titleNode}>
      <div className="max-w-4xl mx-auto">
        {/* Step indicator */}
          <div className="flex items-center gap-0 mb-8">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <div className={`flex items-center gap-2 ${i + 1 === step ? 'text-[#E8831A]' : i + 1 < step ? 'text-emerald-600' : 'text-gray-300'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${i + 1 === step ? 'border-[#E8831A] bg-[#E8831A] text-white' : i + 1 < step ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-200 text-gray-400'}`}>
                    {i + 1 < step ? '✓' : i + 1}
                  </div>
                  <span className="text-xs font-bold hidden md:block">{s}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-3 ${i + 1 < step ? 'bg-emerald-400' : 'bg-gray-200'}`}/>}
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">

            {/* Step 1 */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="font-bold text-lg text-[#0E1B3D] mb-5">Event Details</h2>
                <FormInput label="Event Name *" value={form.name} onChange={v => set('name', v)} placeholder="Tech Summit 2025" />
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="College Name *" value={form.collegeName} onChange={v => set('collegeName', v)} placeholder="KSR College of Engineering" />
                  <FormInput label="College Email Domain *" value={form.collegeDomain} onChange={v => set('collegeDomain', v)} placeholder="ksrce.ac.in" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="City *" value={form.city} onChange={v => set('city', v)} placeholder="Tiruchengode" />
                  <FormInput label="Venue *" value={form.venue} onChange={v => set('venue', v)} placeholder="Main Auditorium" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Description</label>
                  <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4} placeholder="Describe the event…"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8831A] resize-none transition-colors"/>
                </div>
                <FormInput label="Topics (comma separated)" value={form.topics} onChange={v => set('topics', v)} placeholder="AI, ML, IoT, Robotics" />
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="font-bold text-lg text-[#0E1B3D] mb-5">Schedule & Capacity</h2>
                <FormInput label="Date &amp; Time *" type="datetime-local" value={form.dateTime} onChange={v => set('dateTime', v)} />
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="Total Capacity *" type="number" value={form.capacity} onChange={v => set('capacity', v)} placeholder="500" />
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Registration Fee (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₹</span>
                      <input type="number" min={0} value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="0 = Free"
                        className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sm outline-none focus:border-[#E8831A] transition-colors" />
                    </div>
                  </div>
                </div>
                <div className="bg-[#FAF8F4] border border-[#E8831A]/20 rounded-2xl p-5 mt-4">
                  <h3 className="font-bold text-[#0E1B3D] mb-4 text-sm">Agenda Items (Optional)</h3>
                  {form.agenda.map((item, i) => (
                    <div key={i} className="grid grid-cols-4 gap-3 mb-3">
                      {['time', 'title', 'duration', 'speaker'].map(k => (
                        <input key={k} value={item[k as keyof typeof item]} onChange={e => setAgenda(i, k, e.target.value)}
                          placeholder={k.charAt(0).toUpperCase() + k.slice(1)}
                          className="border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-[#E8831A] transition-colors"/>
                      ))}
                      {form.agenda.length > 1 && (
                        <button type="button" onClick={() => removeAgenda(i)} className="text-red-400 text-xs col-start-4 text-right">Remove</button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addAgenda} className="text-[#E8831A] text-xs font-bold mt-1 hover:underline">+ Add Agenda Item</button>
                </div>
              </div>
            )}

            {/* Step 3 – Hall Layout */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg text-[#0E1B3D]">Hall Layout</h2>
                  <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1 rounded-full border">Optional — skip to use text venue only</span>
                </div>

                {/* Autofill from saved halls */}
                {savedHalls.length > 0 && (
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                    <label className="block text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">Autofill from Saved Hall</label>
                    <select value={selectedHallId} onChange={e => autofillHall(e.target.value)}
                      className="w-full border border-blue-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#E8831A] bg-white">
                      <option value="">— Create new layout —</option>
                      {savedHalls.map(h => (
                        <option key={h._id} value={h._id}>{h.hall_name} ({h.total_rows} rows × {h.seats_per_row} seats)</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Hall config grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Hall Name *</label>
                    <input value={layout.hall_name} onChange={e => setL('hall_name', e.target.value)} placeholder="Main Auditorium"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8831A] transition-colors"/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Total Rows</label>
                      <input type="number" min={1} max={52} value={layout.total_rows}
                        onChange={e => setL('total_rows', Math.max(1, Math.min(52, Number(e.target.value))))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8831A] transition-colors"/>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Seats / Row</label>
                      <input type="number" min={1} value={layout.seats_per_row}
                        onChange={e => setL('seats_per_row', Math.max(1, Number(e.target.value)))}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8831A] transition-colors"/>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Aisle After Seat # (comma separated)</label>
                    <input value={aisleInput} onChange={e => applyAisles(e.target.value)} placeholder="e.g. 10, 20"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8831A] transition-colors"/>
                    <p className="text-[10px] text-gray-400 mt-1">Inserts an aisle gap after these seat positions</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">VIP / Reserved Rows (comma separated)</label>
                    <input value={reservedInput} onChange={e => applyReserved(e.target.value)} placeholder="e.g. A, B"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#E8831A] transition-colors"/>
                    <p className="text-[10px] text-gray-400 mt-1">These rows will be highlighted as VIP</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Stage Position</label>
                    <div className="flex gap-3">
                      {(['front', 'back'] as const).map(pos => (
                        <button key={pos} type="button" onClick={() => setL('stage_position', pos)}
                          className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${layout.stage_position === pos ? 'bg-[#E8831A] text-white border-[#E8831A]' : 'border-gray-200 text-gray-500 hover:border-[#E8831A]'}`}>
                          {pos === 'front' ? '⬛ Front' : 'Back ⬛'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">Entry / Exit Points</label>
                    <div className="flex gap-3">
                      {(['left', 'right', 'both'] as const).map(ep => (
                        <button key={ep} type="button" onClick={() => setL('entry_points', ep)}
                          className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all capitalize ${layout.entry_points === ep ? 'bg-[#0E1B3D] text-white border-[#0E1B3D]' : 'border-gray-200 text-gray-500 hover:border-[#0E1B3D]'}`}>
                          {ep}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Save hall toggle */}
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div onClick={() => setSaveHall(p => !p)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${saveHall ? 'bg-[#E8831A]' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${saveHall ? 'left-5' : 'left-0.5'}`}/>
                  </div>
                  <span className="text-sm text-gray-600 font-medium">Save this hall layout for future events</span>
                </label>

                {/* Live preview */}
                {layoutPreviewReady && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Live Preview</p>
                    <VenueMap layout={layout} compact={true} />
                  </div>
                )}
              </div>
            )}

            {/* Step 4 – Speakers */}
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
                      {[['name', 'Full Name'], ['role', 'Title/Role'], ['company', 'Company'], ['bio', 'Short Bio']].map(([k, lbl]) => (
                        <div key={k} className={k === 'bio' ? 'col-span-2' : ''}>
                          <label className="block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">{lbl}</label>
                          <input value={sp[k as keyof typeof sp]} onChange={e => setSpeaker(i, k, e.target.value)} placeholder={lbl}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#E8831A] transition-colors"/>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <button onClick={addSpeaker} className="text-[#E8831A] text-sm font-bold hover:underline">+ Add Speaker</button>
              </div>
            )}

            {/* Step 5 – Review */}
            {step === 5 && (
              <div>
                <h2 className="font-bold text-lg text-[#0E1B3D] mb-5">Review & Publish</h2>
                <div className="space-y-3 mb-6">
                  {[
                    ['Event', form.name], ['College', form.collegeName], ['Domain', form.collegeDomain],
                    ['City', form.city], ['Venue', form.venue],
                    ['Date', form.dateTime ? new Date(form.dateTime).toLocaleString() : '—'],
                    ['Capacity', form.capacity], ['Topics', form.topics || '—'],
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

                {/* Hall preview in review */}
                {layoutPreviewReady && (
                  <div className="mb-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Venue Map Preview</p>
                    <VenueMap layout={layout} compact={true} />
                  </div>
                )}

                {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm mb-4">{error}</div>}
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
                  className="bg-[#E8831A] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#d4741a] transition-colors">
                  {step === 3 && !layout.hall_name ? 'Skip Hall Layout →' : 'Next →'}
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting}
                  className="bg-[#0E1B3D] text-white px-8 py-2.5 rounded-xl font-bold text-sm hover:bg-[#1a2d5a] transition-colors disabled:opacity-50">
                  {submitting ? 'Publishing…' : '🚀 Publish Event'}
                </button>
              )}
            </div>
          </div>
      </div>
    </AdminLayout>
  );
}
