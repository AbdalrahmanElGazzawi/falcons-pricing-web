import { requireStaff } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { Calculator as CalcView } from './Calculator';

export const dynamic = 'force-dynamic';

export default async function CalculatorPage() {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return <AccessDenied />;

  const [
    { data: players },
    { data: creators },
    { data: tiers },
    { data: addons },
  ] = await Promise.all([
    supabase.from('players').select('*').eq('is_active', true).order('nickname'),
    supabase.from('creators').select('*').eq('is_active', true).order('nickname'),
    supabase.from('tiers').select('*').order('sort_order'),
    supabase.from('addons').select('*').eq('is_active', true).order('sort_order'),
  ]);

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title="Quick Estimate"
        subtitle="Step 0 — answer a DM, scope a brief, sanity-check a number. No client info, no save, no PDF. When the deal is real, click \"Send to quote\" and the basket carries straight into /quote/new with all the multipliers preserved."
      />
      <CalcView
        players={players ?? []}
        creators={creators ?? []}
        tiers={tiers ?? []}
        addons={addons ?? []}
      />
    </Shell>
  );
}
