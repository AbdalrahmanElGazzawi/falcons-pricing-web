import { requireStaff } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { fmtCurrency } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface Asset {
  id: number;
  asset_key: string;
  asset_name: string;
  asset_type: string;
  scarcity_level: string;
  available_windows: string | null;
  base_price_sar: number | null;
  pricing_rule: string | null;
  description: string | null;
  is_active: boolean;
}

const TYPE_COLOR: Record<string, string> = {
  production_access: 'bg-purple-50 text-purple-900 border-purple-200',
  event_premium:     'bg-amber-50 text-amber-900 border-amber-200',
  narrative:         'bg-rose-50 text-rose-900 border-rose-200',
  location:          'bg-blue-50 text-blue-900 border-blue-200',
  demographic:       'bg-pink-50 text-pink-900 border-pink-200',
  bundle_efficiency: 'bg-greenSoft text-greenDark border-green/30',
};

const SCARCITY_COLOR: Record<string, string> = {
  rare:       'bg-rose-100 text-rose-900',
  seasonal:   'bg-amber-100 text-amber-900',
  always_on:  'bg-zinc-100 text-zinc-700',
};

export default async function InventoryAssetsPage() {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return <AccessDenied />;

  const { data: assets } = await supabase
    .from('inventory_assets')
    .select('*')
    .eq('is_active', true)
    .order('asset_type');

  const list: Asset[] = (assets ?? []) as any;

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title="Falcons Inventory Assets"
        subtitle="Quoteable rows that only Falcons can sell — HQ access, EWC home-field, Saudi premium etc."
      />
      <p className="text-sm text-mute mb-6">
        These assets stack <strong>on top</strong> of talent fees in a quote (manual line item for now;
        the QuoteBuilder picker integration ships next push). Sales can reference them by key in custom-line notes.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {list.map(a => (
          <div key={a.id} className={`rounded-xl border ${TYPE_COLOR[a.asset_type] ?? 'bg-bg border-line'} p-5`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-semibold text-lg leading-tight">{a.asset_name}</div>
                <code className="text-[10px] text-mute">{a.asset_key}</code>
              </div>
              <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${SCARCITY_COLOR[a.scarcity_level] ?? ''}`}>
                {a.scarcity_level.replace('_', ' ')}
              </span>
            </div>
            <p className="text-sm leading-relaxed mb-3">{a.description}</p>
            <div className="space-y-1 text-xs border-t border-current/10 pt-3">
              {a.base_price_sar != null && (
                <div><span className="font-semibold">Base price:</span> {fmtCurrency(Number(a.base_price_sar), 'SAR', 3.75)}</div>
              )}
              {a.pricing_rule && <div><span className="font-semibold">Pricing rule:</span> {a.pricing_rule}</div>}
              {a.available_windows && <div><span className="font-semibold">Available:</span> {a.available_windows}</div>}
            </div>
          </div>
        ))}
      </div>
      {list.length === 0 && (
        <div className="rounded-lg border border-line bg-bg p-12 text-center">
          <p className="text-sm text-mute">No inventory assets seeded.</p>
        </div>
      )}
    </Shell>
  );
}
