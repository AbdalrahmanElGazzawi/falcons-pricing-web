'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import type { UserRole } from '@/lib/types';
import { isSuperAdminEmail } from '@/lib/super-admin';
import {
  LayoutDashboard, Users, FileText, PlusCircle, Settings, LogOut, UserCog,
  Sparkles, BookOpen, KeyRound, ScrollText, Calculator, Map, Menu, X,
  Inbox, HelpCircle, Search, Trophy, Layers, PanelLeftClose, PanelLeftOpen, Database, ShieldCheck,
  BarChart3, ChevronRight, ChevronDown, Package} from 'lucide-react';
import { CommandPalette } from './CommandPalette';
import { LocaleSwitcher } from './LocaleSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { CurrencySwitcher } from './CurrencySwitcher';
import { useLocale } from '@/lib/i18n/Locale';

const WELCOME_KEY = 'falcons_welcome_seen_v1';

type NavItem = { href: string; key: string; icon: any; highlight?: boolean };
type NavGroup = { id: string; label: string | null; defaultOpen: boolean; items: NavItem[] };

// PINNED is rendered ungrouped at the top; the rest are collapsible sections.
const NAV_GROUPS = (role: UserRole, email: string): NavGroup[] => {
  const isStaff = ['admin','sales','finance'].includes(role);
  const isAdmin = role === 'admin';
  const isSuper = isSuperAdminEmail(email);

  return [
    // Sprint A.1 (May-10) — slimmed sidebar per audit memo. Pages still exist
    // at their URLs; they're just no longer surfaced in the nav:
    //   /about        — content folded into /pricing-logic intro
    //   /admin/sales-log     — 0 deals logged; promote back when first row exists
    //   /admin/esports-teams — accessible via direct URL or /admin/data-audit
    //   /admin/tiers, /market-bands, /addons, /assumptions, /admin/roadmap
    //                  — consolidated inside /admin/pricing tabs
    // /inquiries demoted from pinned → talent group (1 inquiry total today;
    // promote back when inbound traffic > 5/wk).
    {
      id: 'pinned', label: null, defaultOpen: true,
      items: [
        { href: '/dashboard',  key: 'nav.dashboard', icon: LayoutDashboard },
        { href: '/quote/new',  key: 'nav.new_quote', icon: PlusCircle, highlight: true },
        { href: '/quotes',     key: 'nav.quote_log', icon: FileText },
        { href: '/showcase',   key: 'nav.showcase',  icon: Trophy, highlight: true },
      ],
    },
    {
      id: 'talent', label: 'nav.group.talent', defaultOpen: true,
      items: [
        { href: '/roster/players',  key: 'nav.roster',    icon: Users },
        { href: '/roster/creators', key: 'nav.creators',  icon: Sparkles },
        { href: '/inquiries',       key: 'nav.inquiries', icon: Inbox },
        ...(isAdmin ? [
          { href: '/admin/talent-intakes', key: 'nav.talent_intakes', icon: ShieldCheck },
        ] : []),
      ],
    },
    {
      id: 'tools', label: 'nav.group.tools', defaultOpen: false,
      items: [
        { href: '/calculator', key: 'nav.calculator', icon: Calculator },
        ...(isStaff ? [
          { href: '/admin/activations',       key: 'nav.activations',   icon: Layers,  highlight: true },
          { href: '/admin/inventory-assets',  key: 'nav.media_assets',  icon: Package },
        ] : []),
      ],
    },
    {
      id: 'methodology', label: 'nav.group.methodology', defaultOpen: false,
      items: [
        { href: '/roadmap',       key: 'nav.roadmap',       icon: Map },
        { href: '/pricing-logic', key: 'nav.pricing_logic', icon: Layers },
      ],
    },
    ...(isSuper ? [{
      id: 'admin', label: 'nav.group.admin', defaultOpen: false,
      items: [
        { href: '/admin/users',     key: 'nav.users',      icon: UserCog },
        { href: '/admin/pricing',   key: 'nav.pricing_os', icon: Calculator },
        { href: '/admin/analytics', key: 'nav.analytics',  icon: BarChart3 },
        { href: '/admin/audit-log', key: 'nav.audit_log',  icon: ScrollText },
      ],
    } as NavGroup] : []),
  ].filter(g => g.items.length > 0);
};

function displayName(fullName: string | null | undefined, email: string): string {
  const trimmed = (fullName ?? '').trim();
  if (trimmed) return trimmed;
  const prefix = (email.split('@')[0] ?? '').replace(/[._-]+/g, ' ').trim();
  if (prefix) return prefix;
  return 'User';
}

