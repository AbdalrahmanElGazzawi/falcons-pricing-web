import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Benchmarks — Team Falcons Pricing OS',
  description: 'Region × tier × deliverable rate bands + named peer orgs.',
};

const REGION_LABEL: Record<string, string> = {
  KSA: 'Saudi Arabia (KSA)',
  MENA: 'MENA',
  EU: 'Europe',
  NA: 'North America',
  APAC: 'Asia-Pacific',
  GLOBAL: 'Global',
};
const REGION_ORDER = ['KSA','MENA','EU','NA','APAC','GLOBAL'];
const TIER_ORDER = ['Tier S','Tier 1','Tier 2','Tier 3','Tier 4'];

const PLATFORM_LABEL: Record<string,string> = {
  rate_ig_reel:      'IG Reel',
  rate_ig_post:      'IG Post / Story',
  rate_ig_repost:    'IG Repost',
  rate_tiktok_video: 'TikTok Video',
  rate_tiktok_repost:'TikTok Repost',
  rate_tiktok_share: 'TikTok Share',
  rate_yt_full:      'YouTube Long-form',
  rate_yt_short:     'YouTube Short',
  rate_yt_short_repost:'YT Short Repost',
  rate_irl:          'IRL Appearance',
};

const SOURCE_LABEL: Record<string, { label: string; tone: 'green'|'amber'|'mute' }> = {
  methodology_v2_baseline:   { label: 'Internal baseline',  tone: 'green' },
  closed_deal_history:       { label: 'Closed-deal data',   tone: 'green' },
  derived_alias:             { label: 'Derived alias',      tone: 'mute'  },
  derived_from_v015_ratio:   { label: 'Derived ratio',      tone: 'mute'  },
  modeled_regional_v1_2026:  { label: 'Modeled (regional)', tone: 'amber' },
};

