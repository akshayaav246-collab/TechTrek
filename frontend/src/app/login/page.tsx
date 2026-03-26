"use client";

import { useState, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// ─── Input ───────────────────────────────────────────────────────────────────
function Field({
  label, type, name, value, onChange, placeholder, hint, children
}: {
  label: string; type: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; hint?: string; children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold uppercase tracking-widest text-[#0E1B3D]/60">{label}</label>
      <input
        type={type} name={name} value={value} onChange={onChange}
        placeholder={placeholder} required
        className="w-full bg-[#FAF8F4] border-2 border-[#E5E7EB] rounded-xl px-4 py-3 text-[#0E1B3D] font-medium placeholder-[#0E1B3D]/30 outline-none focus:border-[#E8831A] transition-colors text-sm"
      />
      {hint && <span className="text-[10px] text-[#0E1B3D]/40">{hint}</span>}
      {children}
    </div>
  );
}

// ─── Left Branding Panel ──────────────────────────────────────────────────────
function BrandPanel() {
  return (
    <div className="hidden lg:flex lg:w-[45%] flex-col justify-between bg-[#0E1B3D] relative overflow-hidden p-12 text-white">
      {/* Abstract SVG graphic */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.06]" viewBox="0 0 600 800" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="300" stroke="#E8831A" strokeWidth="1"/>
        <circle cx="500" cy="700" r="250" stroke="#E8831A" strokeWidth="1"/>
        <circle cx="300" cy="400" r="200" stroke="white" strokeWidth="0.5"/>
        <line x1="0" y1="400" x2="600" y2="400" stroke="white" strokeWidth="0.3"/>
        <line x1="300" y1="0" x2="300" y2="800" stroke="white" strokeWidth="0.3"/>
        <polygon points="300,80 560,700 40,700" stroke="#E8831A" strokeWidth="0.5" fill="none"/>
      </svg>

      {/* Top: Logo */}
      <div>
        <div className="flex items-center gap-3 mb-16">
          <div className="w-10 h-10 rounded-xl bg-[#E8831A] flex items-center justify-center shadow-lg">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <span className="font-bold text-xl tracking-tight">TechTrek</span>
        </div>

        <div className="space-y-2 mb-8">
          <p className="text-[#E8831A] text-xs font-bold uppercase tracking-[0.2em]">Viksit Bharat Initiative</p>
          <h2 className="font-extrabold text-4xl xl:text-5xl leading-tight">
            Bridge the Gap<br/>
            <span className="text-[#E8831A]">Between Campus</span><br/>
            & Industry
          </h2>
        </div>
        <p className="text-white/60 text-sm leading-relaxed max-w-xs">
          Access exclusive summits, meet the leaders shaping India&apos;s tech future, and build your career from Day 1.
        </p>
      </div>

      {/* Middle: Stat chips */}
      <div className="flex flex-col gap-4">
        {[
          { icon: '🏛️', label: 'Colleges Covered', value: '40+' },
          { icon: '👥', label: 'Students Registered', value: '12,000+' },
          { icon: '🎤', label: 'Industry Speakers', value: '200+' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-5 py-4">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="font-bold text-lg leading-none">{s.value}</p>
              <p className="text-white/50 text-xs mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom */}
      <p className="text-white/20 text-xs mt-8">
        © {new Date().getFullYear()} TechTrek · Empowering India&apos;s Next Generation
      </p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function AuthForms() {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({
    name: '', email: '', phone: '', college: '', year: '1', discipline: '', password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/events';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      login(data, data.token);
      // Redirect by role
      if (data.role === 'superAdmin') router.push('/superadmin');
      else if (data.role === 'admin') router.push('/admin');
      else router.push(redirect);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const domain = signupData.email.split('@')[1]?.toLowerCase();
      if (!domain) throw new Error('Please enter a valid college email');
      const res = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...signupData, domain }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Signup failed');
      login(data, data.token);
      router.push(redirect);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const onLoginChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  const onSignupChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setSignupData({ ...signupData, [e.target.name]: e.target.value });

  return (
    <div className="min-h-screen flex bg-white">
      <BrandPanel />

      {/* Right: Form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-16 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Tab toggle */}
          <div className="flex items-center bg-[#FAF8F4] border border-[#E5E7EB] rounded-2xl p-1 mb-10 shadow-sm">
            {(['login', 'signup'] as const).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  tab === t
                    ? 'bg-[#0E1B3D] text-white shadow-md'
                    : 'text-[#0E1B3D]/50 hover:text-[#0E1B3D]'
                }`}
              >
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-6 text-sm font-medium flex items-start gap-2">
              <span className="mt-0.5">⚠️</span>{error}
            </div>
          )}

          {/* ── LOGIN FORM ─────────────────────────────── */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <h1 className="font-extrabold text-2xl text-[#0E1B3D]">Welcome back 👋</h1>
                <p className="text-sm text-[#0E1B3D]/50 mt-1">Sign in to access your TechTrek dashboard.</p>
              </div>
              <Field label="College Email" type="email" name="email" value={loginData.email} onChange={onLoginChange} placeholder="student@college.ac.in" />
              <Field label="Password" type="password" name="password" value={loginData.password} onChange={onLoginChange} placeholder="••••••••" />

              <button
                type="submit" disabled={loading}
                className="w-full mt-2 flex items-center justify-center gap-2 bg-[#E8831A] hover:bg-[#d4741a] text-white font-bold py-3.5 rounded-xl transition-all hover:scale-[1.01] shadow-md shadow-[#E8831A]/30 disabled:opacity-60 disabled:scale-100"
              >
                {loading ? 'Signing in…' : <>Sign In <span>→</span></>}
              </button>

              <p className="text-center text-xs text-[#0E1B3D]/40 pt-2">
                Don&apos;t have an account?{' '}
                <button type="button" onClick={() => setTab('signup')} className="text-[#E8831A] font-bold hover:underline">
                  Create one free
                </button>
              </p>
            </form>
          )}

          {/* ── SIGNUP FORM ─────────────────────────────── */}
          {tab === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <h1 className="font-extrabold text-2xl text-[#0E1B3D]">Create your profile</h1>
                <p className="text-sm text-[#0E1B3D]/50 mt-1">Join thousands of students at TechTrek summits.</p>
              </div>

              <Field label="Full Name" type="text" name="name" value={signupData.name} onChange={onSignupChange} placeholder="Rahul Sharma" />
              <Field label="College Email" type="email" name="email" value={signupData.email} onChange={onSignupChange} placeholder="student@ksrce.ac.in"
                hint="Use your college domain mail." />
              <Field label="Phone Number" type="tel" name="phone" value={signupData.phone} onChange={onSignupChange} placeholder="+91 98765 43210" />
              <Field label="College Name" type="text" name="college" value={signupData.college} onChange={onSignupChange} placeholder="KSR College of Engineering" />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[#0E1B3D]/60">Year</label>
                  <select name="year" value={signupData.year} onChange={onSignupChange}
                    className="w-full bg-[#FAF8F4] border-2 border-[#E5E7EB] rounded-xl px-4 py-3 text-[#0E1B3D] font-medium outline-none focus:border-[#E8831A] transition-colors text-sm">
                    {['1', '2', '3', '4'].map(y => <option key={y} value={y}>{y === '1' ? '1st' : y === '2' ? '2nd' : y === '3' ? '3rd' : '4th'} Year</option>)}
                  </select>
                </div>
                <Field label="Discipline" type="text" name="discipline" value={signupData.discipline} onChange={onSignupChange} placeholder="CSE / IT / ECE" />
              </div>

              <Field label="Password" type="password" name="password" value={signupData.password} onChange={onSignupChange} placeholder="Min 6 characters" />

              <button
                type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#E8831A] hover:bg-[#d4741a] text-white font-bold py-3.5 rounded-xl transition-all hover:scale-[1.01] shadow-md shadow-[#E8831A]/30 disabled:opacity-60 disabled:scale-100 mt-2"
              >
                {loading ? 'Creating account…' : <>Complete Registration <span>→</span></>}
              </button>

              <p className="text-center text-xs text-[#0E1B3D]/40 pt-1">
                Already have an account?{' '}
                <button type="button" onClick={() => setTab('login')} className="text-[#E8831A] font-bold hover:underline">
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[#0E1B3D] font-bold">Loading…</div>}>
      <AuthForms />
    </Suspense>
  );
}
