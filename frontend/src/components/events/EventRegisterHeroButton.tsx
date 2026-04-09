'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

type RegistrationStatus = 'IDLE' | 'REGISTERED' | 'WAITLISTED' | 'ERROR';

export function EventRegisterHeroButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const { user, token } = useAuth();
  const [regStatus, setRegStatus] = useState<RegistrationStatus>('IDLE');

  useEffect(() => {
    if (!user || !token) return;

    fetch(`http://localhost:5000/api/registrations/check/${eventId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.isRegistered) {
          setRegStatus(data.status as RegistrationStatus);
        }
      })
      .catch(() => {});
  }, [eventId, token, user]);

  const isRegistered = !!user && !!token && regStatus === 'REGISTERED';

  const handleClick = () => {
    if (isRegistered) return;

    if (!user || !token) {
      router.push(`/login?redirect=/events/${eventId}`);
      return;
    }

    document.getElementById('register-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (isRegistered) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`group relative inline-flex overflow-hidden rounded-2xl border px-7 py-4 text-base font-extrabold uppercase tracking-[0.14em] text-white shadow-[0_4px_15px_rgba(232,99,26,0.4)] transition-all duration-300 border-white/10 bg-gradient-to-r from-[#e8631a] to-[#991B1B] hover:scale-[1.03] hover:shadow-[0_6px_20px_rgba(232,99,26,0.6)]`}
    >
      <span className="absolute top-0 left-0 h-full w-[50%] -translate-x-[150%] skew-x-[-15deg] bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:animate-[shimmer_0.75s_linear_infinite] animate-[shimmer_1.5s_linear_infinite]" />
      <span className="relative z-10 flex items-center gap-3">
        Register Now!
      </span>
    </button>
  );
}
