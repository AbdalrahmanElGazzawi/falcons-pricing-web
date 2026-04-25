import Link from 'next/link';
import { requireSuperAdmin } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { PricingConsole } from './PricingConsole';

export const dynamic = 'force-dynamic';

export default async function PricingConsolePage() {
  const { denied, profile, supabase } = await requireSuperAdmin();
  if (denied) return <AccessDenied />;

  const [
    { data: axisOptions },
    { data: kb },
    { data: tiers },
    { data: addons },
  ] = await Promise.all([
    supabase.from('pricing_axis_options').select('*').order('axis_key').order('sort_order'),
    supabase.from('pricing_kb').select('*').order('section').order('sort_order'),
    supabase.from('tiers').select('*').order('sort_order'),
    supabase.from('addons').select('*').order('sort_order'),
  ]);

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title="Pricing Console"
        subtitle="The canonical source of truth for the pricing engine — axes, platform logic, best practices, guardrails, roadmap. Editable by super admin only."
        action={
          <div className="flex items-center gap-2">
            <Link href="/admin/tiers" className="btn btn-ghost text-sm">Tiers →</Link>
            <Link href="/admin/addons" className="btn btn-ghost text-sm">Add-ons →</Link>
          </div>
        }
      />
      <PricingConsole
        axisOptions={axisOptions ?? []}
        kb={kb ?? []}
        tiers={tiers ?? []}
        addons={addons ?? []}
      />
    </Shell>
  );
}
