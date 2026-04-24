'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import type { UserRole } from '@/lib/types';
import { LayoutDashboard, Users, FileText, PlusCircle, Settings, LogOut, UserCog, Sparkles, BookOpen } from 'lucide-react';

const NAV = (role: UserRole) => [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/quote/new', label: 'New Quote', icon: PlusCircle, highlight: true },
  { href: '/quotes', label: 'Quote Log', icon: FileText },
  { href: '/roster/players', label: 'Players', icon: Users },
  { href: '/roster/creators', label: 'Creators', icon: Sparkles },
  ...(role === 'admin' ? [
    { href: '/admin/users', label: 'Users', icon: UserCog },
    { href: '/admin/tiers', label: 'Tiers', icon: Settings },
    { href: '/admin/addons', label: 'Add-ons', icon: Settings },
    { href: '/admin/assumptions', label: 'Assumptions', icon: BookOpen },
  ] : []),
];

export function Shell({
  role,
  email,
  children,
}: {
  role: UserRole;
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const nav = NAV(role);

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
            <div className="text-white/90 font-medium truncate">{email}</div>
            <div className="text-white/50 capitalize">{role}</div>
          </div>
          <button onClick={signOut}
            className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white">
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
}: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        {subtitle && <p className="text-sm text-label mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
