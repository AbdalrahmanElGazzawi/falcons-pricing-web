import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { PlayerForm } from '../PlayerForm';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function NewPlayer() {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return <AccessDenied message="Admin only." />;

  const { data: tiers } = await supabase.from('tiers').select('code, label').order('sort_order');

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <Link href="/roster/players" className="inline-flex items-center gap-1 text-sm text-label hover:text-ink mb-3">
        <ArrowLeft size={14} /> Players
      </Link>
      <PageHeader title="New player" subtitle="Add a player to the rate card" />
      <PlayerForm player={null} tiers={tiers ?? []} />
    </Shell>
  );
}
