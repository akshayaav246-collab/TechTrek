"use client";
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GridIcon, PlusIcon, QrIcon, ListIcon, CheckCircleIcon, AlertIcon, UsersIcon, BuildingIcon, ZapIcon } from '@/components/Icons';

type Result = { message: string; studentName?: string; studentEmail?: string; college?: string; eventName?: string; alreadyCheckedIn?: boolean; isError?: boolean };

export default function AdminCheckInPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  const [processing, setProcessing] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const [manual, setManual] = useState('');
  const scannerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html5QrRef = useRef<any>(null);

  useEffect(() => {
    if (!user || !token) { router.push('/login'); return; }
    if (user.role !== 'admin' && user.role !== 'superAdmin') { router.push('/'); return; }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
    script.onload = () => setScannerReady(true);
    document.head.appendChild(script);
    return () => { try { document.head.removeChild(script); } catch {} };
  }, [user, token, router]);

  useEffect(() => {
    if (!scannerReady || !scannerRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scanner = new (window as any).Html5Qrcode('admin-qr-scanner');
    html5QrRef.current = scanner;
    scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 } },
      async (text: string) => { if (!processing) await processQR(text); }, undefined
    ).catch(console.error);
    return () => { scanner.stop().catch(() => {}); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerReady]);

  const processQR = async (raw: string) => {
    setProcessing(true); setResult(null);
    try {
      const res = await fetch('http://localhost:5000/api/checkin', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ qrPayload: raw })
      });
      const data = await res.json();
      setResult({ ...data, isError: !res.ok });
    } catch { setResult({ message: 'Network error.', isError: true }); }
    finally { setProcessing(false); }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'superAdmin')) return null;

  const resultBg = !result ? '' : result.alreadyCheckedIn ? 'bg-amber-50 border-amber-300' : result.isError ? 'bg-red-50 border-red-300' : 'bg-emerald-50 border-emerald-300';
  const ResultIcon = !result ? null : result.alreadyCheckedIn ? AlertIcon : result.isError ? AlertIcon : CheckCircleIcon;
  const resultIconCls = !result ? '' : result.alreadyCheckedIn ? 'text-amber-500' : result.isError ? 'text-red-500' : 'text-emerald-500';

  return (
    <div className="min-h-screen bg-[#F5F5F0] flex font-body">
      {/* Sidebar */}
      <aside className="w-60 bg-[#0E1B3D] text-white flex flex-col py-8 px-5 shrink-0">
        <div className="mb-10">
          <p className="text-[#e8631a] text-[10px] font-bold uppercase tracking-widest">TechTrek</p>
          <p className="text-white font-heading font-extrabold text-lg mt-1">GKT Command<br/>Center</p>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {[
            { href: '/admin', label: 'Dashboard', Icon: GridIcon },
            { href: '/admin/create-event', label: 'Create Event', Icon: PlusIcon },
            { href: '/admin/checkin', label: 'QR Check-In', Icon: QrIcon, active: true },
            { href: '/admin/events', label: 'All Events', Icon: ListIcon },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${item.active ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}>
              <item.Icon className="w-4 h-4" />{item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <span className="inline-block bg-[#e8631a]/15 text-[#e8631a] text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3">Scan Mode</span>
            <h1 className="font-heading font-extrabold text-3xl text-[#0E1B3D]">QR Check-In</h1>
            <p className="text-gray-400 text-sm mt-1">Point camera at participant&apos;s QR code</p>
          </div>

          {/* Scanner */}
          <div className="bg-[#0E1B3D] rounded-3xl p-4 mb-5 overflow-hidden shadow-xl">
            <div id="admin-qr-scanner" ref={scannerRef} className="w-full rounded-2xl overflow-hidden" style={{ minHeight: '280px' }}></div>
            {!scannerReady && (<div className="flex items-center justify-center h-64 text-white/50 font-bold animate-pulse text-sm">Initializing camera…</div>)}
          </div>

          {/* Processing */}
          {processing && <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-5 text-center text-[#0E1B3D] font-bold text-sm animate-pulse">Verifying QR code…</div>}

          {/* Result */}
          {result && !processing && (
            <div className={`border-2 rounded-2xl p-5 mb-5 ${resultBg}`}>
              <div className="flex items-start gap-3">
                {ResultIcon && <ResultIcon className={`w-6 h-6 shrink-0 mt-0.5 ${resultIconCls}`} />}
                <div>
                  <p className="font-bold text-[#0E1B3D] text-base">{result.message}</p>
                  {result.studentName && (
                    <div className="mt-2 space-y-0.5">
                      <p className="text-sm font-bold text-[#0E1B3D]/80 flex items-center gap-1.5"><UsersIcon className="w-3.5 h-3.5" /> {result.studentName}</p>
                      {result.college && <p className="text-xs text-[#0E1B3D]/60 flex items-center gap-1.5"><BuildingIcon className="w-3 h-3" /> {result.college}</p>}
                      {result.eventName && <p className="text-xs text-[#0E1B3D]/60 flex items-center gap-1.5"><ZapIcon className="w-3 h-3" /> {result.eventName}</p>}
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => { setResult(null); setManual(''); }} className="mt-3 w-full text-xs font-bold text-[#0E1B3D]/40 hover:text-[#0E1B3D] transition-colors text-center">
                Scan Next →
              </button>
            </div>
          )}

          {/* Manual fallback */}
          <details className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <summary className="px-5 py-3.5 text-sm font-bold text-gray-500 cursor-pointer hover:text-gray-700 flex items-center gap-2"><ZapIcon className="w-3.5 h-3.5" /> Manual QR Entry</summary>
            <div className="p-5 pt-0">
              <textarea value={manual} onChange={e => setManual(e.target.value)} rows={3}
                placeholder='Paste QR JSON payload here…'
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-xs font-mono text-gray-700 outline-none focus:border-[#e8631a] resize-none mb-3"/>
              <button onClick={() => processQR(manual.trim())} disabled={!manual.trim()}
                className="w-full bg-[#0E1B3D] text-white font-bold py-2.5 rounded-xl text-sm hover:bg-[#1a2d5a] transition-colors disabled:opacity-40">
                Submit
              </button>
            </div>
          </details>
        </div>
      </main>
    </div>
  );
}
