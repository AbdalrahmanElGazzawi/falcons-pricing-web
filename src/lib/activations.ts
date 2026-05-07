// =============================================================================
// Activations Catalogue · shared types + labels + helpers
// =============================================================================
// Safe to import from client components. Server-only fetchers live in
// activations-server.ts.
// =============================================================================

export type ActivationKind = 'canonical' | 'library' | 'sub';
export type ActivationPillar =
  | 'broadcast' | 'stream' | 'content' | 'digital' | 'facility'
  | 'event'     | 'talent' | 'hospitality' | 'publisher';
export type ActivationCohort = 'players' | 'influencers' | 'creators' | 'mixed';
export type ActivationComplexity =
  | 'plug_and_play' | 'managed_series' | 'hero_moment' | 'embedded_partnership';
export type ActivationStatus = 'active' | 'draft' | 'retired' | 'coming_soon';

export interface ActivationIncludesItem  { body: string; icon?: string; }
export interface ActivationRoiItem        { label: string; value: string; unit?: string; desc?: string; }
export interface ActivationPnPAssetItem   { asset: string; spec: string; }
export interface ActivationCaseStudy      { brand: string; campaign: string; reach?: string; multiplier?: string; }

export interface Activation {
  id:                       string;
  slug:                     string;
  position:                 number;
  kind:                     ActivationKind;
  name:                     string;
  archetype_text:           string | null;
  positioning:              string | null;
  pillar:                   ActivationPillar;
  cohorts:                  ActivationCohort[];
  complexity:               ActivationComplexity;
  event_anchor:             string[];
  falcons_ip:               string | null;
  target_brand_categories:  string[];
  price_floor_sar:          number | null;
  price_ceiling_sar:        number | null;
  pricing_term:             string | null;
  effort_player:            number | null;
  effort_falcons:           number | null;
  effort_player_label:      string | null;
  effort_falcons_label:     string | null;
  includes:                 ActivationIncludesItem[];
  roi_projections:          ActivationRoiItem[];
  plug_and_play_assets:     ActivationPnPAssetItem[];
  pnp_footer:               string | null;
  hero_photo_path:          string | null;
  talent_photo_paths:       string[] | null;
  case_studies:             ActivationCaseStudy[];
  parent_id:                string | null;
  is_featured:              boolean;
  status:                   ActivationStatus;
  created_at:               string;
  updated_at:               string;
}

// ─── presentation labels ────────────────────────────────────────────────────
export const PILLAR_LABEL: Record<ActivationPillar, string> = {
  broadcast: 'Broadcast', stream: 'Stream', content: 'Content', digital: 'Digital',
  facility: 'Facility',  event:  'Event',  talent:  'Talent',  hospitality: 'Hospitality',
  publisher: 'Publisher',
};
export const COHORT_LABEL: Record<ActivationCohort, string> = {
  players: 'Players', influencers: 'Influencers', creators: 'Creators', mixed: 'Mixed',
};
export const COMPLEXITY_LABEL: Record<ActivationComplexity, string> = {
  plug_and_play:        'Plug & Play',
  managed_series:       'Managed Series',
  hero_moment:          'Hero Moment',
  embedded_partnership: 'Embedded Partnership',
};

// Falcons-owned IPs surfaced as cards on the catalogue
export const FALCONS_IPS = [
  { id: 'falcons_podcast',         mono: 'PD', name: 'Falcons Podcast',         format: 'Arabic multi-host show, ~600K views/episode',  audience: 'MENA Arabic-speaking gaming audience' },
  { id: 'falcons_academy',         mono: 'AC', name: 'Falcons Academy',         format: 'CoD development pathway · next-gen Saudi pros', audience: 'Long-term brand-association on emerging talent' },
  { id: 'falcons_vega',            mono: 'VG', name: 'Falcons Vega',            format: "Women's esports — MLBB · Valorant · Overwatch", audience: "MENA women's competitive audience" },
  { id: 'falcons_force',           mono: 'FC', name: 'Falcons Force',           format: 'CS2 junior team · ages 14-19 pipeline',         audience: 'Eastern European CS2 pipeline' },
  { id: 'falcons_invitational',    mono: 'IN', name: 'Falcons Invitational',    format: 'Annual Falcons-owned tournament',               audience: 'Tier-1 esports event audience' },
  { id: 'falcons_community_cup',   mono: 'CC', name: 'Community Cup',           format: 'Smaller community-tier branded tournament',     audience: 'Grassroots community' },
  { id: 'falcons_nest',            mono: 'FN', name: 'Falcons Nest',            format: 'Year-round public gaming zone, Riyadh Boulevard', audience: 'Walk-in MENA fan audience' },
  { id: 'command_center',          mono: 'CM', name: 'Command Center',          format: 'Branded streaming room build-out at HQ',        audience: 'Visible across all production output' },
  { id: 'beat_the_pro',            mono: 'BP', name: 'Beat the Pro',            format: 'Recurring fan-vs-pro fan activation',           audience: 'Direct fan engagement' },
  { id: 'saudi_esports_marathon',  mono: 'SM', name: 'Saudi Esports Marathon',  format: 'Abo Najd 14h marathon broadcast',               audience: 'Premium Arabic broadcast moment' },
  { id: 'luxury_vs_budget',        mono: 'LB', name: 'Luxury vs Budget',        format: 'Falcons YouTube series · 50M+ views/season',    audience: 'Hardware / peripherals / lifestyle' },
] as const;

export type FalconsIp = typeof FALCONS_IPS[number];

// ─── format helpers ─────────────────────────────────────────────────────────
export function fmtSar(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000)     return Math.round(n / 1_000) + 'K';
  return n.toLocaleString('en-US');
}
