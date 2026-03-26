"use client";
import { useAuth } from '@/context/AuthContext';
import { RegisterCTA } from '@/components/events/RegisterCTA';
import { LocationIcon, CheckCircleIcon } from '@/components/Icons';

type Props = {
  eventId: string;
  disabled: boolean;
  status: string;
  registered: number;
  capacity: number;
  percentage: number;
  venue: string;
  hallLayout?: Record<string, unknown> | null;
};

export function EventSidebarWrapper(props: Props) {
  const { user } = useAuth();
  const isStaff = user?.role === 'admin' || user?.role === 'superAdmin';

  if (isStaff) {
    return (
      <div className="sticky top-28 bg-card border border-border p-8 rounded-3xl shadow-xl">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs font-bold uppercase tracking-widest bg-[#0E1B3D] text-white px-3 py-1 rounded-full">Admin View</span>
        </div>
        <h3 className="font-heading font-bold text-2xl text-secondary mb-2">Registration Stats</h3>
        <p className="text-foreground/70 mb-8 flex items-center gap-2 font-medium text-sm">
          <LocationIcon className="w-4 h-4 text-[#E8831A]" /> {props.venue}
        </p>

        <div className="bg-black/5 p-6 rounded-2xl mb-4 border border-black/5 space-y-4">
          {[
            { label: 'Capacity', value: props.capacity, color: 'text-secondary' },
            { label: 'Registered', value: props.registered, color: 'text-[#E8831A]' },
            { label: 'Remaining', value: Math.max(0, props.capacity - props.registered), color: 'text-emerald-600' },
          ].map(stat => (
            <div key={stat.label} className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground/60">{stat.label}</span>
              <span className={`text-2xl font-extrabold font-bebas ${stat.color}`}>{stat.value}</span>
            </div>
          ))}
        </div>

        <div className="w-full h-3 bg-black/10 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${props.percentage >= 100 ? 'bg-[#b91d1d]' : 'bg-[#E8831A]'}`}
            style={{ width: `${props.percentage}%` }}
          />
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#E8831A] text-right">{props.percentage}% Filled</p>

        <div className="mt-6 py-3 rounded-2xl text-center bg-[#0E1B3D]/5 border border-[#0E1B3D]/10">
          <p className="text-[#0E1B3D] font-bold text-sm flex items-center justify-center gap-2">
            {props.status === 'COMPLETED'
              ? <><CheckCircleIcon className="w-4 h-4 text-emerald-600" /> Event Concluded</>
              : <><span className="w-2 h-2 rounded-full bg-[#E8831A] inline-block" /> Read-only admin view</>}
          </p>
          <p className="text-foreground/40 text-xs mt-1">Registration is for students only</p>
        </div>
      </div>
    );
  }

  return <RegisterCTA {...props} hallLayout={props.hallLayout as never} />;
}
