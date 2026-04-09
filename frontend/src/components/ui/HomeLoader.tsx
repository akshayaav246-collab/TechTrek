'use client';

import { useEffect } from 'react';

const SESSION_KEY = 'tt_loader_shown';

/**
 * Runs on every page, returns nothing visually.
 * Fades out the static #tt-preloader div that was injected by layout.tsx
 * when the user first loads / refreshes the site.
 */
export default function HomeLoader() {
  useEffect(() => {
    // If already seen this session, nothing to do
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const el = document.getElementById('tt-preloader') as HTMLElement | null;
    if (!el) return;

    // Bar animation: 0.7s delay + 2.2s grow = 2.9s total
    // Give a tiny buffer then fade out
    const FADE_DELAY = 3000;
    const FADE_DURATION = 500;

    const fadeTimer = setTimeout(() => {
      el.style.transition = `opacity ${FADE_DURATION}ms ease`;
      el.style.opacity = '0';

      const removeTimer = setTimeout(() => {
        el.style.display = 'none';
        sessionStorage.setItem(SESSION_KEY, '1');
      }, FADE_DURATION);

      return () => clearTimeout(removeTimer);
    }, FADE_DELAY);

    return () => clearTimeout(fadeTimer);
  }, []);

  return null;
}
