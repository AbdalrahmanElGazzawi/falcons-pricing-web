'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  const KEY = 'falcons_session_id';
  let id = window.sessionStorage.getItem(KEY);
  if (!id) {
    id = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)) + '-' + Date.now();
    window.sessionStorage.setItem(KEY, id);
  }
  return id;
}

const PUBLIC_PREFIXES = ['/login', '/access-revoked', '/client/', '/auth/', '/talent/'];

export function VisitTracker() {
  const pathname = usePathname();
  const lastPingRef = useRef<number>(0);

  useEffect(() => {
    if (!pathname) return;
    if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return;
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'visit',
        path: pathname,
        referrer: typeof document !== 'undefined' ? document.referrer : null,
        session_id: getSessionId(),
      }),
      keepalive: true,
    }).catch(() => {});
    lastPingRef.current = Date.now();
  }, [pathname]);

  useEffect(() => {
    if (!pathname) return;
    if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return;
    function ping() {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (Date.now() - lastPingRef.current < 25_000) return;
      lastPingRef.current = Date.now();
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'ping', path: pathname, session_id: getSessionId() }),
        keepalive: true,
      }).catch(() => {});
    }
    const interval = setInterval(ping, 30_000);
    const onVisible = () => { if (document.visibilityState === 'visible') ping(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
  }, [pathname]);

  return null;
}
