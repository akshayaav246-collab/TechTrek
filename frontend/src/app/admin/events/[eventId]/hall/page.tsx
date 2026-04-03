"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/admin/AdminLayout';
import VenueMap from '@/components/VenueMap';
import type { HallLayoutData } from '@/components/VenueMap';

export default function AttachHallPage() {
  const { user, token, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;

  const [halls, setHalls] = useState<(HallLayoutData & { _id: string })[]>([]);
  const [selectedHallId, setSelectedHallId] = useState('');
  const [preview, setPreview] = useState<HallLayoutData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch('http://localhost:5000/api/halls', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setHalls).catch(() => {});
  }, [token]);

  const handleSelect = (id: string) => {
    setSelectedHallId(id);
    const hall = halls.find(h => h._id === id);
    setPreview(hall || null);
  };

  const handleAttach = async () => {
    if (!selectedHallId) return;
    setSubmitting(true); setMsg('');
    try {
      const res = await fetch(`http://localhost:5000/api/events/${eventId}/hall`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ hallLayoutId: selectedHallId }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.message || 'Failed'); return; }
      setMsg('Hall layout attached successfully!');
      setTimeout(() => router.push('/admin/events'), 1500);
    } catch { setMsg('Network error'); }
    finally { setSubmitting(false); }
  };

  if (isLoading) {
    return null;
  }

  if (!user || (user.role !== 'admin' && user.role !== 'superAdmin')) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Access Denied</div>;
  }

  return (
    <AdminLayout title="Attach Hall Layout" backHref="/admin/events">
      <div className="max-w-3xl mx-auto w-full py-2 sm:py-4">
          <div className="mb-8">
            <p className="text-gray-500 text-sm mt-1">Choose a saved hall layout and attach it to this event.</p>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 sm:p-8 space-y-6">
            {halls.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-500 mb-4">No saved hall layouts yet.</p>
                <Link href="/admin/create-event" className="text-[#C84B11] font-bold hover:underline">
                  Create an event with a hall layout first →
                </Link>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Select Hall Layout</label>
                  <div className="space-y-3">
                    {halls.map(h => (
                      <label key={h._id} className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedHallId === h._id ? 'border-[#C84B11] bg-[#C84B11]/10' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="radio" name="hall" value={h._id} checked={selectedHallId === h._id}
                          onChange={() => handleSelect(h._id)} className="accent-[#C84B11] mt-1 shrink-0"/>
                        <div className="min-w-0">
                          <p className="font-bold text-[#0E1B3D]">{h.hall_name}</p>
                          <p className="text-xs text-gray-500 leading-relaxed">{h.total_rows} rows × {h.seats_per_row} seats/row · Stage: {h.stage_position} · Entry: {h.entry_points}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {preview && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Preview</p>
                    <VenueMap layout={preview} compact={true}/>
                  </div>
                )}

                {msg && (
                  <div className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.includes('success') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {msg}
                  </div>
                )}

                <button onClick={handleAttach} disabled={!selectedHallId || submitting}
                  className="w-full bg-[#C84B11] hover:bg-[#E8622A] text-white font-bold py-3 rounded-xl transition-all disabled:opacity-40">
                  {submitting ? 'Attaching…' : '🏛️ Attach Hall Layout to Event'}
                </button>
              </>
            )}
          </div>
      </div>
    </AdminLayout>
  );
}




