'use client';
import { useLocale } from '@/lib/i18n/Locale';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, FileText, Users, Sparkles, Inbox, LayoutDashboard, PlusCircle,
  Calculator, Map, BookOpen, ScrollText, Settings, X,
} from 'lucide-react';

const RECENT_KEY = 'falcons.cmdk.recent.v1';
const RECENT_MAX = 6;

type Kind = 'quote' | 'player' | 'creator' | 'inquiry' | 'nav';

interface Item {
  kind: Kind;
  title: string;
  subtitle: string;
  href: string;
  keywords: string;
}

const NAV_ITEMS: Item[] = [
  { kind: 'nav', title: 'Dashboard', subtitle: 'Overview & KPIs', href: '/dashboard', keywords: 'dashboard home overview' },
  { kind: 'nav', title: 'New quote', subtitle: 'Create a fresh quotation', href: '/quote/new', keywords: 'new quote create build' },
  { kind: 'nav', title: 'Calculator', subtitle: 'Quick price check', href: '/calculator', keywords: 'calculator quick price' },
  { kind: 'nav', title: 'Quote Log', subtitle: 'All quotations', href: '/quotes', keywords: 'quotes log list all' },
  { kind: 'nav', title: 'Inquiries', subtitle: 'Inbound leads', href: '/inquiries', keywords: 'inquiries inbox leads inbound' },
  { kind: 'nav', title: 'Roster — Players', subtitle: 'Pro-team athletes', href: '/roster/players', keywords: 'players roster athletes' },
  { kind: 'nav', title: 'Roster — Creators', subtitle: 'Influencers & creators', href: '/roster/creators', keywords: 'creators influencers roster' },
  { kind: 'nav', title: 'Roadmap', subtitle: 'Pricing OS roadmap', href: '/admin/roadmap', keywords: 'roadmap plan' },
  { kind: 'nav', title: 'About', subtitle: 'Welcome & overview', href: '/welcome', keywords: 'about welcome help' },
];

function iconFor(kind: Kind) {
  switch (kind) {
    case 'quote': return FileText;
    case 'player': return Users;
    case 'creator': return Sparkles;
    case 'inquiry': return Inbox;
    case 'nav': return LayoutDashboard;
  }
}

function fuzzyScore(text: string, query: string): number {
  if (!query) return 0;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t === q) return 1000;
  if (t.startsWith(q)) return 500;
  if (t.includes(q)) return 250;
  // subsequence match
  let ti = 0, score = 0, last = -1;
  for (const ch of q) {
    const idx = t.indexOf(ch, ti);
    if (idx === -1) return 0;
    if (last !== -1 && idx === last + 1) score += 5; // adjacency bonus
    score += 1;
    last = idx;
    ti = idx + 1;
  }
  return score;
}

export function CommandPalette() {
  const { t } = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [recent, setRecent] = useState<Item[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent on mount
  useEffect(() => {
    try {
      const r = localStorage.getItem(RECENT_KEY);
      if (r) setRecent(JSON.parse(r));
    } catch { /* ignore */ }
  }, []);

  // Global cmd+k / ctrl+k listener
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(v => !v);
      }
      if (e.key === 'Escape' && open) setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // When opened, fetch the catalog (cached for the session)
  useEffect(() => {
    if (!open) return;
    setActive(0);
    setQuery('');
    inputRef.current?.focus();
    if (items.length > 0) return;
    setLoading(true);
    fetch('/api/search')
      .then(r => r.json())
      .then(j => setItems([...NAV_ITEMS, ...(j.items || [])]))
      .catch(() => setItems(NAV_ITEMS))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const results = useMemo(() => {
    if (!query.trim()) {
      // No query → show recent first, then nav
      return [...recent, ...NAV_ITEMS.filter(n => !recent.some(r => r.href === n.href))].slice(0, 12);
    }
    const scored = items
      .map(it => {
        const titleScore = fuzzyScore(it.title, query);
        const keyScore = fuzzyScore(it.keywords, query) * 0.5;
        return { it, score: Math.max(titleScore, keyScore) };
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map(s => s.it);
    return scored;
  }, [query, items, recent]);

  function pick(item: Item) {
    // Remember up to N recents (newest first, deduped by href)
    try {
      const next = [item, ...recent.filter(r => r.href !== item.href)].slice(0, RECENT_MAX);
      setRecent(next);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch { /* ignore */ }
    setOpen(false);
    router.push(item.href);
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && results[active]) { e.preventDefault(); pick(results[active]); }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] sm:pt-[15vh] px-4">
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-navy/50 backdrop-blur-sm"
      />

      {/* Dialog */}
      <div className="relative w-full max-w-xl card overflow-hidden shadow-2xl">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
          <Search size={18} className="text-mute" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={onInputKey}
            placeholder={t('cmdk.placeholder')}
            className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-mute"
            autoFocus
          />
          <button onClick={() => setOpen(false)} className="p-1 text-mute hover:text-ink rounded">
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-mute">Loading…</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-mute">
              {query ? t('cmdk.no_match') : t('cmdk.type')}
            </div>
          ) : (
            <ul role="listbox">
              {!query.trim() && recent.length > 0 && (
                <li className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wider text-mute font-semibold">{t('cmdk.recent')}</li>
              )}
              {!query.trim() && recent.length > 0 && (
                <li className="px-4 pb-2 pt-1 text-[10px] uppercase tracking-wider text-mute font-semibold sr-only">end recent</li>
              )}
              {results.map((it, i) => {
                const Icon = iconFor(it.kind);
                const isActive = i === active;
                const showNavHeader = !query.trim() && i === recent.length && recent.length > 0;
                return (
                  <li key={`${it.kind}-${it.href}-${i}`}>
                    {showNavHeader && (
                      <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-wider text-mute font-semibold">{t('cmdk.quick')}</div>
                    )}
                    <button
                      onClick={() => pick(it)}
                      onMouseEnter={() => setActive(i)}
                      className={[
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition',
                        isActive ? 'bg-greenSoft' : 'hover:bg-bg',
                      ].join(' ')}
                    >
                      <div className={[
                        'w-8 h-8 rounded-lg grid place-items-center flex-shrink-0',
                        isActive ? 'bg-green text-white' : 'bg-bg text-label',
                      ].join(' ')}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink truncate">{it.title}</div>
                        {it.subtitle && <div className="text-xs text-mute truncate">{it.subtitle}</div>}
                      </div>
                      <span className={[
                        'text-[10px] uppercase tracking-wider font-semibold flex-shrink-0',
                        isActive ? 'text-greenDark' : 'text-mute',
                      ].join(' ')}>{it.kind}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-line text-[10px] text-mute bg-bg">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 bg-white border border-line rounded text-[10px]">↑↓</kbd> navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-white border border-line rounded text-[10px]">↵</kbd> open</span>
            <span><kbd className="px-1.5 py-0.5 bg-white border border-line rounded text-[10px]">esc</kbd> close</span>
          </div>
          <span><kbd className="px-1.5 py-0.5 bg-white border border-line rounded text-[10px]">⌘K</kbd> toggle</span>
        </div>
      </div>
    </div>
  );
}
