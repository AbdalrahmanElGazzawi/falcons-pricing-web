import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { CreatorForm } from '../CreatorForm';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function EditCreator({ params }: { params: { id: string } }) {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return <AccessDenied message="Admin only." />;

  const { data: creator } = await supabase.from('creators').select('*').eq('id', Number(params.id)).single();
  if (!creator) notFound();

  const { data: tiers } = await supabase.from('tiers').select('code, label').order('sort_order');

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <Link href="/roster/creators" className="inline-flex items-center gap-1 text-sm text-label hover:text-ink mb-3">
        <ArrowLeft size={14} /> Creators
      </Link>
      <PageHeader title={`Edit · ${creator.nickname}`} />
      <CreatorForm creator={creator as any} tiers={tiers ?? []} />
    </Shell>
  );
}
