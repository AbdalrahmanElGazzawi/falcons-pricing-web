'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import type { UserRole } from '@/lib/types';
import { isSuperAdminEmail } from '@/lib/super-admin';
import { LayoutDashboard, Users, FileText, PlusCircle, Settings, LogOut, UserCog, Sparkles, BookOpen, KeyRound, ScrollText } from 'lucide-react';

const NAV = (role: UserRole, email: string) => [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/quote/new', label: 'New Quote', icon: PlusCircle, highlight: true },
  { href: '/quotes', label: 'Quote Log', icon: FileText },
  { href: '/roster/players', label: 'Roster', icon: Users },
  { href: '/roster/creators', label: 'Creators', icon: Sparkles },
  ...(role === 'admin' ? [
    { href: '/admin/users', label: 'Users', icon: UserCog },
    { href: '/admin/tiers', label: 'Tiers', icon: Settings },
    { href: '/admin/addons', label: 'Add-ons', icon: Settings },
    { href: '/admin/assumptions', label: 'Assumptions', icon: BookOpen },
  ] : []),
  ...(isSuperAdminEmail(email) ? [
    { href: '/admin/audit-log', label: 'Audit Log', icon: ScrollText },
  ] : []),
];

/**
 * Pick a display username with graceful fallback:
 *   1. full_name from profile if present
 *   2. otherwise the email prefix (before the @), tidied up
 *   3. otherwise the literal 'User'
 * The email itself is intentionally NOT shown anywhere in the sidebar.
 */
function displayName(fullName: string | null | undefined, email: string): string {
  const trimmed = (fullName ?? '').trim();
  if (trimmed) return trimmed;
  const prefix = (email.split('@')[0] ?? '').replace(/[._-]+/g, ' ').trim();
  if (prefix) return prefix;
  return 'User';
}

export function Shell({
  role,
  email,
  fullName,
  children,
}: {
  role: UserRole;
  email: string;
  fullName?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const nav = NAV(role, email);
  const username = displayName(fullName, email);
  const superAdmin = isSuperAdminEmail(email);

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-navy text-white flex flex-col flex-shrink-0">
        <div className="px-5 py-5 flex items-center gap-3 border-b border-white/10">
          <img src="/falcon-mark.png" alt="Team Falcons" className="w-10 h-10" />
          <div>
            <div className="font-semibold text-sm leading-none">Team Falcons</div>
            <div className="text-white/50 text-[11px] mt-1">Pricing OS</div>
          </div>
        </div>

        <nav className="p-3 flex-1 space-y-0.5">
          {nav.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition',
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
            <div
              className="text-white/90 font-medium truncate capitalize"
              title={username}
            >
              {username}
            </div>
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
            className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white">
            <KeyRound size={16} /> Change password
          </Link>
          <button onClick={signOut}
            className="mt-1 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white">
            <LogOut size={16} /> Sign out
          </button>
          <div className="text-center text-white/30 text-[10px] mt-3 tracking-wide">
            Built by Abdalrahman elGazzawi
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="max-w-[1400px] mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
  crumbs,
  meta,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  /** Breadcrumb trail. Last item is treated as the current page. */
  crumbs?: Array<{ label: string; href?: string }>;
  /** Optional inline meta (chips, status, timestamps) shown under the title. */
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
          <h1 className="text-2xl font-semibold text-ink tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-label mt-1">{subtitle}</p>}
          {meta && <div className="mt-3 flex items-center gap-3 flex-wrap">{meta}</div>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
