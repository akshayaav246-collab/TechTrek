"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export function EventMediaAndFeedback({ eventId, photos }: { eventId: string, photos: string[] }) {
  const { user, token } = useAuth();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`http://localhost:5000/api/events/${eventId}/feedback`)
      .then(res => res.json()).then(setFeedbacks).catch(()=>{});
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return alert('Please login to submit feedback.');
    setSubmitting(true);
    try {
      const res = await fetch(`http://localhost:5000/api/events/${eventId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating, comment })
      });
      if (res.ok) {
        const item = await res.json();
        setFeedbacks([item, ...feedbacks]);
        setComment('');
        alert('Thank you for your feedback!');
      } else {
        const data = await res.json();
        alert(data.message);
      }
    } catch {
      alert('Failed to submit feedback');
    }
    setSubmitting(false);
  };

  const hasSubmitted = feedbacks.some(f => f.studentId === user?._id);

  return (
    <div className="w-full space-y-16 mt-16 border-t border-gray-200 pt-16">
      {/* Photo Gallery */}
      {photos && photos.length > 0 && (
        <div>
          <h2 className="text-2xl font-heading font-extrabold text-[#0E1B3D] mb-6 flex items-center gap-3">
            <span className="w-8 h-px bg-[#e8631a]"></span> Event Highlights
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map((p, i) => (
              <div key={i} className="aspect-video bg-gray-200 rounded-3xl overflow-hidden border border-gray-100 shadow-sm relative group">
                <img src={`http://localhost:5000${p}`} alt="Event Photo" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feedback Section */}
      <div>
        <h2 className="text-2xl font-heading font-extrabold text-[#0E1B3D] mb-6 flex items-center gap-3">
          <span className="w-8 h-px bg-[#e8631a]"></span> Student Feedback
        </h2>
        
        {user && user.role === 'student' && !hasSubmitted && (
          <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-gray-100 mb-10 flex flex-col items-start w-full relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#e8631a]/5 rounded-full blur-[40px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <h3 className="font-extrabold text-xl mb-4 text-[#0E1B3D] relative z-10">Leave your review</h3>
            <div className="mb-5 relative z-10">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                   <button key={star} type="button" onClick={() => setRating(star)}
                     className={`text-3xl transition-transform hover:scale-110 ${rating >= star ? 'text-[#e8631a]' : 'text-gray-200'}`}>★</button>
                ))}
              </div>
            </div>
            <div className="mb-6 w-full max-w-2xl relative z-10">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Comment</label>
              <textarea required value={comment} onChange={e => setComment(e.target.value)} rows={3}
                className="w-full border border-gray-200 p-4 rounded-2xl text-sm outline-none focus:border-[#e8631a] focus:ring-4 focus:ring-[#e8631a]/10 resize-none transition-all" placeholder="Share your experience at this summit..."></textarea>
            </div>
            <button disabled={submitting} type="submit" 
              className="bg-[#0E1B3D] hover:bg-[#1a2d5a] shadow-[0_4px_15px_rgba(14,27,61,0.2)] text-white px-8 py-3.5 font-bold uppercase tracking-widest text-xs rounded-xl transition-all disabled:opacity-50 relative z-10">
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {feedbacks.length === 0 && <p className="text-gray-400 italic font-medium px-2">No feedback published yet.</p>}
          {feedbacks.map(f => (
            <div key={f._id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative">
               <div className="flex justify-between items-start mb-2">
                 <div>
                   <p className="font-extrabold text-[#0E1B3D]">{f.studentName}</p>
                   <p className="text-xs font-bold text-gray-400">{f.college}</p>
                 </div>
                 <div className="flex gap-0.5 text-[#e8631a] text-sm bg-[#FAF7F2] px-2 py-1 rounded-lg border border-[#E8DDD0]">
                   {Array.from({length: 5}).map((_,i) => <span key={i}>{i < f.rating ? '★' : '☆'}</span>)}
                 </div>
               </div>
               <p className="text-sm text-gray-600 leading-relaxed mt-3 relative z-10">"{f.comment}"</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
