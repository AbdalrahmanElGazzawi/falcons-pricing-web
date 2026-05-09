import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { PlayerForm } from '../PlayerForm';
import { ArrowLeft } from 'lucide-react';
import { AuthorityChip } from '@/components/AuthorityChip';
import { ArchetypeChip } from '@/components/ArchetypeChip';
import { ConfidenceChip } from '@/components/ConfidenceChip';

export const dynamic = 'force-dynamic';

export default async function EditPlayer({ params }: { params: { id: string } }) {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return <AccessDenied message="Admin only." />;

  const { data: player } = await supabase.from('players').select('*').eq('id', Number(params.id)).single();
  if (!player) notFound();

  const { data: tiers } = await supabase.from('tiers').select('code, label').order('sort_order');

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <Link href="/roster/players" className="inline-flex items-center gap-1 text-sm text-label hover:text-ink mb-3">
        <ArrowLeft size={14} /> Players
      </Link>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <AuthorityChip player={player as any} size="md" showPremium />
        <ArchetypeChip player={player as any} size="md" />
        <ConfidenceChip player={player as any} />
      </div>
      <PageHeader
        title={`Edit · ${player.nickname}`}
        action={(
          <Link
            href={`/admin/players/${player.id}/pricing`}
            className="btn btn-ghost text-sm"
          >
            Pricing audit →
          </Link>
        )}
      />
      <PlayerForm player={player} tiers={tiers ?? []} />
    </Shell>
  );
}
