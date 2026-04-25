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
        title="Calculator"
        subtitle="Quick price checks for inbound DMs and casual asks. Build a basket, copy the number, send to a real quote when the deal moves forward."
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
