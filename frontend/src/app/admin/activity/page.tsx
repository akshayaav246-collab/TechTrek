"use client";
import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/context/AuthContext';

type Activity = {
  type: 'registration' | 'checkin';
  eventName: string;
  studentName: string;
  studentEmail?: string;
  college: string;
  time: string;
  status?: string;
};

export default function ActivityLogsPage() {
  const { token, isLoading, user } = useAuth();
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoading || !token) return;
    fetch('http://localhost:5000/api/events/analytics', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setActivity(data.recentActivity || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, isLoading]);

  if (isLoading || !user) return null;

  return (
    <AdminLayout title="Activity Logs" backHref="/admin">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
        
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 15 }).map((_, i) => <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse border border-[#E2D8CC]" />)}
          </div>
        ) : activity.length === 0 ? (
          <p className="text-center text-[#7A7166] text-sm py-10 font-medium bg-gray-50/50 rounded-xl border border-dashed border-[#E2D8CC]">
            No activity tracked yet.
          </p>
        ) : (
          <div className="w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-[#FAF7F2]">
                    {['S.No', 'Name', 'Email', 'Event Name', 'Activity', 'Timestamp'].map(h => (
                      <th key={h} className="text-left px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-[#7A7166]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF7F2]">
                  {activity.map((a, i) => (
                    <tr key={i} className="hover:bg-[#FAF7F2]/50 transition-colors">
                      <td className="px-5 py-4 text-xs text-gray-400 font-bold">{i + 1}</td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-[#1C1A17] text-sm">{a.studentName}</p>
                        <p className="text-[10px] text-[#7A7166] mt-0.5">{a.college}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-[#5F574E] font-medium">{a.studentEmail || 'N/A'}</td>
                      <td className="px-5 py-4 text-sm font-bold text-[#1A4A7A] truncate max-w-[180px]">{a.eventName}</td>
                      <td className="px-5 py-4 text-sm">
                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md border ${
                          a.type === 'checkin' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          a.status === 'WAITLISTED' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          'bg-[#FAF7F2] text-[#1C1A17] border-[#E2D8CC]'
                        }`}>
                          {a.type === 'checkin' ? 'Checked-In' : a.status === 'WAITLISTED' ? 'Waitlisted' : 'Registered'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-[#7A7166] whitespace-nowrap">
                        {new Date(a.time).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
