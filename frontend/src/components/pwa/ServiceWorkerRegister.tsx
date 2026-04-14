'use client';
import { useEffect } from 'react';

/**
 * Registers /sw.js so the browser considers the app installable.
 * Must be rendered inside a Client Component (providers or layout).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(reg => {
        console.log('[SW] Registered, scope:', reg.scope);
      })
      .catch(err => {
        console.warn('[SW] Registration failed:', err);
      });
  }, []);

  return null;
}
