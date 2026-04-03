"use client";
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

type Feedback = {
  _id: string;
  studentId?: string;
  studentName: string;
  college: string;
  rating: number;
  comment: string;
};

export function EventMediaAndFeedback({
  eventId,
  photos,
  showFeedback = true,
}: {
  eventId: string,
  photos: string[],
  showFeedback?: boolean,
}) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const [cardsToShow, setCardsToShow] = useState(3);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const totalPhotos = photos?.length || 0;
  const canSlide = totalPhotos > cardsToShow;
  const maxIndex = Math.max(0, totalPhotos - cardsToShow);
  const safeCurrentIndex = Math.min(currentIndex, maxIndex);
  const gapPx = cardsToShow === 1 ? 16 : cardsToShow === 2 ? 24 : 32;
  const sidePaddingClass = cardsToShow === 1 ? 'px-12' : cardsToShow === 2 ? 'px-14' : 'px-16';
  const cardWidth = `calc((100% - ${(cardsToShow - 1) * gapPx}px) / ${cardsToShow})`;

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setCardsToShow(1);
      else if (window.innerWidth < 1100) setCardsToShow(2);
      else setCardsToShow(3);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const target = cardRefs.current[safeCurrentIndex];
    if (!scrollRef.current || !target) return;
    scrollRef.current.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
  }, [safeCurrentIndex, cardsToShow]);

  useEffect(() => {
    if (!showFeedback) return;

    let cancelled = false;
    fetch(`http://localhost:5000/api/events/${eventId}/feedback`)
      .then(res => res.json())
      .then((data) => {
        if (!cancelled) setFeedbacks(data);
      })
      .catch(()=>{});

    return () => {
      cancelled = true;
    };
  }, [eventId, showFeedback]);

  const goPrev = () => {
    if (!canSlide) return;
    if (safeCurrentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  const goNext = () => {
    if (!canSlide) return;
    if (safeCurrentIndex < maxIndex) setCurrentIndex(prev => prev + 1);
  };

  const closeViewer = () => setActivePhotoIndex(null);

  return (
    <>
      <div className="w-full space-y-16 mt-16 border-t border-gray-200 pt-16">
        {/* Photo Gallery */}
        {photos && photos.length > 0 && (
          <div id="event-highlights">
            <div className="flex items-center justify-between gap-4 mb-8">
              <h2 className="text-2xl font-heading font-extrabold text-[#0E1B3D] flex items-center gap-3">
                <span className="w-8 h-px bg-[#e8631a]"></span> Event Highlights
              </h2>
            </div>
            <div className={`relative ${sidePaddingClass}`}>
              {canSlide && safeCurrentIndex > 0 && (
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-full bg-[#0E1B3D] text-[#e8631a] hover:bg-[#e8631a] hover:text-white transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-[#e8631a]/40"
                  aria-label="Previous event photos"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}

              <div
                ref={scrollRef}
                className="overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar"
              >
                <div
                  className="flex"
                  style={{ gap: `${gapPx}px` }}
                >
                  {photos.map((photo, index) => (
                    <button
                      key={`${photo}-${index}`}
                      ref={(el) => { cardRefs.current[index] = el; }}
                      type="button"
                      onClick={() => setActivePhotoIndex(index)}
                      className="relative flex-shrink-0 snap-start h-[160px] md:h-[190px] lg:h-[280px] bg-gray-200 rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm group text-left"
                      style={{ width: cardWidth }}
                    >
                      <Image
                        src={`http://localhost:5000${photo}`}
                        alt={`Event highlight ${index + 1}`}
                        fill
                        unoptimized
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0E1B3D]/55 via-transparent to-transparent opacity-90" />
                    </button>
                  ))}
                </div>
              </div>

              {canSlide && safeCurrentIndex < maxIndex && (
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-full bg-[#0E1B3D] text-[#e8631a] hover:bg-[#e8631a] hover:text-white transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-[#e8631a]/40"
                  aria-label="Next event photos"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Feedback Section */}
        {showFeedback && (
        <div>
          <h2 className="text-2xl font-heading font-extrabold text-[#0E1B3D] mb-6 flex items-center gap-3">
            <span className="w-8 h-px bg-[#e8631a]"></span> Student Feedback
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {feedbacks.length === 0 && <p className="text-gray-400 italic font-medium px-2">No feedback has been published for this event yet.</p>}
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
                <p className="text-sm text-gray-600 leading-relaxed mt-3 relative z-10">&quot;{f.comment}&quot;</p>
              </div>
            ))}
          </div>
        </div>
        )}
      </div>
      {activePhotoIndex !== null && photos[activePhotoIndex] && (
        <div
          className="fixed inset-0 z-[60] bg-[#0E1B3D] flex items-center justify-center p-4"
          onClick={closeViewer}
        >
          <button
            type="button"
            onClick={closeViewer}
            className="absolute top-5 right-5 w-11 h-11 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Close photo viewer"
          >
            ×
          </button>
          <div
            className="relative w-[88vw] md:w-[80vw] max-w-5xl h-[56vh] md:h-[68vh] rounded-[2rem] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={`http://localhost:5000${photos[activePhotoIndex]}`}
              alt={`Event highlight ${activePhotoIndex + 1}`}
              fill
              unoptimized
              className="object-contain bg-[#0E1B3D]"
            />
          </div>
        </div>
      )}
    </>
  );
}
