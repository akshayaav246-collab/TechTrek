"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

// Theme-matching floating SVG icons — spread across full width
const BUBBLES = [
  // ── Left zone ─────────────────────────────────────────────
  // Graduation cap (top-left)
  { path: 'M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3.33 1.67 6.67 1.67 10 0v-5', x: 5, y: 10, size: 46, delay: 0, dur: 3.5 },
  // Sparkle (mid-left)
  { path: 'M12 2l2.4 7.6H22l-6.4 4.4 2.4 7.6L12 17.2 5.9 21.6l2.4-7.6L2 9.6h7.6z', x: 3, y: 42, size: 38, delay: 0.6, dur: 4 },
  // Revenue (left-center)
  { path: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6', x: 10, y: 65, size: 40, delay: 1.2, dur: 3.8 },
  // Certificate (bottom-left)
  { path: 'M12 15a6 6 0 100-12 6 6 0 000 12zM8.21 13.89L7 23l5-3 5 3-1.21-9.12', x: 5, y: 82, size: 38, delay: 0.4, dur: 4.2 },
  // Tech/Bolt (far left)
  { path: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z', x: 18, y: 28, size: 36, delay: 1.8, dur: 3.6 },

  // ── Centre zone ────────────────────────────────────────────
  // Dashboard top-centre
  { path: 'M3 3h18a1 1 0 011 1v13a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1zM8 21h8M12 18v3M7 12l3-3 2 2 5-5', x: 50, y: 5, size: 40, delay: 2, dur: 3.4 },
  // Network nodes (bottom-centre)
  { path: 'M12 2a2 2 0 100 4 2 2 0 000-4zM3 18a2 2 0 100 4 2 2 0 000-4zM21 18a2 2 0 100 4 2 2 0 000-4zM12 4v6M6.5 17L12 10M17.5 17L12 10', x: 48, y: 86, size: 38, delay: 0.9, dur: 4.5 },

  // ── Right zone ─────────────────────────────────────────────
  // Calendar (top-right)
  { path: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zM8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01', x: 87, y: 12, size: 42, delay: 0.3, dur: 3.7 },
  // Cloud Computing (mid-right)
  { path: 'M6.5 19A4.5 4.5 0 012 14.5c0-2.33 1.79-4.3 4.09-4.48A7 7 0 0120 13a3.5 3.5 0 01-1 6.88M12 14v8M9 19l3 3 3-3', x: 92, y: 40, size: 42, delay: 1.1, dur: 4.1 },
  // QR Code (right-centre)
  { path: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM19 14h2v2h-2zM17 19h4v2h-4zM5 5h3v3H5zM16 5h3v3h-3zM5 16h3v3H5z', x: 84, y: 64, size: 44, delay: 1.6, dur: 3.9 },
  // Student (bottom-right)
  { path: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c0-3.31 3.58-6 8-6s8 2.69 8 6', x: 88, y: 83, size: 40, delay: 0.7, dur: 4.3 },
  // Tech bolt (far right mid)
  { path: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z', x: 78, y: 30, size: 36, delay: 2.2, dur: 3.5 },
];

function Clock() {
  const [dt, setDt] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const date = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      setDt(`${date} · ${time}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-xs text-[#e8631a]/70 tracking-wider">{dt}</span>;
}

export default function AdminLoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      if (data.role !== 'admin' && data.role !== 'superAdmin') throw new Error('Access denied.');
      login(data, data.token);
      router.push(data.role === 'superAdmin' ? '/superadmin' : '/admin');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-body relative overflow-hidden" style={{ background: '#060D1A' }}>

      {/* ── Floating SVG icon bubbles ─────────────────────── */}
      {BUBBLES.map((b, i) => (
        <div key={i} className="absolute pointer-events-none select-none"
          style={{
            left: `${b.x}%`, top: `${b.y}%`,
            animation: `floatBubble ${b.dur}s ease-in-out ${b.delay}s infinite alternate`,
          }}>
          <svg width={b.size} height={b.size} viewBox="0 0 24 24" fill="none"
            stroke="#e8631a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ opacity: 0.42 }}>
            <path d={b.path}/>
          </svg>
        </div>
      ))}

      {/* Grid overlay texture */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(rgba(232,131,26,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(232,131,26,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* ── Top navbar ─────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/8">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#e8631a] flex items-center justify-center shadow-lg shadow-[#e8631a]/20">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <span className="text-white font-bold text-base tracking-tight">TechTrek</span>
          </div>
          <span className="text-white/25 text-[11px] font-bold uppercase tracking-[0.25em] hidden md:block">Command Center</span>
        </div>
        <div className="flex items-center gap-4">
          <Clock />
        </div>
      </nav>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative z-10">

        {/* Logo + Heading */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#e8631a] flex items-center justify-center shadow-xl shadow-[#e8631a]/30 mb-5">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <h1 className="font-heading font-extrabold text-5xl md:text-6xl text-white tracking-tight leading-none text-center">
            Command <span className="text-[#e8631a]">Center</span>
          </h1>
          <p className="text-white/30 text-sm mt-2 tracking-widest text-center">Manage events, registrations, check-ins & performance</p>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-white/8 overflow-hidden shadow-2xl shadow-black/60"
            style={{ background: 'rgba(14,27,61,0.8)', backdropFilter: 'blur(20px)' }}>

            {/* Form */}
            <div className="px-6 py-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 mb-5 text-sm font-medium flex items-center gap-3">
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">
                    Email Address <span className="text-[#e8631a]">*</span>
                  </label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@techtrek.in"
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none border border-white/8 focus:border-[#e8631a]/60 transition-colors"
                      style={{ background: 'rgba(255,255,255,0.04)' }} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">
                    Password <span className="text-[#e8631a]">*</span>
                  </label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                    <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••"
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none border border-white/8 focus:border-[#e8631a]/60 transition-colors"
                      style={{ background: 'rgba(255,255,255,0.04)' }} />
                  </div>
                </div>

                {/* Shiny Login button */}
                <button type="submit" disabled={loading}
                  className="shiny-btn w-full relative overflow-hidden flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl transition-all mt-2 disabled:opacity-60"
                  style={{ background: loading ? '#c47218' : '#e8631a' }}>
                  <span className="relative z-10">{loading ? 'Signing in…' : 'Login'}</span>
                  {!loading && (
                    <svg className="relative z-10 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom footer ────────────────────────────────────── */}
      <div className="relative z-10 border-t border-white/5 py-3 px-6 flex items-center justify-center">
        <p className="text-white/15 text-[10px] uppercase tracking-widest">© {new Date().getFullYear()} TechTrek · All Rights Reserved</p>
      </div>

      {/* Keyframe styles */}
      <style jsx global>{`
        @keyframes floatBubble {
          0%   { transform: translateY(0px) scale(1); }
          100% { transform: translateY(-18px) scale(1.08); }
        }
        .shiny-btn::before {
          content: '';
          position: absolute;
          top: 0; left: -75%;
          width: 50%; height: 100%;
          background: linear-gradient(120deg, transparent, rgba(255,255,255,0.28), transparent);
          animation: shine 2.4s ease-in-out infinite;
        }
        @keyframes shine {
          0%   { left: -75%; }
          100% { left: 135%; }
        }
      `}</style>
    </div>
  );
}