export default async function BenchmarksPage({
  searchParams,
}: {
  searchParams: { region?: string; tier?: string };
}) {
  const region = (searchParams.region ?? 'KSA').toUpperCase();
  const tier   = searchParams.tier ?? 'Tier 2';
  const supabase = createServiceClient();

  const { data: bandsRaw } = await supabase
    .from('market_bands')
    .select('platform, min_sar, median_sar, max_sar, audience_market, source, tier_code')
    .eq('audience_market', region)
    .eq('tier_code', tier)
    .is('effective_to', null);

  const bands = (bandsRaw ?? []) as Array<{
    platform: string; min_sar: number; median_sar: number; max_sar: number;
    audience_market: string; source: string; tier_code: string;
  }>;

  const { data: peersRaw } = await supabase
    .from('peer_orgs')
    .select('org_name, region, primary_game, hq_country, followers_total, source_url, notes')
    .eq('region', region)
    .eq('is_active', true)
    .order('followers_total', { ascending: false });

  const peers = (peersRaw ?? []) as Array<{
    org_name: string; region: string; primary_game: string | null;
    hq_country: string | null; followers_total: number | null;
    source_url: string | null; notes: string | null;
  }>;

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-6">
        <header>
          <div className="text-[11px] uppercase tracking-wider text-mute font-bold">Reference</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink">Benchmarks</h1>
          <p className="text-sm text-label mt-1 max-w-2xl">
            Region × tier × deliverable rate bands. SAR per single posting, before
            engine multipliers. The intake page surfaces the same data in-context to
            each talent. Use the filters below to view different regions and tiers.
          </p>
        </header>

        {/* Filters */}
        <div className="rounded-2xl border border-line bg-card p-4 space-y-3">
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-mute font-bold">Region</div>
            <div className="flex flex-wrap gap-2">
              {REGION_ORDER.map(r => (
                <a key={r}
                   href={`?region=${encodeURIComponent(r)}&tier=${encodeURIComponent(tier)}`}
                   className={[
                     'px-3 py-1.5 rounded-lg text-xs font-semibold border transition',
                     region === r
                       ? 'bg-greenDark text-white border-greenDark'
                       : 'bg-bg text-ink border-line hover:border-greenDark/40',
                   ].join(' ')}>
                  {REGION_LABEL[r]}
                </a>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-mute font-bold">Tier</div>
            <div className="flex flex-wrap gap-2">
              {TIER_ORDER.map(t => (
                <a key={t}
                   href={`?region=${encodeURIComponent(region)}&tier=${encodeURIComponent(t)}`}
                   className={[
                     'px-3 py-1.5 rounded-lg text-xs font-semibold border transition',
                     tier === t
                       ? 'bg-greenDark text-white border-greenDark'
                       : 'bg-bg text-ink border-line hover:border-greenDark/40',
                   ].join(' ')}>
                  {t}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bands table */}
        <div className="rounded-2xl border border-line bg-card overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-line bg-bg/40 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-ink">{REGION_LABEL[region]} · {tier}</h2>
            <span className="text-[11px] text-mute">{bands.length} bands</span>
          </div>
          {bands.length === 0 ? (
            <div className="p-6 text-sm text-mute italic">No bands seeded for this region × tier yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-bg/50 text-mute uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="text-left px-4 py-2 font-bold">Deliverable</th>
                    <th className="text-right px-3 py-2 font-bold">Floor (SAR)</th>
                    <th className="text-right px-3 py-2 font-bold">Median (SAR)</th>
                    <th className="text-right px-3 py-2 font-bold">Premium (SAR)</th>
                    <th className="text-left px-4 py-2 font-bold">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {[...bands]
                    .sort((a,b) => (PLATFORM_LABEL[a.platform] ?? a.platform).localeCompare(PLATFORM_LABEL[b.platform] ?? b.platform))
                    .map(b => {
                    const meta = SOURCE_LABEL[b.source] ?? { label: b.source, tone: 'mute' as const };
                    const tone = meta.tone === 'green' ? 'bg-emerald-100 text-emerald-800'
                              : meta.tone === 'amber' ? 'bg-amber-100 text-amber-800'
                              : 'bg-bg text-mute';
                    return (
                      <tr key={b.platform} className="hover:bg-bg/30">
                        <td className="px-4 py-2 font-semibold text-ink">{PLATFORM_LABEL[b.platform] ?? b.platform}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{Math.round(Number(b.min_sar)).toLocaleString('en-US')}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-bold text-greenDark">{Math.round(Number(b.median_sar)).toLocaleString('en-US')}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{Math.round(Number(b.max_sar)).toLocaleString('en-US')}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${tone}`}>{meta.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Methodology block */}
        <div className="rounded-2xl border border-line bg-card p-4 sm:p-5 space-y-3">
          <h2 className="font-semibold text-ink">Methodology &amp; provenance</h2>
          <ul className="text-xs text-label space-y-2 leading-relaxed">
            <li>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 mr-2">Internal baseline / Closed-deal data</span>
              KSA, MENA, GLOBAL bands — sourced from Falcons internal methodology v2 plus historical closed-deal averages.
            </li>
            <li>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 mr-2">Modeled (regional)</span>
              EU, NA, APAC bands — derived from GLOBAL with documented per-platform multipliers
              (Migration 057). Multipliers chosen from Influencer Marketing Hub 2024 regional CPM data
              and HypeAuditor 2024 Q4 rate cards. These are placeholders to be replaced when per-region
              closed-deal data lands.
            </li>
            <li>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-bg text-mute mr-2">Derived alias / ratio</span>
              Platforms that share base economics (e.g. IG Story = IG Post; IG Repost = 70% of IG Reel).
              Same as parent platform; no independent source.
            </li>
          </ul>
          <details className="text-xs">
            <summary className="cursor-pointer font-semibold text-ink">Per-platform regional multipliers (over GLOBAL)</summary>
            <table className="w-full mt-2 text-[11px]">
              <thead><tr className="text-mute text-left"><th>Platform</th><th>EU</th><th>NA</th><th>APAC</th></tr></thead>
              <tbody>
                <tr><td>IG (reel/post/static/repost)</td><td>1.10×</td><td>1.30×</td><td>0.85×</td></tr>
                <tr><td>TikTok (all variants)</td><td>1.05×</td><td>1.30×</td><td>0.90×</td></tr>
                <tr><td>YouTube Short</td><td>1.10×</td><td>1.30×</td><td>0.85×</td></tr>
                <tr><td>YouTube Long-form</td><td>1.10×</td><td>1.30×</td><td>0.80×</td></tr>
                <tr><td>IRL Appearance</td><td>1.05×</td><td>1.20×</td><td>0.65×</td></tr>
              </tbody>
            </table>
            <p className="mt-2 text-mute italic">KSA holds 1.55× on IRL and TikTok — not derived from GLOBAL. Closed-deal pattern.</p>
          </details>
        </div>

        {/* Peer orgs panel */}
        <div className="rounded-2xl border border-line bg-card overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-line bg-bg/40">
            <h2 className="font-semibold text-ink">Named peer orgs · {REGION_LABEL[region]}</h2>
            <p className="text-[11px] text-mute mt-0.5">Public follower counts only. Player-level rates are NOT seeded here — they come from the bands above.</p>
          </div>
          {peers.length === 0 ? (
            <div className="p-6 text-sm text-mute italic">No peer orgs seeded for {region} yet.</div>
          ) : (
            <ul className="divide-y divide-line">
              {peers.map(p => (
                <li key={p.org_name} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold text-ink truncate">
                      {p.source_url ? (
                        <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="hover:underline text-greenDark">
                          {p.org_name}
                        </a>
                      ) : p.org_name}
                    </div>
                    <div className="text-mute text-[11px]">
                      {[p.primary_game, p.hq_country].filter(Boolean).join(' · ')}
                      {p.notes ? ' · ' + p.notes : ''}
                    </div>
                  </div>
                  <div className="text-right tabular-nums whitespace-nowrap">
                    <div className="text-ink font-semibold">{Number(p.followers_total ?? 0).toLocaleString('en-US')}</div>
                    <div className="text-[10px] text-mute uppercase tracking-wider">followers</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
