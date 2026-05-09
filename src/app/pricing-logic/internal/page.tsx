import { requireStaff, isSuperAdminEmail } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function InternalPricingLogicPage() {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return <AccessDenied message="Staff only." />;

  // Pull live state for the deep-dive
  const [
    { count: activePlayers },
    { count: activeCreators },
    { data: tierDist },
    { data: archetypeDist },
    { data: confidenceDist },
    { data: latestEngine },
  ] = await Promise.all([
    supabase.from('players').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('creators').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('players').select('authority_tier').eq('is_active', true),
    supabase.from('players').select('archetype').eq('is_active', true),
    supabase.from('players').select('rate_source').eq('is_active', true),
    supabase.from('pricing_engine_versions').select('*').order('id', { ascending: false }).limit(1),
  ]);

  const counts = (rows: any[] | null, key: string) => {
    const m: Record<string, number> = {};
    for (const r of rows ?? []) {
      const k = r[key] || '—';
      m[k] = (m[k] ?? 0) + 1;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };
  const at = counts(tierDist as any[], 'authority_tier');
  const ar = counts(archetypeDist as any[], 'archetype');
  const rs = counts(confidenceDist as any[], 'rate_source');
  const engine = latestEngine?.[0];

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <Link href="/pricing-logic" className="inline-flex items-center gap-1 text-sm text-label hover:text-ink mb-3">
        <ArrowLeft size={14} /> Public pricing logic
      </Link>
      <PageHeader
        title="Pricing Logic — Internal Deep Dive"
        subtitle={`Admin-only · Engine ${engine?.version ?? 'unknown'} · live state`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="card card-p">
          <h3 className="font-bold text-ink mb-2">Live state (this minute)</h3>
          <ul className="text-sm space-y-1 text-label">
            <li><strong>{activePlayers}</strong> active players · <strong>{activeCreators}</strong> active creators</li>
            <li>Engine: <code>{engine?.version}</code> · migration {engine?.migration_version}</li>
            <li>SOT reference: {engine?.sot_reference}</li>
            <li>Active from: {engine?.active_from?.toString().slice(0, 10)}</li>
          </ul>
        </section>

        <section className="card card-p">
          <h3 className="font-bold text-ink mb-2">Authority Tier distribution</h3>
          <ul className="text-sm space-y-1">
            {at.map(([k, v]) => <li key={k}><span className="text-mute w-32 inline-block">{k}</span><strong>{v}</strong></li>)}
          </ul>
        </section>

        <section className="card card-p">
          <h3 className="font-bold text-ink mb-2">Archetype distribution</h3>
          <ul className="text-sm space-y-1">
            {ar.map(([k, v]) => <li key={k}><span className="text-mute w-44 inline-block capitalize">{k.replace(/_/g, ' ')}</span><strong>{v}</strong></li>)}
          </ul>
        </section>

        <section className="card card-p">
          <h3 className="font-bold text-ink mb-2">Rate source distribution (data confidence proxy)</h3>
          <ul className="text-sm space-y-1">
            {rs.map(([k, v]) => <li key={k}><span className="text-mute w-44 inline-block">{k}</span><strong>{v}</strong></li>)}
          </ul>
        </section>

        <section className="card card-p lg:col-span-2">
          <h3 className="font-bold text-ink mb-2">Override mechanics + role assignments</h3>
          <ul className="text-sm space-y-2 text-label">
            <li><strong>authority_tier_override</strong> — admin only. Set on player edit page when scraper miss is suspected (NiKo / Cellium / Hikaru / karrigan auto-derived too low).</li>
            <li><strong>archetype_override</strong> — admin only. Flip a player from regional_pro → world_class_pro when commercial value warrants.</li>
            <li><strong>floor_override_reason</strong> — required header field when any line prices below 50% of base. Logged to audit_log with quote ID + actor.</li>
            <li><strong>Approval bypass</strong> — only <code>profile.role = &apos;admin&apos;</code> can save quotes that hit the 5 gates (discount &gt; 25%, perpetual rights, etc).</li>
          </ul>

          <h3 className="font-bold text-ink mb-2 mt-4">Commission + markup (admin-only)</h3>
          <p className="text-sm text-label">
            Players + creators have <code>commission</code> (Falcons take as fraction) and <code>markup</code> (Falcons margin uplift). These are <em>internal cost structure only</em> — never visible to brands and never rendered on the client-facing PDF. The Quote Builder uses these to compute the talent payout in the F/A/S/C panel for the staff-only view.
          </p>

          <h3 className="font-bold text-ink mb-2 mt-4">Quick links</h3>
          <ul className="text-sm space-y-1">
            <li>· <Link href="/admin/market-bands" className="text-greenDark hover:underline">Market bands editor</Link></li>
            <li>· <Link href="/admin/audit-log" className="text-greenDark hover:underline">Audit log</Link></li>
            <li>· <Link href="/admin/health" className="text-greenDark hover:underline">Pricing OS health</Link></li>
            <li>· <Link href="/admin/inventory-assets" className="text-greenDark hover:underline">Inventory assets</Link></li>
            <li>· <Link href="/admin/deals" className="text-greenDark hover:underline">Closed-deal log</Link></li>
          </ul>
        </section>
      </div>
    </Shell>
  );
}
