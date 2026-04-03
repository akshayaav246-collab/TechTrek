"use client";

import { useState, useRef, useEffect, Suspense } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[0-9]{10}$/;

function validateEmail(v: string) {
  return emailRegex.test(v.trim()) ? '' : 'Please enter a valid email address.';
}
function validatePhone(v: string) {
  return phoneRegex.test(v.trim()) ? '' : 'Phone number must be exactly 10 digits.';
}

// ─── Input ───────────────────────────────────────────────────────────────────
function Field({
  label, type, name, value, onChange, placeholder, hint, children, maxLength, inputMode, pattern
}: {
  label: string; type: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; hint?: string; children?: React.ReactNode;
  maxLength?: number; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  pattern?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-bold uppercase tracking-widest text-[#0E1B3D]/70 ml-1">{label}</label>
      <input
        type={type} name={name} value={value} onChange={onChange}
        placeholder={placeholder} required
        maxLength={maxLength}
        inputMode={inputMode}
        pattern={pattern}
        className="w-full bg-[#F0EBE1] border-2 border-[#E5E7EB]/50 rounded-xl px-4 py-3 text-[#0E1B3D] font-bold placeholder-[#0E1B3D]/40 outline-none focus:border-[#e8631a] transition-colors text-[13px]"
      />
      {hint && <span className="text-[10px] text-[#0E1B3D]/50 ml-1">{hint}</span>}
      {children}
    </div>
  );
}

// ─── College Selector (event-driven from DB) ───────────────────────────
interface EventCollege { collegeName: string; city: string; collegeDomain: string; }
type ErrorWithMessage = { message: string };

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return (error as ErrorWithMessage).message;
  }
  return fallback;
}

function CollegeInput({ value, onChange }: {
  value: string;
  onChange: (val: string, domain?: string) => void;
}) {
  const [colleges, setColleges] = useState<EventCollege[]>([]);
  const [query, setQuery] = useState(value);
  const [filtered, setFiltered] = useState<EventCollege[]>([]);
  const [open, setOpen] = useState(false);
  const [loadingColleges, setLoadingColleges] = useState(true);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Fetch event colleges on mount
  useEffect(() => {
    fetch('http://localhost:5000/api/events/colleges')
      .then(r => r.json())
      .then((data: EventCollege[]) => {
        setColleges(data);
        setFiltered(data);
      })
      .catch(() => setColleges([]))
      .finally(() => setLoadingColleges(false));
  }, []);

  // Outside click handler
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Recalculate dropdown position on scroll/resize
  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (!inputRef.current) return;
      const r = inputRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 6, left: r.left, width: r.width });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    onChange(q);
    const lower = q.toLowerCase();
    const matches = colleges.filter(c =>
      c.collegeName.toLowerCase().includes(lower) ||
      c.city.toLowerCase().includes(lower)
    );
    setFiltered(matches);
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 6, left: r.left, width: r.width });
    }
    setOpen(matches.length > 0);
  };

  const openAll = () => {
    if (!inputRef.current) return;
    const r = inputRef.current.getBoundingClientRect();
    setDropPos({ top: r.bottom + 6, left: r.left, width: r.width });
    setFiltered(colleges);
    setOpen(colleges.length > 0);
  };

  const select = (c: EventCollege) => {
    setQuery(c.collegeName);
    onChange(c.collegeName, c.collegeDomain);
    setOpen(false);
  };

  // Portal dropdown
  const dropdown = typeof window !== 'undefined' && open && filtered.length > 0
    ? ReactDOM.createPortal(
        <div
          style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
          className="bg-white border border-[#E5E7EB] rounded-xl shadow-2xl max-h-64 overflow-y-auto"
          onMouseDown={e => e.preventDefault()}
        >
          {filtered.map((c, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); select(c); }}
              onClick={() => select(c)}
              className="w-full text-left px-4 py-3 hover:bg-[#FFF5E6] transition-colors border-b border-[#F3F4F6] last:border-0"
            >
              <p className="font-semibold text-sm text-[#0E1B3D] truncate">{c.collegeName}</p>
              <p className="text-xs text-[#0E1B3D]/50 mt-0.5 flex items-center gap-1">
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                {c.city}
              </p>
            </button>
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <div className="flex flex-col gap-1" ref={wrapRef}>
      <label className="text-[11px] font-bold uppercase tracking-widest text-[#0E1B3D]/70 ml-1">College Name</label>
      {loadingColleges ? (
        <div className="w-full bg-[#F0EBE1] border-2 border-[#E5E7EB]/50 rounded-xl px-4 py-3 text-[#0E1B3D]/30 text-[13px] animate-pulse">
          Loading colleges…
        </div>
      ) : colleges.length === 0 ? (
        <div className="w-full bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-[13px] font-medium">
          No upcoming events found. Signup will open when events are announced.
        </div>
      ) : (
        <>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInput}
            onFocus={openAll}
            onClick={openAll}
            placeholder="Click or type to select your college…"
            required
            autoComplete="off"
            readOnly={false}
            className="w-full bg-[#F0EBE1] border-2 border-[#E5E7EB]/50 rounded-xl px-4 py-3 text-[#0E1B3D] font-bold placeholder-[#0E1B3D]/40 outline-none focus:border-[#e8631a] transition-colors text-[13px] cursor-pointer"
          />
          {query.trim().length > 0 && filtered.length === 0 && (
            <span className="text-[10px] text-red-500 font-medium ml-1">
              No matching colleges with upcoming events found.
            </span>
          )}
          {dropdown}
        </>
      )}
    </div>
  );
}

