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
  Inbox, HelpCircle,
} from 'lucide-react';

const WELCOME_KEY = 'falcons_welcome_seen_v1';

const NAV = (role: UserRole, email: string) => [
  { href: '/dashboard',         label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/quote/new',         label: 'New Quote',  icon: PlusCircle, highlight: true },
  { href: '/quotes',            label: 'Quote Log',  icon: FileText },
  { href: '/inquiries',         label: 'Inquiries',  icon: Inbox },
  { href: '/roster/players',    label: 'Roster',     icon: Users },
  { href: '/roster/creators',   label: 'Creators',   icon: Sparkles },
  { href: '/admin/roadmap',     label: 'Roadmap',    icon: Map },
  { href: '/welcome',           label: 'About',      icon: HelpCircle },
  ...(role === 'admin' ? [
    { href: '/admin/users',       label: 'Users',       icon: UserCog },
    { href: '/admin/tiers',       label: 'Tiers',       icon: Settings },
    { href: '/admin/addons',      label: 'Add-ons',     icon: Settings },
    { href: '/admin/assumptions', label: 'Assumptions', icon: BookOpen },
  ] : []),
  ...(isSuperAdminEmail(email) ? [
    { href: '/admin/pricing',   label: 'Pricing OS', icon: Calculator },
    { href: '/admin/audit-log', label: 'Audit Log',  icon: ScrollText },
  ] : []),
];

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
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const nav = NAV(role, email);
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
          'lg:static lg:w-60 lg:translate-x-0',
          'fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw]',
          'transition-transform duration-200 ease-out',
          drawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <div className="px-5 py-5 flex items-center gap-3 border-b border-white/10">
          <img src="/falcon-mark.png" alt="Team Falcons" className="w-10 h-10" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm leading-none">Team Falcons</div>
            <div className="text-white/50 text-[11px] mt-1">Pricing OS</div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="lg:hidden p-1.5 -mr-1 rounded-md text-white/70 hover:text-white hover:bg-white/10"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="p-3 flex-1 space-y-0.5 overflow-y-auto">
          {nav.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition',
                  active ? 'bg-white/10 text-white font-medium' : 'text-white/70 hover:bg-white/5 hover:text-white',
                  item.highlight ? 'text-green hover:text-green' : '',
                ].join(' ')}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
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
          <Link href="/account/password"
            className="mt-2 w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white">
            <KeyRound size={16} /> Change password
          </Link>
          <button onClick={signOut}
            className="mt-1 w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white">
            <LogOut size={16} /> Sign out
          </button>
          <div className="text-center text-white/30 text-[10px] mt-3 tracking-wide">
            Built by Abdalrahman elGazzawi
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
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
