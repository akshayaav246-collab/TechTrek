"use client";
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

type Admin = { _id: string; name: string; email: string; isActive: boolean; createdAt: string };
type Analytics = {
  totalEvents: number; totalStudents: number; totalAdmins: number;
  checkedInCount: number; noShowRate: number;
  registrations: { registered: number; waitlisted: number; checkedIn: number };
};

const StatCard = ({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) => (
  <div className={`bg-white rounded-2xl p-5 border-l-4 ${color} shadow-sm`}>
    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
    <p className="text-3xl font-extrabold text-[#0E1B3D]">{value}</p>
    {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
  </div>
);

export default function SuperAdminPage() {
  const { user, token, logout, isLoading } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState({ text: '', err: false });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user || !token) { router.push('/login'); return; }
    if (user.role !== 'superAdmin') { router.push('/'); return; }
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch('http://localhost:5000/api/superadmin/analytics', { headers: h }).then(r => r.json()),
      fetch('http://localhost:5000/api/superadmin/admins', { headers: h }).then(r => r.json()),
    ]).then(([a, ad]) => { setAnalytics(a); setAdmins(Array.isArray(ad) ? ad : []); });
  }, [user, token, isLoading, router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setCreating(true); setMsg({ text: '', err: false });
    try {
      const res = await fetch('http://localhost:5000/api/superadmin/admins', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setMsg({ text: data.message, err: true }); return; }
      setAdmins(prev => [data, ...prev]);
      setForm({ name: '', email: '', password: '' });
      setShowCreate(false);
      setMsg({ text: `Admin "${data.name}" created!`, err: false });
    } catch { setMsg({ text: 'Network error', err: true }); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 4000);
      return;
    }
    setConfirmDeleteId(null);
    const res = await fetch(`http://localhost:5000/api/superadmin/admins/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setAdmins(prev => prev.filter(a => a._id !== id));
  };

  const handleToggle = async (id: string) => {
    const res = await fetch(`http://localhost:5000/api/superadmin/admins/${id}/toggle`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) setAdmins(prev => prev.map(a => a._id === id ? { ...a, isActive: data.isActive } : a));
  };

  if (isLoading) return null;
  if (!user || user.role !== 'superAdmin') return null;

  return (
    <div className="min-h-screen bg-[#F5F5F0] font-body">
      {/* Header */}
      <div className="bg-[#0E1B3D] px-8 py-5 flex justify-between items-center">
        <div>
          <p className="text-[#e8631a] text-xs font-bold uppercase tracking-widest">TechTrek</p>
          <h1 className="text-white font-heading font-extrabold text-2xl">Super Admin Panel</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-white/60 text-xs font-medium hidden md:block">{user.email}</span>
          <span className="text-white/30">|</span>
          <button
            onClick={() => { logout(); router.push('/admin/login'); }}
            className="text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-4 py-1.5 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Analytics */}
        {analytics && (
          <div className="mb-10">
            <h2 className="font-heading font-bold text-xl text-[#0E1B3D] mb-4">Platform Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Events" value={analytics.totalEvents} color="border-[#e8631a]" />
              <StatCard label="Students" value={analytics.totalStudents} color="border-emerald-500" />
              <StatCard label="Registrations" value={analytics.registrations.registered} sub={`+${analytics.registrations.waitlisted} waitlisted`} color="border-blue-500" />
              <StatCard label="Checked In" value={analytics.checkedInCount} sub={`${analytics.noShowRate}% no-show rate`} color="border-purple-500" />
            </div>
          </div>
        )}

        {/* Admin Management */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
            <h2 className="font-heading font-bold text-xl text-[#0E1B3D]">
              Admins <span className="text-sm font-normal text-gray-400 ml-2">({admins.length})</span>
            </h2>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="bg-[#e8631a] text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-[#d4741a] transition-colors"
            >
              + Create Admin
            </button>
          </div>

          {/* Feedback message */}
          {msg.text && (
            <div className={`mx-8 mt-4 p-3 rounded-xl text-sm font-medium ${msg.err ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {msg.text}
            </div>
          )}

          {/* Create Admin Form */}
          {showCreate && (
            <form onSubmit={handleCreate} className="px-8 py-6 bg-[#FAF8F4] border-b border-gray-100">
              <h3 className="font-bold text-[#0E1B3D] mb-4">New Admin Account</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: 'name', label: 'Full Name', type: 'text', ph: 'John Doe' },
                  { key: 'email', label: 'Email', type: 'email', ph: 'admin@college.ac.in' },
                  { key: 'password', label: 'Temporary Password', type: 'password', ph: 'Min 8 chars' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">{f.label}</label>
                    <input
                      type={f.type} placeholder={f.ph} required
                      value={form[f.key as keyof typeof form]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-[#1C1A17] placeholder-gray-400 outline-none focus:border-[#e8631a] transition-colors bg-white"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-4">
                <button type="submit" disabled={creating}
                  className="bg-[#0E1B3D] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#1a2d5a] transition-colors disabled:opacity-50">
                  {creating ? 'Creating…' : 'Create Admin'}
                </button>
                <button type="button" onClick={() => setShowCreate(false)}
                  className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Admin List */}
          <div className="divide-y divide-gray-50">
            {admins.length === 0 ? (
              <p className="px-8 py-12 text-center text-gray-400 font-medium">No admins yet. Create one above.</p>
            ) : admins.map(admin => (
              <div key={admin._id} className="flex items-center justify-between px-8 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#0E1B3D] text-white flex items-center justify-center font-bold text-sm">
                    {admin.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-[#0E1B3D] text-sm">{admin.name}</p>
                    <p className="text-gray-400 text-xs">{admin.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${admin.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {admin.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button onClick={() => handleToggle(admin._id)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                    {admin.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => handleDelete(admin._id)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                      confirmDeleteId === admin._id
                        ? 'bg-red-100 text-red-800 animate-pulse'
                        : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                    }`}>
                    {confirmDeleteId === admin._id ? 'Confirm Delete?' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
