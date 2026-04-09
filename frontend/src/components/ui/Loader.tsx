'use client';

import { useEffect, useState } from 'react';
import './Loader.css';
<link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@700&display=swap" rel="stylesheet" />

type Spark = {
  id: number;
  size: number;
  left: number;
  bottom: number;
  duration: number;
  delay: number;
};

interface LoaderProps {
  /** Called when the loader finishes so the parent can unmount it */
  onDone: () => void;
}

export default function Loader({ onDone }: LoaderProps) {
  const [sparks, setSparks] = useState<Spark[]>([]);

  useEffect(() => {
    const generated: Spark[] = Array.from({ length: 18 }, (_, i) => ({
      id: i,
      size: 2 + Math.random() * 3,
      left: 10 + Math.random() * 80,
      bottom: 8 + Math.random() * 30,
      duration: 2 + Math.random() * 3,
      delay: Math.random() * 3,
    }));
    setSparks(generated);

    // Hide loader after the bar animation finishes (0.7s delay + 2.2s fill = ~3.2s)
    const timer = setTimeout(onDone, 3400);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="loader-overlay">
      <div className="loader-bg" />
      <div className="loader-grid" />
      <div className="loader-glow" /> 

      <div className="loader-sparks">
        {sparks.map((s) => (
          <div
            key={s.id}
            className="loader-spark"
            style={{
              width: s.size,
              height: s.size,
              left: `${s.left}%`,
              bottom: `${s.bottom}%`,
              animationDuration: `${s.duration}s`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="loader-logo">
        <div className="loader-logo-text">
  <span className="loader-accent">Tech</span>
  <span className="loader-slash">/</span>Trek
</div>
<div className="loader-bar-accent">
  <div className="loader-bar-line" />
  <div className="loader-year">2 0 2 6</div>
  <div className="loader-bar-line" />
</div>
      </div>

      <div className="loader-tagline">Ignite Your Imagination</div>

      <div className="loader-track">
        <div className="loader-path">
          <div className="loader-fill" />
          <div className="loader-dot" />
        </div>
        <div className="loader-label">Loading experience</div>
      </div>
    </div>
  );
  
}


