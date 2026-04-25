'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type Tone = 'success' | 'error' | 'info';
type Toast = {
  id: number;
  tone: Tone;
  title: string;
  body?: string;
  ttl: number; // ms
};

type Ctx = {
  push: (t: Omit<Toast, 'id' | 'ttl'> & { ttl?: number }) => void;
};

const ToastCtx = createContext<Ctx | null>(null);
let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts(ts => ts.filter(t => t.id !== id));
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
  }, []);

  const push = useCallback((t: Omit<Toast, 'id' | 'ttl'> & { ttl?: number }) => {
    const id = nextId++;
    const ttl = t.ttl ?? (t.tone === 'error' ? 6000 : 3500);
    const next: Toast = { id, ttl, tone: t.tone, title: t.title, body: t.body };
    setToasts(ts => [...ts, next]);
    const handle = setTimeout(() => dismiss(id), ttl);
    timers.current.set(id, handle);
  }, [dismiss]);

  // Cleanup pending timers on unmount
  useEffect(() => () => { timers.current.forEach(clearTimeout); timers.current.clear(); }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div
        className="fixed top-4 right-4 z-[60] flex flex-col gap-2 w-[360px] max-w-[calc(100vw-2rem)]"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map(t => (
          <ToastCard key={t.id} t={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function ToastCard({ t, onDismiss }: { t: Toast; onDismiss: () => void }) {
  const Icon = t.tone === 'success' ? CheckCircle2 : t.tone === 'error' ? AlertCircle : Info;
  const tone =
    t.tone === 'success' ? 'border-green/40 bg-white text-ink' :
    t.tone === 'error'   ? 'border-red-300 bg-white text-ink' :
                           'border-line bg-white text-ink';
  const iconTone =
    t.tone === 'success' ? 'text-green' :
    t.tone === 'error'   ? 'text-red-600' :
                           'text-blue-600';
  return (
    <div
      role={t.tone === 'error' ? 'alert' : 'status'}
      className={[
        'flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lift',
        'animate-[toast-in_180ms_ease-out]',
        tone,
      ].join(' ')}
      style={{
        animationName: 'toast-in',
      } as any}
    >
      <Icon size={18} className={`shrink-0 mt-0.5 ${iconTone}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium leading-tight">{t.title}</div>
        {t.body && <div className="text-xs text-label mt-0.5 break-words">{t.body}</div>}
      </div>
      <button onClick={onDismiss} className="text-mute hover:text-ink p-0.5" aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  const { push } = ctx;
  return {
    success: (title: string, body?: string) => push({ tone: 'success', title, body }),
    error:   (title: string, body?: string) => push({ tone: 'error',   title, body }),
    info:    (title: string, body?: string) => push({ tone: 'info',    title, body }),
  };
}
