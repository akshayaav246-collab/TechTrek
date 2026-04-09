'use client';

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type MutableRefObject } from 'react';
import { useRouter } from 'next/navigation';
import { DaySelectionModal } from '@/components/events/DaySelectionModal';
import { useAuth } from '@/context/AuthContext';
import type { HallLayoutData, SeatStatus } from '@/components/VenueMap';
import dynamic from 'next/dynamic';
const VenueMap = dynamic(() => import('@/components/VenueMap'), { ssr: false });
import { SeatIcon, XIcon, CheckCircleIcon, ClockIcon, CreditCardIcon } from '@/components/Icons';

type AgendaItem = { _id?: string; time: string; title: string; duration: string; speaker?: string };
type DaySchedule = { day: number; label?: string; date?: string; agenda: AgendaItem[] };
type SpeakerItem = {
  _id?: string;
  id?: string;
  name: string;
  role: string;
  company?: string;
  bio: string;
  tags?: string[];
};
type MappedSpeaker = {
  id: string;
  name: string;
  role: string;
  bio: string;
  tags: string[];
  initials: string;
  sessionTimes: string[];
};

// Extended status to match new backend flow
type RegistrationStatus = 'IDLE' | 'REGISTERED' | 'WAITLISTED' | 'PENDING_PAYMENT' | 'ERROR';

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatEventDates(dateTime?: string, endDateTime?: string) {
  if (!dateTime) return 'Dates to be announced';
  const start = new Date(dateTime);
  const startLabel = start.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  if (!endDateTime) {
    return start.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  const end = new Date(endDateTime);
  const endLabel = end.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startLabel}-${endLabel}`;
}

function padTimeUnit(value: number) {
  return String(Math.max(0, value)).padStart(2, '0');
}

function getTimeLeft(targetDate?: string) {
  if (!targetDate) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const diff = Math.max(0, new Date(targetDate).getTime() - Date.now());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

const loadRazorpay = () =>
  new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

function Countdown({ expiresAt, onExpired }: { expiresAt: string; onExpired?: () => void }) {
  const [seconds, setSeconds] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds(() => {
        const nextSeconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
        if (nextSeconds <= 0) {
          clearInterval(id);
          onExpired?.();
        }
        return nextSeconds;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpired]);
  const m = Math.floor(seconds / 60), s = seconds % 60;
  return <span className="font-mono font-bold text-amber-700">{m}:{String(s).padStart(2, '0')}</span>;
}

function AgendaTimeline({
  items,
  speakers,
  activeSlot,
  slotRefs,
}: {
  items: AgendaItem[];
  speakers: Array<{ id: string; name: string; initials: string }>;
  activeSlot: number | null;
  slotRefs: MutableRefObject<Array<HTMLDivElement | null>>;
}) {
  return (
    <div className="flex flex-col gap-10 pl-6 border-l-[3px] border-[#0E1B3D]/10 ml-2 md:ml-4 py-4">
      {items.map((item, i) => {
        const linkedSpeaker = speakers.find(s => s.name.toLowerCase() === item.speaker?.toLowerCase());
        const isActive = activeSlot === i;
        return (
          <div
            key={`${item._id ?? item.time}-${item.title}-${i}`}
            className="relative pl-8 md:pl-10 group"
            ref={node => { slotRefs.current[i] = node; }}
          >
            <div className={`absolute -left-[45px] md:-left-[53px] top-1 w-6 h-6 rounded-full transition-colors ring-[6px] ring-[#F9F8F6] flex items-center justify-center ${isActive ? 'bg-[#e8631a]' : 'bg-[#0E1B3D]/10'}`}>
              <div className="w-2 h-2 bg-[#F9F8F6] rounded-full" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-5 mb-3">
              <span className="font-bold text-[#e8631a] text-2xl tracking-tight">{item.time}</span>
              <span className="text-xs font-bold text-[#0E1B3D]/50 uppercase bg-[#0E1B3D]/5 px-3 py-1.5 rounded-lg border border-[#0E1B3D]/5 w-fit tracking-wider">
                {item.duration}
              </span>
            </div>
            <h4 className="text-2xl md:text-3xl font-bold text-[#0E1B3D] mb-4 leading-snug">{item.title}</h4>
            {linkedSpeaker && (
              <div className="flex items-center gap-4 mt-5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e8631a] to-[#3a63b8] flex items-center justify-center text-white text-sm font-bold shadow-inner">
                  {linkedSpeaker.initials}
                </div>
                <div className="text-sm font-bold text-[#0E1B3D] bg-white border border-[#0E1B3D]/5 px-5 py-2.5 rounded-xl shadow-sm">
                  Led by: <span className="text-[#0E1B3D]/60 ml-1">{linkedSpeaker.name}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function SummitAgenda({
  agenda,
  days,
  speakers: speakerInput,
  eventId,
  eventName,
  venue,
  dateTime,
  endDateTime,
  amount = 500,
  status,
  hallLayout,
}: {
  agenda: AgendaItem[];
  days: DaySchedule[];
  speakers: SpeakerItem[];
  eventId: string;
  eventName: string;
  venue: string;
  dateTime: string;
  endDateTime?: string;
  amount?: number;
  status: string;
  hallLayout?: HallLayoutData | null;
}) {
  const router = useRouter();
  const { user, token } = useAuth();
  const isMultiDay = Array.isArray(days) && days.length > 0;
  const isStaff = user?.role === 'admin' || user?.role === 'superAdmin';
  const [activeDay, setActiveDay] = useState(isMultiDay ? days[0].day : 0);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [hoveredSpeakerId, setHoveredSpeakerId] = useState<string | null>(null);
  const [showDayModal, setShowDayModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [regStatus, setRegStatus] = useState<RegistrationStatus>('IDLE');
  const [errorMsg, setErrorMsg] = useState('');
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [showSpotlightBg, setShowSpotlightBg] = useState(false);
  const [showSeatModal, setShowSeatModal] = useState(false);
  
  useEffect(() => {
    if (showSeatModal || showDayModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showSeatModal, showDayModal]);
  const [seatStatuses, setSeatStatuses] = useState<SeatStatus[]>([]);
  const [mySeat, setMySeat] = useState<SeatStatus | null>(null);
  const [seatLoading, setSeatLoading] = useState(false);
  const [seatMsg, setSeatMsg] = useState('');

  const sectionRef = useRef<HTMLDivElement | null>(null);
  const agendaScrollRef = useRef<HTMLDivElement | null>(null);
  const slotRefs = useRef<Array<HTMLDivElement | null>>([]);
  const lastSpeakerRef = useRef<MappedSpeaker | null>(null);

  const activeDayData = isMultiDay ? (days.find(d => d.day === activeDay) ?? days[0]) : null;
  const currentAgenda = activeDayData?.agenda ?? agenda;

  const speakers = useMemo<MappedSpeaker[]>(() => {
    const mapped = (speakerInput || []).map(s => ({
      id: s._id || s.id || s.name.toLowerCase(),
      name: s.name,
      role: s.company ? `${s.role}, ${s.company}` : s.role,
      bio: s.bio,
      tags: s.tags?.length ? s.tags : [],
      initials: getInitials(s.name),
      sessionTimes: [] as string[],
    }));
    currentAgenda.forEach(item => {
      const match = mapped.find(s => s.name.toLowerCase() === item.speaker?.toLowerCase());
      if (match) match.sessionTimes.push(item.time);
    });
    return mapped;
  }, [currentAgenda, speakerInput]);

  const slots = useMemo(
    () => currentAgenda.map(item => {
      const match = speakers.find(s => s.name.toLowerCase() === item.speaker?.toLowerCase());
      return {
        type: match ? ('speaker' as const) : ('nosp' as const),
        time: item.time,
        dur: item.duration,
        title: item.title,
        speakerId: match?.id,
      };
    }),
    [currentAgenda, speakers]
  );

  const activeSlotData = activeSlot !== null ? slots[activeSlot] ?? null : null;
  const agendaSpeaker: MappedSpeaker | null =
    activeSlotData?.type === 'speaker'
      ? speakers.find(s => s.id === activeSlotData.speakerId) ?? null
      : null;
  const hoveredSpeaker = hoveredSpeakerId ? speakers.find(s => s.id === hoveredSpeakerId) ?? null : null;
  const activeSpeaker = hoveredSpeaker ?? agendaSpeaker;

  if (activeSpeaker) lastSpeakerRef.current = activeSpeaker;
  const speakerToRender: MappedSpeaker | null = activeSpeaker ?? lastSpeakerRef.current;

  useEffect(() => {
    if (activeSpeaker) {
      setShowSpotlightBg(true);
    } else {
      const t = setTimeout(() => setShowSpotlightBg(false), 250);
      return () => clearTimeout(t);
    }
  }, [activeSpeaker]);

  // ── On mount: check existing registration status ────────────────────────────
  useEffect(() => {
    if (!user || !token) return;
    fetch(`http://localhost:5000/api/registrations/check/${eventId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.isRegistered) {
          setRegStatus(data.status as RegistrationStatus);
          // If pending payment, open the seat modal so they can continue
          if (data.status === 'PENDING_PAYMENT' && hallLayout) {
            openSeatModal();
          }
        }
      })
      .catch(() => {});
  }, [eventId, token, user]);

  // ── Handle seat hold expiry: cleanup on backend + reset UI ─────────────────
  const handleSeatHoldExpired = async () => {
    if (!token) return;
    try {
      await fetch('http://localhost:5000/api/registrations/cleanup-expired', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventId }),
      });
    } catch { /* silent */ }
    setRegStatus('IDLE');
    setMySeat(null);
    setSeatMsg('Your seat hold expired. Please register again to select a seat.');
    // Keep modal open so user sees the message, then close after 3s
    setTimeout(() => {
      setShowSeatModal(false);
      setSeatMsg('');
    }, 3000);
  };

  useEffect(() => {
    setTimeLeft(getTimeLeft(dateTime));
    const id = window.setInterval(() => setTimeLeft(getTimeLeft(dateTime)), 1000);
    return () => window.clearInterval(id);
  }, [dateTime]);

  useEffect(() => {
    setActiveSlot(null);
    setHoveredSpeakerId(null);
    slotRefs.current = [];
  }, [activeDay, agenda, days]);

  // ── Scroll interception ─────────────────────────────────────────────────────
  useEffect(() => {
    const agendaNode = agendaScrollRef.current;
    const sectionNode = sectionRef.current;
    if (!agendaNode || !sectionNode) return;

    const lockY = Math.round(
      sectionNode.getBoundingClientRect().top + window.scrollY
    );

    const intercepting = { current: false };

    const handleWheel = (e: WheelEvent) => {
      const scrollingDown = e.deltaY > 0;
      const maxScrollTop = agendaNode.scrollHeight - agendaNode.clientHeight;
      if (maxScrollTop <= 0) return;

      const atBottom = agendaNode.scrollTop >= maxScrollTop - 1;
      const atTop = agendaNode.scrollTop <= 1;
      const currentY = window.scrollY;

      if (scrollingDown) {
        if (currentY >= lockY && !atBottom) {
          intercepting.current = true;
          e.preventDefault();
          e.stopPropagation();
          agendaNode.scrollTop += e.deltaY;
          return;
        }
        intercepting.current = false;
      } else {
        if (intercepting.current && !atTop) {
          e.preventDefault();
          e.stopPropagation();
          agendaNode.scrollTop += e.deltaY;
          return;
        }
        if (atTop) {
          intercepting.current = false;
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });

    return () => {
      window.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }, []);
  // ───────────────────────────────────────────────────────────────────────────

  const handleAgendaMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const pointerY = e.clientY;
    if (hoveredSpeakerId !== null) setHoveredSpeakerId(null);
    for (let i = 0; i < slotRefs.current.length; i++) {
      const node = slotRefs.current[i];
      if (!node) continue;
      const rect = node.getBoundingClientRect();
      if (pointerY >= rect.top - 12 && pointerY <= rect.bottom + 12) {
        if (activeSlot !== i) setActiveSlot(i);
        return;
      }
    }
    if (activeSlot !== null) setActiveSlot(null);
  };

  // ── Register ────────────────────────────────────────────────────────────────
  const handleRegister = async (chosenDays?: number[]) => {
    if (!user || !token) {
      router.push(`/login?redirect=/events/${eventId}`);
      return;
    }
    setLoading(true);
    setErrorMsg('');
    setShowDayModal(false);
    try {
      const body: Record<string, unknown> = { eventId };
      if (isMultiDay && chosenDays?.length) body.selectedDays = chosenDays;
      const res = await fetch('http://localhost:5000/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const message = data.message || 'Registration failed.';
        if (message.toLowerCase().includes('already registered') || data.status === 'REGISTERED') {
          setRegStatus('REGISTERED');
          return;
        }
        if (message.toLowerCase().includes('pending') || data.status === 'PENDING_PAYMENT') {
          setRegStatus('PENDING_PAYMENT');
          if (hallLayout) openSeatModal();
          return;
        }
        if (message.toLowerCase().includes('waitlist')) { setRegStatus('WAITLISTED'); return; }
        setRegStatus('ERROR');
        setErrorMsg(message);
        return;
      }
      if (data.isWaitlisted) {
        setRegStatus('WAITLISTED');
      } else if (data.isPendingPayment || data.status === 'PENDING_PAYMENT') {
        setRegStatus('PENDING_PAYMENT');
        if (hallLayout) openSeatModal();
      } else {
        setRegStatus('REGISTERED');
      }
      router.refresh();
    } catch {
      setRegStatus('ERROR');
      setErrorMsg('Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSeats = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/seats/${eventId}`);
      const data: SeatStatus[] = await res.json();
      setSeatStatuses(data);
      if (user) {
        const mine = data.find(s => s.userId === user._id);
        setMySeat(mine || null);
      }
    } catch { /* silent */ }
  };

  const openSeatModal = () => {
    fetchSeats();
    setShowSeatModal(true);
  };

  const holdSeat = async (seatId: string) => {
    if (!token) return;

    if (mySeat) {
      if (mySeat.status === 'confirmed') {
        setSeatMsg(`Seat ${mySeat.seatId} is confirmed. You cannot select another seat.`);
        return;
      }
      if (mySeat.status === 'temp_hold') {
        setSeatMsg(`Seat ${mySeat.seatId} is on hold. Confirm or release it first.`);
        return;
      }
    }

    setSeatLoading(true); setSeatMsg('');
    try {
      const res = await fetch('http://localhost:5000/api/seats/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventId, seatId }),
      });
      const data = await res.json();
      if (!res.ok) { setSeatMsg(data.message); } else {
        setMySeat(data); fetchSeats(); setSeatMsg('');
      }
    } catch { setSeatMsg('Network error'); }
    finally { setSeatLoading(false); }
  };

  const confirmSeat = async () => {
    if (!mySeat || !token) return;

    setSeatLoading(true); setSeatMsg('');
    const PaymentAmount = amount || 500;

    if (process.env.NEXT_PUBLIC_PAYMENT_MODE === 'development') {
      try {
        const verifyRes = await fetch('http://localhost:5000/api/payments/verify-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            razorpay_order_id: 'mock_order_dev_' + Date.now(),
            razorpay_payment_id: 'mock_payment_dev_' + Date.now(),
            razorpay_signature: 'mock_signature_dev_mode',
            eventId,
            seatId: mySeat.seatId
          })
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) {
          setSeatMsg('Mock payment failed. ' + (verifyData.message || ''));
        } else {
          setMySeat({ ...verifyData.booking });
          fetchSeats();
          setSeatMsg('Mock payment successful! Your seat and registration are confirmed.');
          setRegStatus('REGISTERED');
          router.refresh();
        }
      } catch (err) {
        setSeatMsg('Network error validating mock payment.');
      }
      setSeatLoading(false);
      return;
    }

    try {
      // 1. Load Razorpay
      const resRazorpay = await loadRazorpay();
      if (!resRazorpay) {
        setSeatMsg('Failed to load payment gateway. Please check your connection.');
        setSeatLoading(false);
        return;
      }

      // 2. Create Order on Backend
      const orderRes = await fetch('http://localhost:5000/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ amount: PaymentAmount, eventId })
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        console.error('Razorpay order creation failed backend returned:', orderData);
        setSeatMsg(orderData.message || 'Payment initiation failed');
        setSeatLoading(false);
        return;
      }

      // 3. Launch Razorpay Checkout
      const options = {
        key: 'rzp_test_SYcRxORTI39Lek',
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'TechTrek Events',
        description: `Secure Seat ${mySeat.seatId} for ${eventName}`,
        order_id: orderData.id,
        handler: async function (response: any) {
          setSeatMsg('Verifying payment…');
          // 4. Verify signature & confirm seat on backend
          const verifyRes = await fetch('http://localhost:5000/api/payments/verify-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              eventId,
              seatId: mySeat.seatId
            })
          });

          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) {
            setSeatMsg('Payment validation failed. Please contact support.');
            setSeatLoading(false);
          } else {
            // Payment done → registration is now REGISTERED
            setMySeat({ ...verifyData.booking });
            fetchSeats();
            setSeatMsg('Payment successful! Your seat and registration are confirmed.');
            setRegStatus('REGISTERED');
            setSeatLoading(false);
            router.refresh();
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
          contact: user?.phone
        },
        theme: {
          color: '#e8631a'
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setSeatMsg(`Payment failed: ${response.error.description}`);
        setSeatLoading(false);
      });
      rzp.open();

    } catch {
      setSeatMsg('Network error connecting to payment gateway.');
      setSeatLoading(false);
    }
  };

  const releaseSeat = async () => {
    if (!mySeat || !token) return;
    setSeatLoading(true); setSeatMsg('');
    try {
      const res = await fetch('http://localhost:5000/api/seats/release', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ eventId, seatId: mySeat.seatId }),
      });
      if (res.ok) { setMySeat(null); fetchSeats(); setSeatMsg('Seat released. Choose another seat or close to cancel registration.'); }
    } catch { setSeatMsg('Network error'); }
    finally { setSeatLoading(false); }
  };

  const handleRegisterClick = () => {
    if (!user || !token) { router.push(`/login?redirect=/events/${eventId}`); return; }
    if (isMultiDay) { setShowDayModal(true); return; }
    handleRegister();
  };

  const renderSpotlightContent = (speaker: MappedSpeaker | null) => {
    if (!speaker) return null;
    return (
      <div className="pt-12">
        <div>
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#e8631a] to-[#3a63b8] border border-[#0E1B3D]/10 flex items-center justify-center text-2xl font-bold text-white shadow-[0_18px_40px_rgba(24,38,69,0.14)]">
            {speaker.initials}
          </div>
        </div>
        <div className="mt-6">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#0E1B3D]/45">Speaker Spotlight</p>
          <h3 className="mt-3 text-3xl font-bold text-[#0E1B3D]">{speaker.name}</h3>
          <p className="mt-2 text-[#0E1B3D]/68">{speaker.role}</p>
        </div>
        <p className="mt-6 leading-7 text-[#0E1B3D]/74">{speaker.bio}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {speaker.tags.map(tag => (
            <span key={tag} className="rounded-full border border-[#0E1B3D]/10 bg-white/70 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#0E1B3D]/76">
              {tag}
            </span>
          ))}
        </div>
      </div>
    );
  };

  // Derive register button state
  const isPendingPayment = regStatus === 'PENDING_PAYMENT';
  const isRegistered = regStatus === 'REGISTERED';
  const isWaitlisted = regStatus === 'WAITLISTED';

  return (
    <>
      <div id="summit-agenda" ref={sectionRef} className="w-full">
        <h2 className="text-lg md:text-xl font-bold uppercase tracking-[0.2em] text-[#e8631a] mb-6 flex items-center gap-4">
          <span className="w-8 h-px bg-[#e8631a]" /> Summit Agenda
        </h2>

        {isMultiDay && activeDayData && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {days.map(day => (
              <button
                key={day.day}
                onClick={() => setActiveDay(day.day)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${
                  activeDay === day.day
                    ? 'bg-[#0E1B3D] text-white border-[#0E1B3D] shadow-lg'
                    : 'bg-white text-[#0E1B3D]/60 border-[#0E1B3D]/10 hover:border-[#e8631a] hover:text-[#e8631a]'
                }`}
              >
                {day.label ?? `Day ${day.day}`}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:gap-12">
          <div
            ref={agendaScrollRef}
            className="min-h-[720px] max-h-[720px] overflow-y-auto no-scrollbar px-6 py-6 md:px-8 md:py-8"
            onMouseMove={handleAgendaMouseMove}
            onMouseLeave={() => {
              setActiveSlot(null);
              setHoveredSpeakerId(null);
            }}
          >
            <AgendaTimeline
              items={currentAgenda}
              speakers={speakers}
              activeSlot={activeSlot}
              slotRefs={slotRefs}
            />
          </div>

          <div
            className="relative min-h-[720px] max-h-[720px] overflow-hidden px-6 py-6 md:px-8 md:py-8"
            style={{
              background: showSpotlightBg ? 'rgba(232,99,26,0.03)' : 'transparent',
              transition: 'background 0.25s ease',
            }}
            onMouseLeave={() => setHoveredSpeakerId(null)}
          >
            <div
              className="absolute inset-0 overflow-y-auto no-scrollbar px-6 py-6 md:px-8 md:py-8 transition-opacity duration-[250ms] ease"
              style={{ opacity: activeSpeaker ? 0 : 1, pointerEvents: activeSpeaker ? 'none' : 'auto' }}
            >
              <div className="min-h-full">
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#0E1B3D]/42">Event Speakers</p>
                <div className="mt-6 space-y-4">
                  {speakers.map(speaker => (
                    <div
                      key={speaker.id}
                      className="rounded-[1.5rem] border border-[#0E1B3D]/8 bg-white/55 px-4 py-4 transition-colors duration-200 hover:bg-white/80"
                      onMouseEnter={() => setHoveredSpeakerId(speaker.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#e8631a] to-[#3a63b8] flex items-center justify-center text-lg font-bold text-white shadow-[0_10px_24px_rgba(24,38,69,0.16)]">
                          {speaker.initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xl font-bold leading-tight text-[#0E1B3D]">{speaker.name}</p>
                          <p className="mt-1 text-sm text-[#0E1B3D]/56">{speaker.role}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {speaker.sessionTimes.map(t => (
                              <span key={`${speaker.id}-${t}`} className="rounded-full bg-[#e8631a] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div
              className="absolute inset-0 overflow-y-auto no-scrollbar px-6 py-6 md:px-8 md:py-8 transition-opacity duration-[250ms] ease"
              style={{ opacity: activeSpeaker ? 1 : 0, pointerEvents: activeSpeaker ? 'auto' : 'none' }}
            >
              <div className="relative min-h-full">
                <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#e8631a]/10 blur-3xl" />
                {renderSpotlightContent(speakerToRender)}
              </div>
            </div>
          </div>
        </div>

        {status !== 'COMPLETED' && (
          <div id="register-section" className="mt-6 overflow-hidden rounded-[2rem] border border-[#0E1B3D]/8 shadow-[0_18px_50px_rgba(14,27,61,0.08)]">
            <div className="relative overflow-hidden bg-[#182645] px-6 py-6 md:px-8 md:py-7">
              <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#e8631a]/12 animate-[registerOrbA_3.2s_ease-in-out_infinite]" />
              <div className="pointer-events-none absolute -right-2 -top-6 h-44 w-44 rounded-full bg-[#e8631a]/16 animate-[registerOrbB_3.2s_ease-in-out_infinite_0.3s]" />
              <div className="pointer-events-none absolute right-10 top-10 h-28 w-28 rounded-full border border-[#e8631a]/18 bg-[#e8631a]/8 animate-[registerOrbC_3.2s_ease-in-out_infinite_0.15s]" />

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-white text-[20px] font-bold">Seen enough? Grab your seat.</h3>
                  <p className="text-sm text-white/45 mt-2">
                    {eventName} · {venue} · {formatEventDates(dateTime, endDateTime)}
                  </p>
                </div>
                <div className="shrink-0 rounded-full bg-[#e8631a] px-4 py-2 text-xs font-bold text-white shadow-[0_8px_24px_rgba(232,99,26,0.28)] animate-[registerBadge_1.9s_ease-in-out_infinite]">
                  {timeLeft.days} day{timeLeft.days !== 1 ? 's' : ''} left
                </div>
              </div>

              <div className="relative z-10 mt-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-2 md:gap-3">
                  {[
                    { value: padTimeUnit(timeLeft.days), label: 'DAYS' },
                    { value: padTimeUnit(timeLeft.hours), label: 'HRS' },
                    { value: padTimeUnit(timeLeft.minutes), label: 'MIN' },
                    { value: padTimeUnit(timeLeft.seconds), label: 'SEC' },
                  ].map((unit, index) => (
                    <div key={unit.label} className="flex items-center gap-2 md:gap-3">
                      <div className="min-w-[58px] rounded-2xl border border-white/10 bg-white/6 px-3 py-3 text-center shadow-inner">
                        <span className="block text-[28px] font-black leading-none tracking-[-0.06em] text-white">{unit.value}</span>
                        <span className="mt-1 block text-[10px] font-bold tracking-[0.16em] text-white/35">{unit.label}</span>
                      </div>
                      {index < 3 && <span className="pb-3 text-xl font-light text-white/20">:</span>}
                    </div>
                  ))}
                </div>

                <div className="relative isolate shrink-0 self-start rounded-[1.15rem] bg-[#e8631a] px-6 py-4 text-center shadow-[0_16px_34px_rgba(232,99,26,0.28)] animate-[registerPricePop_0.65s_cubic-bezier(.34,1.56,.64,1)_both]">
                  <div className="absolute -left-2 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-[#182645]" />
                  <p className="text-[36px] font-black leading-none tracking-[-0.08em] text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.18)]">
                    ₹{amount}
                  </p>
                </div>
              </div>

              <div className="relative z-10 mt-6 border-t border-white/8 pt-6" />

              {isStaff ? (
                <div className="relative z-10 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <p className="text-sm font-bold text-white">Admin view</p>
                  <p className="mt-1 text-xs text-white/50">Registration is only available for student accounts.</p>
                </div>
              ) : (
                <>
                  {/* ── Main Register / Status Button ── */}
                  {!isRegistered && (
                    <button
                      onClick={handleRegisterClick}
                      disabled={loading || isPendingPayment}
                      className={`group relative z-10 inline-flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border px-5 py-4 text-base font-extrabold uppercase tracking-[0.08em] text-white shadow-[0_4px_15px_rgba(232,99,26,0.4)] transition-all duration-300 ${
                        loading || isPendingPayment
                          ? 'cursor-not-allowed border-white/12 bg-white/12 shadow-none'
                          : 'border-white/10 bg-gradient-to-r from-[#e8631a] to-[#991B1B] hover:scale-[1.02] hover:shadow-[0_6px_20px_rgba(232,99,26,0.6)]'
                      }`}
                    >
                      {!(loading || isPendingPayment) && (
                        <span className="absolute top-0 left-0 h-full w-[50%] -translate-x-[150%] skew-x-[-15deg] bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:animate-[shimmer_1.5s_linear_infinite] animate-[shimmer_1.5s_linear_infinite]" />
                      )}
                      <span className="relative z-10 flex items-center gap-3">
                        {loading
                          ? 'Processing...'
                          : isPendingPayment
                            ? 'Registration Pending Payment'
                            : 'Register Now'}
                        <span className="text-xl transition-transform duration-200 group-hover:translate-x-1">→</span>
                      </span>
                    </button>
                  )}

                  {/* ── Seat Selection Button (visible after REGISTERED or PENDING_PAYMENT with hallLayout) ── */}
                  {(isRegistered || isPendingPayment) && hallLayout && (
                    <button
                      onClick={openSeatModal}
                      className="w-full py-3 mt-3 rounded-2xl border-2 border-[#e8631a]/50 text-[#e8631a] font-bold text-sm hover:bg-[#e8631a] hover:border-[#e8631a] hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <SeatIcon className="w-4 h-4" />
                      {isPendingPayment ? 'Select Seat & Pay to Confirm' : 'View Your Seat'}
                    </button>
                  )}

                  <p className="relative z-10 mt-3 text-center text-xs text-white/52">
                    {isRegistered
                      ? 'Your spot is confirmed'
                      : isPendingPayment
                        ? 'Select a seat and complete payment to confirm'
                        : (!user ? "You'll be asked to sign in first" : "")}
                  </p>
                </>
              )}

              {isWaitlisted && (
                <p className="mt-4 text-xs text-amber-300/85">You are currently on the waitlist for this event.</p>
              )}
              {regStatus === 'ERROR' && errorMsg && (
                <p className="relative z-10 mt-4 text-xs text-red-300">{errorMsg}</p>
              )}

              <style jsx>{`
                @keyframes registerOrbA { 0%, 100% { transform: scale(1); opacity: 0.12; } 50% { transform: scale(1.18); opacity: 0.06; } }
                @keyframes registerOrbB { 0%, 100% { transform: scale(1); opacity: 0.18; } 50% { transform: scale(1.12); opacity: 0.1; } }
                @keyframes registerOrbC { 0%, 100% { transform: scale(1); opacity: 0.22; } 50% { transform: scale(1.08); opacity: 0.12; } }
                @keyframes registerBadge { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
                @keyframes registerPricePop { 0% { transform: scale(0.88); opacity: 0; } 60% { transform: scale(1.06); } 100% { transform: scale(1); opacity: 1; } }
                @keyframes shimmer { 0% { transform: translateX(-150%) skewX(-15deg); } 100% { transform: translateX(300%) skewX(-15deg); } }
              `}</style>
            </div>
          </div>
        )}
      </div>

      {showDayModal && isMultiDay && (
        <DaySelectionModal
          days={days}
          eventName={eventName}
          perDayAmount={amount}
          discipline={user?.discipline}
          onClose={() => setShowDayModal(false)}
          onConfirm={chosenDays => handleRegister(chosenDays)}
          loading={loading}
        />
      )}

      {/* ── Seat Selection Modal ─────────────────────────────────────────── */}
      {showSeatModal && hallLayout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        >
          {/* Modal container — centered, capped at 90vh so it always fits */}
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] md:max-h-[85vh] mt-4"
          >
            {/* Sticky Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 rounded-t-3xl shrink-0">
              <div>
                <h2 className="font-heading font-bold text-lg text-gray-900 flex items-center gap-2">
                  <SeatIcon className="w-5 h-5 text-[#e8631a]" /> Choose Your Seat
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">{hallLayout.hall_name}</p>
              </div>
              <button
                onClick={() => setShowSeatModal(false)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 p-6 space-y-4 text-black">
              {/* Seat summary stats */}
              <div className="flex gap-3 flex-wrap">
                {[
                  { label: 'Total',   val: hallLayout.total_rows * hallLayout.seats_per_row,                        color: 'text-gray-700' },
                  { label: 'Booked',  val: seatStatuses.filter(s => s.status === 'confirmed').length,               color: 'text-red-500' },
                  { label: 'On Hold', val: seatStatuses.filter(s => s.status === 'temp_hold').length,              color: 'text-[#e8631a]' },
                  { label: 'Free',    val: hallLayout.total_rows * hallLayout.seats_per_row - seatStatuses.length,  color: 'text-emerald-600' },
                ].map(s => (
                  <div key={s.label} className="flex-1 min-w-[70px] bg-gray-50 border border-gray-100 rounded-2xl px-3 py-2 text-center">
                    <p className={`font-extrabold text-xl ${s.color}`}>{s.val}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Pending payment instruction — only show when no seat held yet */}
              {isPendingPayment && !mySeat && (
                <div className="rounded-xl px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold flex items-center gap-2">
                  <ClockIcon className="w-5 h-5 text-amber-500 shrink-0" />
                  Select a seat below to lock it for 30 minutes, then pay to confirm.
                </div>
              )}

              <VenueMap
                layout={hallLayout}
                interactive={mySeat?.status !== 'confirmed'}
                eventId={eventId}
                currentUserId={user?._id}
                seatStatuses={seatStatuses}
                onSeatClick={(seatId) => holdSeat(seatId)}
                mySeatId={mySeat?.seatId}
              />

              {seatMsg && (
                <div className={`rounded-xl px-4 py-3 text-sm font-medium ${
                  seatMsg.includes('expired') || seatMsg.includes('failed') || seatMsg.includes('error')
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : seatMsg.includes('released') || seatMsg.includes('confirmed') || seatMsg.includes('successful')
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                      : 'bg-amber-50 border border-amber-200 text-amber-800'
                }`}>
                  {seatMsg}
                </div>
              )}

              {mySeat && (
                <div className={`rounded-2xl px-4 py-3.5 border flex flex-col gap-2 ${mySeat.status === 'confirmed' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                  {/* Single combined line: icon + seat id + status */}
                  <p className="font-extrabold text-base text-gray-800 flex items-center gap-2">
                    {mySeat.status === 'confirmed'
                      ? <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
                      : <ClockIcon className="w-5 h-5 text-amber-500 shrink-0" />}
                    Your Seat:&nbsp;<span className="text-[#e8631a]">{mySeat.seatId}</span>
                    {mySeat.status === 'confirmed' && (
                      <span className="ml-1 text-emerald-700 font-semibold text-sm">Seat confirmed!</span>
                    )}
                  </p>

                  {/* Hold countdown */}
                  {mySeat.status === 'temp_hold' && mySeat.expiresAt && (
                    <p className="text-sm text-amber-700">
                      Hold expires in: <Countdown expiresAt={mySeat.expiresAt} onExpired={handleSeatHoldExpired} />
                      <span className="ml-1 text-xs font-medium">— pay before it expires!</span>
                    </p>
                  )}

                  {/* Action buttons (only for temp_hold) */}
                  {mySeat.status === 'temp_hold' && (
                    <>
                      <p className="text-[11px] text-amber-800/80 mt-1 mb-1 leading-snug">
                        *Note: A non-refundable processing fee of ₹100 applies if you decide to cancel later.
                      </p>
                      <div className="flex gap-3 mt-1">
                        <button
                          onClick={confirmSeat}
                          disabled={seatLoading}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                        >
                          {seatLoading ? 'Processing…' : <><CreditCardIcon className="w-4 h-4" /> Pay ₹{amount} & Confirm</>}
                        </button>
                        <button
                          onClick={releaseSeat}
                          disabled={seatLoading}
                          className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold text-sm disabled:opacity-50"
                        >
                          Release
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