export function Shell({
  role, email, fullName, children,
}: {
  role: UserRole;
  email: string;
  fullName?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { t } = useLocale();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ── Sidebar collapse (desktop) — persists in localStorage so user choice
  // sticks across page navigations and reloads. Tablet+ uses icons-only mode
  // when collapsed; mobile keeps the full-width drawer.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      const v = localStorage.getItem('falcons.sidebar_collapsed');
      if (v === '1') setCollapsed(true);
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem('falcons.sidebar_collapsed', collapsed ? '1' : '0'); } catch {}
  }, [collapsed]);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [drawerOpen]);

  // First-visit auto-redirect to /welcome (only when landing on /dashboard)
  useEffect(() => {
    if (pathname !== '/dashboard') return;
    try {
      if (!localStorage.getItem(WELCOME_KEY)) {
        router.replace('/welcome');
      }
    } catch {
      // localStorage blocked — silently skip the redirect
    }
  }, [pathname, router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const navGroups = NAV_GROUPS(role, email);
  const allNavItems = navGroups.flatMap(g => g.items);
  const username = displayName(fullName, email);
  const superAdmin = isSuperAdminEmail(email);

  return (
    <div className="min-h-screen lg:flex">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-navy text-white border-b border-white/10">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 -ml-2 rounded-md hover:bg-white/10"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <img src="/falcon-mark.png" alt="" className="w-7 h-7" />
        <div className="font-semibold text-sm leading-none">Team Falcons</div>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/quote/new" className="btn btn-primary !py-1.5 !px-3 text-xs">
            <PlusCircle size={14} /> New
          </Link>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <button
          aria-label="Close menu"
          onClick={() => setDrawerOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-navy/60 backdrop-blur-sm fade-in"
        />
      )}

      {/* Sidebar — fixed drawer on mobile, static on desktop */}
      <aside
        className={[
          'bg-navy text-white flex flex-col flex-shrink-0',
          collapsed ? 'lg:static lg:w-16 lg:translate-x-0' : 'lg:static lg:w-60 lg:translate-x-0',
          'fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw]',
          'transition-all duration-200 ease-out',
          drawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <div className={[
          'flex items-center gap-3 border-b border-white/10',
          collapsed ? 'px-2 py-5 justify-center' : 'px-5 py-5',
        ].join(' ')}>
          <img src="/falcon-mark.png" alt="Team Falcons" className="w-10 h-10 flex-shrink-0" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm leading-none">Team Falcons</div>
              <div className="text-white/50 text-[11px] mt-1">{t('nav.brand_tagline')}</div>
            </div>
          )}
          {/* Desktop collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="hidden lg:inline-flex p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
          {/* Mobile close drawer */}
          <button
            onClick={() => setDrawerOpen(false)}
            className="lg:hidden p-1.5 -mr-1 rounded-md text-white/70 hover:text-white hover:bg-white/10"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search affordance — clicking opens the palette. The palette also responds to ⌘K. */}
        <div className={collapsed ? 'px-2 pt-3 lg:px-2' : 'px-3 pt-3'}>
          <button
            type="button"
            onClick={() => {
              const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
              const evt = new KeyboardEvent('keydown', { key: 'k', metaKey: isMac, ctrlKey: !isMac, bubbles: true });
              window.dispatchEvent(evt);
            }}
            className={[
              'w-full flex items-center gap-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs transition',
              collapsed ? 'px-2 py-2 justify-center' : 'px-3 py-2',
            ].join(' ')}
            title={collapsed ? t('nav.search') : undefined}
          >
            <Search size={14} />
            {!collapsed && <><span className="flex-1 text-start">{t('nav.search')}</span><kbd className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded">⌘K</kbd></>}
          </button>
        </div>

        <nav className={[
          'flex-1 space-y-0.5 overflow-y-auto',
          collapsed ? 'p-2' : 'p-3',
        ].join(' ')}>
          {navGroups.map(group => (
            <NavGroupBlock
              key={group.id}
              group={group}
              pathname={pathname}
              collapsed={collapsed}
              t={t}
            />
          ))}
        </nav>

        <div className={[
          'border-t border-white/10',
          collapsed ? 'p-2' : 'p-3',
        ].join(' ')}>
          {!collapsed && (
            <>
              <div className="px-3 py-2 text-xs">
                <div className="text-white/90 font-medium truncate capitalize" title={username}>{username}</div>
                <div className="text-white/50 capitalize flex items-center gap-1.5">
                  <span>{role}</span>
                  {superAdmin && (
                    <span className="px-1.5 py-0.5 rounded-full bg-green/20 text-green text-[9px] font-semibold uppercase tracking-wider">
                      Super
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-2"><ThemeToggle compact /></div>
              <div className="mt-2"><LocaleSwitcher compact /></div>
              <div className="mt-2 -mx-3"><CurrencySwitcher /></div>
              <Link href="/account/password"
                className="mt-2 w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white">
                <KeyRound size={16} /> {t('nav.change_pwd')}
              </Link>
              <button onClick={signOut}
                className="mt-1 w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white">
                <LogOut size={16} /> {t('nav.sign_out')}
              </button>
              <div className="text-center text-white/30 text-[10px] mt-3 tracking-wide">
                Built by Abdalrahman elGazzawi
              </div>
            </>
          )}
          {collapsed && (
            <div className="flex flex-col items-center gap-1.5">
              <Link href="/account/password" title={t('nav.change_pwd')}
                className="p-2 rounded-lg text-white/70 hover:bg-white/5 hover:text-white">
                <KeyRound size={16} />
              </Link>
              <button onClick={signOut} title={t('nav.sign_out')}
                className="p-2 rounded-lg text-white/70 hover:bg-white/5 hover:text-white">
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">{children}</div>
      </main>

      <CommandPalette />
    </div>
  );
}

export function PageHeader({
  title, subtitle, action, crumbs, meta,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  crumbs?: Array<{ label: string; href?: string }>;
  meta?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {crumbs && crumbs.length > 0 && (
        <div className="crumbs mb-3">
          {crumbs.map((c, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="sep">/</span>}
                {c.href && !isLast ? (
                  <Link href={c.href}>{c.label}</Link>
                ) : (
                  <span className={isLast ? 'text-ink font-medium' : ''}>{c.label}</span>
                )}
              </span>
            );
          })}
        </div>
      )}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-ink tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-label mt-1">{subtitle}</p>}
          {meta && <div className="mt-3 flex items-center gap-3 flex-wrap">{meta}</div>}
        </div>
        {action && <div className="shrink-0 w-full sm:w-auto">{action}</div>}
      </div>
    </div>
  );
}

// ─── Collapsible nav group ──────────────────────────────────────────────────
// PINNED group (label === null) renders ungrouped at the top — items only.
// All other groups render a clickable header with a chevron + a body that
// shows/hides items. Open state persists in localStorage per group.id.
// If the active route lives inside the group, the group force-opens.
function NavGroupBlock({
  group, pathname, collapsed, t,
}: {
  group: { id: string; label: string | null; defaultOpen: boolean; items: Array<{ href: string; key: string; icon: any; highlight?: boolean }> };
  pathname: string;
  collapsed: boolean;
  t: (k: any) => string;
}) {
  const STORAGE_KEY = `falcons.nav.${group.id}`;
  const containsActive = group.items.some(it => pathname === it.href || pathname.startsWith(it.href + '/'));
  const [open, setOpen] = useState<boolean>(group.defaultOpen);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(STORAGE_KEY);
      if (v === '1' || v === '0') setOpen(v === '1');
    } catch {}
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If you navigate to a route inside a collapsed group, open it (without
  // overwriting localStorage — stays opened until you collapse it manually).
  const effectiveOpen = open || containsActive;

  function toggle() {
    const next = !open;
    setOpen(next);
    try { window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch {}
  }

  // Pinned (label === null) — render items only, no header
  if (group.label === null) {
    return (
      <div className="space-y-0.5 pb-2 mb-2 border-b border-white/5">
        {group.items.map(it => <NavItemLink key={it.href} item={it} pathname={pathname} collapsed={collapsed} t={t} />)}
      </div>
    );
  }

  // Collapsed sidebar — show items inline (no headers, no chevrons), keep nav usable when narrow
  if (collapsed) {
    return (
      <div className="space-y-0.5 mb-1">
        {group.items.map(it => <NavItemLink key={it.href} item={it} pathname={pathname} collapsed={collapsed} t={t} />)}
      </div>
    );
  }

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-1 px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold text-white/50 hover:text-white/80 transition"
      >
        {effectiveOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        <span className="flex-1 text-start">{t(group.label as any)}</span>
        <span className="text-[10px] text-white/30 tabular-nums">{group.items.length}</span>
      </button>
      {effectiveOpen && (
        <div className="space-y-0.5 mt-0.5">
          {group.items.map(it => <NavItemLink key={it.href} item={it} pathname={pathname} collapsed={collapsed} t={t} />)}
        </div>
      )}
    </div>
  );
}

function NavItemLink({
  item, pathname, collapsed, t,
}: {
  item: { href: string; key: string; icon: any; highlight?: boolean };
  pathname: string; collapsed: boolean; t: (k: any) => string;
}) {
  const active = pathname === item.href || pathname.startsWith(item.href + '/');
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={collapsed ? t(item.key as any) : undefined}
      className={[
        'flex items-center rounded-lg text-sm transition',
        collapsed ? 'gap-0 px-2 py-2.5 justify-center' : 'gap-3 px-3 py-2',
        active ? 'bg-white/10 text-white font-medium' : 'text-white/70 hover:bg-white/5 hover:text-white',
        item.highlight ? 'text-green hover:text-green' : '',
      ].join(' ')}
    >
      <Icon size={16} />
      {!collapsed && t(item.key as any)}
    </Link>
  );
}
