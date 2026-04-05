'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useIsFetching, useIsMutating } from '@tanstack/react-query';

/**
 * Centered loading indicator.
 * Appears after 350ms of any active React Query fetch/mutation or route change.
 * Fast operations (< 350ms) never show it — no flickering.
 */
export default function TopLoader() {
  const pathname   = usePathname();
  const isFetching = useIsFetching();
  const isMutating = useIsMutating();
  const busy = isFetching > 0 || isMutating > 0;

  const [visible, setVisible]   = useState(false);
  const [opacity, setOpacity]   = useState(0);
  const showTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPath   = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPath.current) {
      prevPath.current = pathname;
      trigger();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (busy) trigger();
    else      finish();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  function clearTimers() {
    if (showTimer.current) clearTimeout(showTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }

  function trigger() {
    clearTimers();
    // Only show after 350ms — hides flicker on fast operations
    showTimer.current = setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => setOpacity(1));
    }, 350);
  }

  function finish() {
    clearTimers();
    // Give in-flight renders a moment to settle
    hideTimer.current = setTimeout(() => {
      setOpacity(0);
      hideTimer.current = setTimeout(() => setVisible(false), 300);
    }, 150);
  }

  if (!visible) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Cargando"
      className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
      style={{ transition: 'opacity 250ms ease', opacity }}
    >
      {/* Subtle backdrop */}
      <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px]" />

      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl px-7 py-5 flex flex-col items-center gap-3 border border-slate-100">
        {/* Spinner ring */}
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
          <div
            className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-600"
            style={{ animation: 'spin 0.7s linear infinite' }}
          />
        </div>
        <p className="text-sm font-medium text-slate-500 tracking-wide">Cargando…</p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