// ─── Forgot Password Modal ────────────────────────────────────────────────────
type FpStep = 'email' | 'otp' | 'reset' | 'done';

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<FpStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const emailErr = validateEmail(email);
    if (emailErr) { setError(emailErr); return; }
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      await res.json();
      setStep('otp');
    } catch {
      setError('Failed to send OTP. Please try again.');
    } finally { setLoading(false); }
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (otp.length !== 6) { setError('Enter the 6-digit OTP.'); return; }
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setResetToken(data.resetToken);
      setStep('reset');
    } catch (err: unknown) { setError(getErrorMessage(err, 'Unable to verify OTP.')); }
    finally { setLoading(false); }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setStep('done');
    } catch (err: unknown) { setError(getErrorMessage(err, 'Unable to reset password.')); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 relative animate-[fadeIn_0.2s_ease]">
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 text-[#0E1B3D]/40 hover:text-[#0E1B3D] transition-colors text-xl font-bold">✕</button>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-6">
          {(['email','otp','reset'] as FpStep[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step === s ? 'bg-[#e8631a] text-white' :
                (step === 'otp' && i === 0) || (step === 'reset' && i <= 1) || step === 'done' ? 'bg-[#0E1B3D] text-white' :
                'bg-[#E5E7EB] text-[#0E1B3D]/40'
              }`}>{i + 1}</div>
              {i < 2 && <div className="flex-1 h-0.5 w-6 bg-[#E5E7EB]" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-4 text-sm font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Step 1 – Email */}
        {step === 'email' && (
          <form onSubmit={sendOtp} className="space-y-5">
            <div>
              <h2 className="font-extrabold text-xl text-[#0E1B3D]">Forgot Password</h2>
              <p className="text-sm text-[#0E1B3D]/50 mt-1">Enter your registered email to receive an OTP.</p>
            </div>
            <Field label="Registered Email" type="email" name="fp_email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="student@college.ac.in" />
            <button type="submit" disabled={loading}
              className="w-full bg-[#e8631a] hover:bg-[#d4741a] text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-60">
              {loading ? 'Sending OTP…' : 'Send OTP →'}
            </button>
          </form>
        )}

        {/* Step 2 – OTP */}
        {step === 'otp' && (
          <form onSubmit={verifyOtp} className="space-y-5">
            <div>
              <h2 className="font-extrabold text-xl text-[#0E1B3D]">Enter OTP</h2>
              <p className="text-sm text-[#0E1B3D]/50 mt-1">A 6-digit code was sent to <strong>{email}</strong>. Valid for 10 minutes.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#0E1B3D]/60">6-Digit OTP</label>
              <input
                type="text" inputMode="numeric" value={otp} maxLength={6}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456" required
                className="w-full bg-[#FAF8F4] border-2 border-[#E5E7EB] rounded-xl px-4 py-3 text-[#0E1B3D] font-bold text-center text-2xl tracking-[0.5em] outline-none focus:border-[#e8631a] transition-colors"
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-[#e8631a] hover:bg-[#d4741a] text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-60">
              {loading ? 'Verifying…' : 'Verify OTP →'}
            </button>
            <button type="button" onClick={() => { setStep('email'); setError(''); }}
              className="w-full text-center text-sm text-[#0E1B3D]/50 hover:text-[#0E1B3D] transition-colors">
              ← Change email
            </button>
          </form>
        )}

        {/* Step 3 – New Password */}
        {step === 'reset' && (
          <form onSubmit={resetPassword} className="space-y-5">
            <div>
              <h2 className="font-extrabold text-xl text-[#0E1B3D]">Set New Password</h2>
              <p className="text-sm text-[#0E1B3D]/50 mt-1">Choose a strong password (min 6 characters).</p>
            </div>
            <Field label="New Password" type="password" name="fp_newpwd" value={newPassword}
              onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
            <Field label="Confirm Password" type="password" name="fp_confirmpwd" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat password" />
            <button type="submit" disabled={loading}
              className="w-full bg-[#e8631a] hover:bg-[#d4741a] text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-60">
              {loading ? 'Resetting…' : 'Reset Password →'}
            </button>
          </form>
        )}

        {/* Done */}
        {step === 'done' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto text-3xl">✓</div>
            <h2 className="font-extrabold text-xl text-[#0E1B3D]">Password Reset!</h2>
            <p className="text-sm text-[#0E1B3D]/50">You can now sign in with your new password.</p>
            <button onClick={onClose}
              className="w-full bg-[#0E1B3D] text-white font-bold py-3.5 rounded-xl transition-all hover:bg-[#1a2d5a]">
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function GlobeLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" className={className}>
      <circle cx="50" cy="50" r="40" fill="url(#goldGrad)" />
      <path d="M 23 20 Q 50 5 77 20" stroke="#0a1628" strokeWidth="8" strokeLinecap="round" />
      <path d="M 12 35 Q 50 15 88 35" stroke="#0a1628" strokeWidth="8" strokeLinecap="round" />
      <path d="M 10 50 Q 50 50 90 50" stroke="#0a1628" strokeWidth="8" strokeLinecap="round" />
      <path d="M 12 65 Q 50 85 88 65" stroke="#0a1628" strokeWidth="8" strokeLinecap="round" />
      <path d="M 23 80 Q 50 95 77 80" stroke="#0a1628" strokeWidth="8" strokeLinecap="round" />
      
      <path d="M 25 18 Q 0 50 25 82" stroke="#0a1628" strokeWidth="8" strokeLinecap="round" />
      <path d="M 40 12 Q 25 50 40 88" stroke="#0a1628" strokeWidth="8" strokeLinecap="round" />
      <path d="M 60 12 Q 75 50 60 88" stroke="#0a1628" strokeWidth="8" strokeLinecap="round" />
      <path d="M 75 18 Q 100 50 75 82" stroke="#0a1628" strokeWidth="8" strokeLinecap="round" />
      <defs>
        <radialGradient id="goldGrad" cx="0.4" cy="0.4" r="0.6">
          <stop offset="0%" stopColor="#ffb38a"/>
          <stop offset="40%" stopColor="#e8631a"/>
          <stop offset="100%" stopColor="#a6420e"/>
        </radialGradient>
      </defs>
    </svg>
  );
}

function BrandPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 flex-col justify-between relative overflow-hidden py-10 px-12" style={{ background: '#0E1B3D' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&display=swap');
        .font-playfair { font-family: 'Playfair Display', serif; }
      `}</style>
      
      <div className="flex-1 flex flex-col justify-between z-10">
        <div className="flex items-center gap-4">
          <GlobeLogo className="w-12 h-12 shrink-0" />
          <div className="flex flex-col">
            <span className="font-bold text-[16px] text-white tracking-widest leading-tight">Global Knowledge Technologies</span>
            <span className="text-[10px] text-white/40 tracking-[0.08em] uppercase">Education · Innovation · Leadership</span>
          </div>
        </div>

        <div className="mt-16 pl-4 lg:pl-12 xl:pl-20 2xl:pl-24">
          <div className="relative">
            <div className="absolute -top-7 -left-1 text-[clamp(72px,9vw,108px)] font-black leading-[0.88] tracking-tight pointer-events-none select-none z-0 opacity-20" 
                 style={{ WebkitTextStroke: '2px rgba(255,255,255,0.2)', color: 'transparent' }}>
              2026
            </div>
            
            <div className="relative z-10 flex flex-col pt-4">
              <h2 className="text-[#e8631a] font-black text-5xl xl:text-6xl tracking-tight leading-tight">
                TechTrek 2026
              </h2>
              <h2 className="text-white font-black text-3xl xl:text-4xl mt-1 tracking-tight leading-tight">
                National <span className="font-bold text-white/50">AI</span>
              </h2>
              <h2 className="text-white font-black text-3xl xl:text-4xl tracking-tight leading-tight">
                Education <span className="text-[#e8631a] text-[0.85em]">Platform</span>
              </h2>
            </div>
          </div>

          <div className="w-12 h-[2px] bg-gradient-to-r from-[#e8631a] to-transparent my-6" />

          <p className="text-[16px] font-light leading-[1.7] text-white/60 max-w-md">
            Access exclusive summits, meet the leaders shaping India&apos;s tech future, and build your career from Day 1.
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#e8631a]/10 border border-[#e8631a]/25 rounded-full mt-8">
            <span className="w-2 h-2 rounded-full bg-[#e8631a] animate-pulse" />
            <span className="text-[12px] font-semibold text-[#e8631a] uppercase tracking-wider">Inaugural Edition — Launching 2026</span>
          </div>

          <div className="mt-8 flex flex-col gap-5">
            {[
              {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="#e8631a" strokeWidth="1.8" className="w-5 h-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                title: 'Bridge the Gap Between Campus & Industry',
                desc: 'Connecting students directly with top industry leaders across India.',
              },
              {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="#d4a843" strokeWidth="1.8" className="w-5 h-5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
                title: 'National AI Education Platform',
                desc: 'Hands-on AI workshops and summits at premier engineering colleges.',
              },
              {
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5 text-white/50"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
                title: 'Be Part of History',
                desc: 'Register now for exclusive early access to the first-ever TechTrek summit.',
              }
            ].map((f, i) => (
              <div key={i} className="flex flex-row items-start gap-4">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  {f.icon}
                </div>
                <div className="flex flex-col">
                  <div className="text-[15px] font-semibold text-white/90 leading-snug">{f.title}</div>
                  <div className="text-[14px] font-light text-white/40 mt-1 leading-snug">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

        </div>
        <div className="flex items-center justify-between mt-12 mb-6 w-full">
          <span className="text-[12px] text-white/20 tracking-wider">© 2026 Global Knowledge Technologies</span>
          <div className="flex items-center gap-2 px-3 py-1.5 border border-[#d4a843]/20 rounded-full text-[#d4a843]/70 text-[11px] tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4a843] animate-pulse"></span> Empowering India&apos;s Next Generation
          </div>
        </div>
      </div>
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/events';

  // ── Validation helpers ───────────────────────────────────────────────────
  const validateSignup = () => {
    const e: Record<string, string> = {};
    if (!signupData.name.trim()) e.name = 'Full name is required.';
    const emailErr = validateEmail(signupData.email);
    if (emailErr) e.email = emailErr;
    const phoneErr = validatePhone(signupData.phone);
    if (phoneErr) e.phone = phoneErr;
    if (!signupData.college.trim()) e.college = 'College name is required.';
    if (!signupData.discipline.trim()) e.discipline = 'Discipline is required.';
    
    const pw = signupData.password;
    if (pw.length < 8) e.password = 'Password must be at least 8 characters.';
    else if (!/(?=.*[A-Z])/.test(pw)) e.password = 'Password must contain at least one capital letter.';
    else if (!/(?=.*\d)/.test(pw)) e.password = 'Password must contain at least one number.';
    else if (!/(?=.*[!@#$%^&*])/.test(pw)) e.password = 'Password must contain at least one special character.';
    
    return e;
  };

  const validateLogin = () => {
    const e: Record<string, string> = {};
    const emailErr = validateEmail(loginData.email);
    if (emailErr) e.email = emailErr;
    if (!loginData.password) e.password = 'Password is required.';
    return e;
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError('');
    const v = validateLogin();
    if (Object.keys(v).length) { setErrors(v); return; }
    setErrors({}); setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      login(data, data.token);
      if (data.role === 'superAdmin') router.push('/superadmin');
      else if (data.role === 'admin') router.push('/admin');
      else router.push(redirect);
    } catch (err: unknown) { setFormError(getErrorMessage(err, 'Login failed')); }
    finally { setLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError('');
    const v = validateSignup();
    if (Object.keys(v).length) { setErrors(v); return; }
    setErrors({}); setLoading(true);
    try {
      const domain = signupData.email.split('@')[1]?.toLowerCase();
      if (!domain) throw new Error('Please enter a valid college email');
      const res = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...signupData, domain }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Signup failed');
      
      setSignupSuccess(true);
      setLoginData({ email: signupData.email, password: '' });
      setTab('login');
      setSignupData({ name: '', email: '', phone: '', college: '', year: '1', discipline: '', password: '' });
      
    } catch (err: unknown) { setFormError(getErrorMessage(err, 'Signup failed')); }
    finally { setLoading(false); }
  };

  const onLoginChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  const onSignupChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setSignupData({ ...signupData, [e.target.name]: e.target.value });

  // Phone: allow only digits, max 10
  const onPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setSignupData(prev => ({ ...prev, phone: val }));
  };

  const FieldErr = ({ name }: { name: string }) =>
    errors[name] ? <span className="text-[11px] text-red-500 font-medium">{errors[name]}</span> : null;

  return (
    <>
      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}

      <div className="w-full h-full flex bg-[#0E1B3D] z-0 relative">
        <BrandPanel />

        {/* Right: Form panel */}
        <div className="lg:w-1/2 flex-1 flex flex-col px-4 sm:px-6 pt-24 pb-16 overflow-y-auto relative w-full bg-[#0E1B3D]">
          <div className={`w-full m-auto bg-[#FAF8F4] rounded-2xl shadow-2xl border border-white/10 p-5 sm:p-8 lg:p-12 relative z-10 transition-all duration-300 ${tab === 'signup' ? 'max-w-2xl' : 'max-w-md'}`}>

            {/* Tab toggle */}
            <div className="flex items-center bg-[#EAE4D9] border border-[#DCD6C8] rounded-xl p-1 mb-6 shadow-inner">
              {(['login', 'signup'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setFormError(''); setErrors({}); }}
                  className={`flex-1 py-1.5 sm:py-2 px-1 text-center rounded-lg text-[11px] sm:text-[13px] font-bold leading-tight transition-all duration-200 ${
                    tab === t
                      ? 'bg-[#0E1B3D] text-[#FAF8F4] shadow-md'
                      : 'text-[#8a7f6e] hover:text-[#0E1B3D]'
                  }`}
                >
                  {t === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            {/* Success banner after signup */}
            {signupSuccess && tab === 'login' && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 mb-5 text-sm font-medium flex items-start gap-2">
                <span className="mt-0.5">✅</span> Account created successfully! Please sign in to continue.
              </div>
            )}

            {/* Error banner */}
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-6 text-sm font-medium flex items-start gap-2">
                <span className="mt-0.5">⚠️</span>{formError}
              </div>
            )}

            {/* ── LOGIN FORM ─────────────────────────────── */}
            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-7">
                <div className="mb-4">
                  <h1 className="font-playfair font-bold text-4xl text-[#0E1B3D]">Welcome back.</h1>
                  <p className="text-[15px] text-[#8a7f6e] mt-2 font-medium">Sign in to access your TechTrek dashboard.</p>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[#0E1B3D]/70 ml-1">College Email</label>
                  <input type="email" name="email" value={loginData.email} onChange={onLoginChange}
                    placeholder="student@college.ac.in" required
                    className="w-full bg-[#F0EBE1] border-2 border-[#E5E7EB]/50 rounded-xl px-4 py-3 text-[#0E1B3D] font-bold placeholder-[#0E1B3D]/30 outline-none focus:border-[#e8631a] transition-colors text-[13px]" />
                  <FieldErr name="email" />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[#0E1B3D]/70">Password</label>
                    <button type="button" onClick={() => setShowForgot(true)}
                      className="text-[11px] text-[#e8631a] font-bold hover:underline">
                      Forgot password?
                    </button>
                  </div>
                  <input type="password" name="password" value={loginData.password} onChange={onLoginChange}
                    placeholder="••••••••" required
                    className="w-full bg-[#F0EBE1] border-2 border-[#E5E7EB]/50 rounded-xl px-4 py-3 text-[#0E1B3D] font-bold placeholder-[#0E1B3D]/30 outline-none focus:border-[#e8631a] transition-colors text-[13px]" />
                  <FieldErr name="password" />
                </div>

                <button type="submit" disabled={loading}
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-[#e8631a] hover:bg-[#c8520e] text-white font-extrabold py-3.5 rounded-xl transition-all shadow-[0_6px_24px_rgba(232,99,26,0.3)] active:translate-y-0 uppercase tracking-widest text-[14px]">
                  {loading ? 'Signing in…' : <>Sign In <svg className="w-5 h-5 ml-1" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 8h10M9 4l4 4-4 4"/></svg></>}
                </button>

                <div className="flex items-center gap-3 my-6">
                  <div className="h-px flex-1 bg-[#0a1628]/10" />
                  <span className="text-[11px] font-medium text-[#8a7f6e] tracking-widest uppercase">or</span>
                  <div className="h-px flex-1 bg-[#0a1628]/10" />
                </div>

                <p className="text-center text-[13.5px] text-[#8a7f6e]">
                  Don&apos;t have an account?{' '}
                  <button type="button" onClick={() => setTab('signup')} className="text-[#e8631a] font-semibold hover:opacity-75 transition-opacity">
                    Create one free
                  </button>
                </p>
              </form>
            )}

            {/* ── SIGNUP FORM ─────────────────────────────── */}
            {tab === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-3">
                <div className="mb-2">
                  <h1 className="font-playfair font-bold text-2xl sm:text-3xl text-[#0E1B3D]">Create account.</h1>
                  <p className="text-[13px] text-[#8a7f6e] mt-1 font-medium">Join thousands of students at TechTrek.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="flex flex-col gap-1.5">
                    <Field label="Full Name" type="text" name="name" value={signupData.name}
                      onChange={onSignupChange} placeholder="Rahul Sharma" />
                    <FieldErr name="name" />
                  </div>

                  {/* College Email */}
                  <div className="flex flex-col gap-1.5">
                    <Field label="College Email" type="email" name="email" value={signupData.email}
                      onChange={onSignupChange} placeholder="student@ksrce.ac.in" />
                    <FieldErr name="email" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Phone */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[#0E1B3D]/70 ml-1">Phone Number</label>
                    <input
                      type="tel" name="phone" value={signupData.phone}
                      inputMode="numeric" maxLength={10}
                      onChange={onPhoneChange}
                      onKeyDown={e => {
                        if (!/[0-9]/.test(e.key) && !['Backspace','Delete','Tab','ArrowLeft','ArrowRight'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      placeholder="9876543210" required
                      className="w-full bg-[#F0EBE1] border-2 border-[#E5E7EB]/50 rounded-xl px-4 py-3 text-[#0E1B3D] font-bold placeholder-[#0E1B3D]/30 outline-none focus:border-[#e8631a] transition-colors text-[13px]"
                    />
                    <FieldErr name="phone" />
                  </div>

                  {/* College autocomplete */}
                  <div className="flex flex-col gap-1.5">
                    <CollegeInput value={signupData.college} onChange={val => setSignupData(p => ({ ...p, college: val }))} />
                    <FieldErr name="college" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Year */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[#0E1B3D]/70 ml-1">Year</label>
                    <select name="year" value={signupData.year} onChange={onSignupChange}
                      className="w-full bg-[#F0EBE1] border-2 border-[#E5E7EB]/50 rounded-xl px-4 py-3 text-[#0E1B3D] font-bold outline-none focus:border-[#e8631a] transition-colors text-[13px]">
                      {['1', '2', '3', '4'].map(y => (
                        <option key={y} value={y}>{y === '1' ? '1st' : y === '2' ? '2nd' : y === '3' ? '3rd' : '4th'} Year</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Discipline */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-widest text-[#0E1B3D]/70 ml-1">Discipline</label>
                    <select name="discipline" value={signupData.discipline} onChange={onSignupChange} required
                      className={`w-full bg-[#F0EBE1] border-2 border-[#E5E7EB]/50 rounded-xl px-4 py-3 font-bold outline-none focus:border-[#e8631a] transition-colors text-[13px] ${!signupData.discipline ? 'text-[#0E1B3D]/40' : 'text-[#0E1B3D]'}`}>
                      <option value="" disabled>Select Discipline</option>
                      <optgroup label="Engineering Students (Core Technical)">
                        <option value="CSE">Computer Science & Engineering (CSE)</option>
                        <option value="IT">Information Technology (IT)</option>
                        <option value="ECE">Electronics & Communication (ECE)</option>
                        <option value="EEE">Electrical & Electronics (EEE)</option>
                        <option value="Mechanical">Mechanical Engineering</option>
                        <option value="Civil">Civil Engineering</option>
                        <option value="AI/ML">Artificial Intelligence & Machine Learning (AI/ML)</option>
                        <option value="Data Science">Data Science</option>
                      </optgroup>
                      <optgroup label="Non-Engineering Students (Business & Arts)">
                        <option value="Commerce">Commerce</option>
                        <option value="BBA">Bachelor of Business Administration (BBA)</option>
                        <option value="BCA">Bachelor of Computer Applications (BCA)</option>
                        <option value="Science">Science</option>
                        <option value="Arts">Arts</option>
                        <option value="Law">Law</option>
                        <option value="Design">Design</option>
                      </optgroup>
                    </select>
                    <FieldErr name="discipline" />
                  </div>
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1.5">
                  <Field label="Password" type="password" name="password" value={signupData.password}
                    onChange={onSignupChange} placeholder="Min 8 chars, 1 capital, 1 number, 1 special" />
                  {signupData.password && (
                    <div className="flex flex-col gap-1 mt-1 text-[10px] sm:text-[11px] bg-[#0E1B3D]/5 p-2.5 rounded-xl border border-[#0E1B3D]/10">
                      <span className={signupData.password.length >= 8 ? "text-emerald-600 font-bold" : "text-[#0E1B3D]/60 font-medium"}>{signupData.password.length >= 8 ? "✓" : "○"} At least 8 characters</span>
                      <span className={/(?=.*[A-Z])/.test(signupData.password) ? "text-emerald-600 font-bold" : "text-[#0E1B3D]/60 font-medium"}>{/(?=.*[A-Z])/.test(signupData.password) ? "✓" : "○"} One uppercase letter</span>
                      <span className={/(?=.*\d)/.test(signupData.password) ? "text-emerald-600 font-bold" : "text-[#0E1B3D]/60 font-medium"}>{/(?=.*\d)/.test(signupData.password) ? "✓" : "○"} One number</span>
                      <span className={/(?=.*[!@#$%^&*])/.test(signupData.password) ? "text-emerald-600 font-bold" : "text-[#0E1B3D]/60 font-medium"}>{/(?=.*[!@#$%^&*])/.test(signupData.password) ? "✓" : "○"} One special character (!@#$%^&*)</span>
                    </div>
                  )}
                  <FieldErr name="password" />
                </div>

                <button type="submit" disabled={loading}
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-[#e8631a] hover:bg-[#c8520e] text-white font-extrabold py-3.5 rounded-xl transition-all shadow-[0_6px_24px_rgba(232,99,26,0.3)] active:translate-y-0 uppercase tracking-widest text-[14px]">
                  {loading ? 'Creating account…' : <>Complete Registration <svg className="w-5 h-5 ml-1" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 8h10M9 4l4 4-4 4"/></svg></>}
                </button>

                <div className="flex items-center gap-3 my-6">
                  <div className="h-px flex-1 bg-[#0a1628]/10" />
                  <span className="text-[11px] font-medium text-[#8a7f6e] tracking-widest uppercase">or</span>
                  <div className="h-px flex-1 bg-[#0a1628]/10" />
                </div>

                <p className="text-center text-[13.5px] text-[#8a7f6e]">
                  Already have an account?{' '}
                  <button type="button" onClick={() => setTab('login')} className="text-[#e8631a] font-semibold hover:opacity-75 transition-opacity">
                    Sign in
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[#0E1B3D] font-bold">Loading…</div>}>
      <AuthForms />
    </Suspense>
  );
}
