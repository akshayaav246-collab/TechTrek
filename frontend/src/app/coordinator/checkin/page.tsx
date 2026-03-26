"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

type CheckInResult = {
  message: string;
  studentName?: string;
  studentEmail?: string;
  college?: string;
  eventName?: string;
  alreadyCheckedIn?: boolean;
  isError?: boolean;
};

export default function CheckInPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [scannerReady, setScannerReady] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const scannerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html5QrRef = useRef<any>(null);

  // Auth guard
  useEffect(() => {
    if (!user || !token) { router.push('/login?redirect=/coordinator/checkin'); }
  }, [user, token, router]);

  // Load html5-qrcode dynamically
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
    script.onload = () => setScannerReady(true);
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  // Start scanner once library is ready
  useEffect(() => {
    if (!scannerReady || !scannerRef.current) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const scanner = new w.Html5Qrcode('qr-scanner-element');
    html5QrRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 260, height: 260 } },
      async (decodedText: string) => {
        if (processing) return;
        await processQR(decodedText);
      },
      undefined
    ).catch(console.error);

    return () => {
      scanner.stop().catch(() => {});
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerReady]);

  const processQR = async (rawText: string) => {
    setProcessing(true);
    setResult(null);
    try {
      const res = await fetch('http://localhost:5000/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ qrPayload: rawText })
      });
      const data = await res.json();
      setResult({ ...data, isError: !res.ok });
    } catch {
      setResult({ message: 'Network error. Check connection.', isError: true });
    } finally {
      setProcessing(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) await processQR(manualInput.trim());
  };

  const resultColor = () => {
    if (!result) return '';
    if (result.alreadyCheckedIn) return 'bg-amber-50 border-amber-300';
    if (result.isError) return 'bg-red-50 border-red-300';
    return 'bg-emerald-50 border-emerald-300';
  };

  const resultIcon = () => {
    if (!result) return '';
    if (result.alreadyCheckedIn) return '⚠️';
    if (result.isError) return '⛔';
    return '✅';
  };

  return (
    <div className="min-h-screen bg-[#0E1B3D] flex flex-col items-center justify-start pt-10 pb-16 px-4 font-body">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[#E8831A]/20 border border-[#E8831A]/30 rounded-full px-4 py-2 mb-4">
            <span className="text-[#E8831A] font-bold text-xs uppercase tracking-widest">Coordinator Panel</span>
          </div>
          <h1 className="font-heading font-extrabold text-3xl text-white">QR Check-In Scanner</h1>
          <p className="text-white/50 text-sm mt-2">Point camera at student&apos;s QR code to check them in</p>
        </div>

        {/* Scanner */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-4 mb-6 overflow-hidden">
          <div id="qr-scanner-element" ref={scannerRef} className="w-full rounded-2xl overflow-hidden" style={{ minHeight: '300px' }}></div>
          {!scannerReady && (
            <div className="flex items-center justify-center h-64 text-white/50 font-bold animate-pulse">Loading Camera…</div>
          )}
        </div>

        {/* Result */}
        {processing && (
          <div className="bg-white/10 border border-white/20 rounded-2xl p-5 mb-6 text-center text-white font-bold animate-pulse">
            Processing scan…
          </div>
        )}

        {result && !processing && (
          <div className={`border-2 rounded-2xl p-5 mb-6 ${resultColor()}`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{resultIcon()}</span>
              <div className="flex-1">
                <p className="font-bold text-[#0E1B3D] text-base">{result.message}</p>
                {result.studentName && (
                  <div className="mt-3 space-y-1">
                    <p className="text-sm font-bold text-[#0E1B3D]/80">👤 {result.studentName}</p>
                    {result.studentEmail && <p className="text-xs text-[#0E1B3D]/60">{result.studentEmail}</p>}
                    {result.college && <p className="text-xs text-[#0E1B3D]/60">🏛️ {result.college}</p>}
                    {result.eventName && <p className="text-xs text-[#0E1B3D]/60">🎤 {result.eventName}</p>}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => { setResult(null); setManualInput(''); }}
              className="mt-4 w-full text-center text-xs font-bold text-[#0E1B3D]/50 hover:text-[#0E1B3D] transition-colors"
            >
              Scan Next →
            </button>
          </div>
        )}

        {/* Manual input fallback */}
        <details className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <summary className="px-5 py-4 text-white/60 text-sm font-bold cursor-pointer hover:text-white transition-colors">
            📋 Manual Entry (paste QR data)
          </summary>
          <form onSubmit={handleManualSubmit} className="p-5 pt-0">
            <textarea
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              placeholder='{"userId":"...","eventId":"...","registrationId":"...","secureHash":"..."}'
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-xs font-mono placeholder-white/30 outline-none focus:border-[#E8831A] transition-colors resize-none mb-3"
              rows={4}
            />
            <button type="submit" className="w-full bg-[#E8831A] text-white font-bold py-3 rounded-xl hover:bg-[#d4741a] transition-colors">
              Submit
            </button>
          </form>
        </details>
      </div>
    </div>
  );
}
