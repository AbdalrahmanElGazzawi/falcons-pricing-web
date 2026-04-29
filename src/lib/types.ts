export type UserRole = 'admin' | 'sales' | 'finance' | 'viewer';

export type QuoteStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'sent_to_client'
  | 'client_approved'
  | 'client_rejected'
  | 'closed_won'
  | 'closed_lost';

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  is_active: boolean;
}

export interface Player {
  id: number;
  nickname: string;
  full_name?: string;
  role?: string;
  game?: string;
  team?: string;
  nationality?: string;
  tier_code?: string;
  avatar_url?: string;
  date_of_birth?: string;  // ISO yyyy-mm-dd
  ingame_role?: string;    // SMG, Flex, Tank, etc.
  rate_ig_reel: number;
  rate_ig_static: number;
  rate_ig_story: number;
  rate_ig_repost: number;
  rate_ig_share: number;
  rate_tiktok_video: number;
  rate_tiktok_repost: number;
  rate_tiktok_share: number;
  rate_yt_short: number;
  rate_x_post: number;
  rate_x_repost: number;
  rate_x_share: number;
  rate_fb_post: number;
  rate_twitch_stream: number;
  rate_twitch_integ: number;
  rate_kick_stream: number;
  rate_kick_integ: number;
  rate_usage_monthly: number;
  rate_promo_monthly: number;
  rate_irl: number;
  commission: number;
  markup: number;
  floor_share: number;
  authority_factor: number;
  default_seasonality: number;
  default_language: number;
  default_audience?: number;
  default_engagement?: number;
  measurement_confidence: 'pending' | 'estimated' | 'rounded' | 'exact';
  notes?: string;
  x_handle?: string;
  instagram?: string;
  twitch?: string;
  youtube?: string;
  tiktok?: string;
  kick?: string;
  facebook?: string;
  snapchat?: string;
  link_in_bio?: string;
  followers_ig?: number;
  followers_twitch?: number;
  followers_yt?: number;
  followers_tiktok?: number;
  followers_x?: number;
  followers_fb?: number;
  followers_snap?: number;
  followers_kick?: number;
  // Agency representation
  agency_status?: 'direct' | 'agency' | 'unknown';
  agency_name?: string | null;
  agency_contact?: string | null;
}

export interface Creator {
  id: number;
  nickname: string;
  score?: number;
  tier_code?: string;
  rate_x_post_quote: number;
  rate_x_repost: number;
  rate_ig_post: number;
  rate_ig_story: number;
  rate_ig_reels: number;
  rate_yt_full: number;
  rate_yt_preroll: number;
  rate_yt_shorts: number;
  rate_snapchat: number;
  rate_tiktok_ours: number;
  rate_tiktok_client: number;
  rate_event_snap: number;
  rate_twitch_kick_live: number;
  rate_kick_irl: number;
  rate_telegram: number;
  rate_usage_monthly: number;
  rate_promo_monthly: number;
  default_audience?: number;
  default_engagement?: number;
  default_authority?: number;
  default_language?: number;
  default_seasonality?: number;
  avatar_url?: string | null;
  full_name?: string | null;
  nationality?: string | null;
  handle_ig?: string | null;
  handle_x?: string | null;
  handle_yt?: string | null;
  handle_tiktok?: string | null;
  handle_twitch?: string | null;
  followers_ig?: number | null;
  followers_x?: number | null;
  followers_yt?: number | null;
  followers_tiktok?: number | null;
  followers_twitch?: number | null;
  is_active?: boolean | null;
  notes?: string;
  link?: string;
}

export interface Tier {
  id: number;
  code: string;
  label: string;
  follower_threshold?: string;
  engagement_range?: string;
  audience_quality?: string;
  authority_signal?: string;
  base_fee_min?: number;
  base_fee_max?: number;
  floor_share: number;
  promotion_trigger?: string;
  demotion_trigger?: string;
  sort_order: number;
}

export interface Addon {
  id: number;
  label: string;
  uplift_pct: number;
  description?: string;
  is_active: boolean;
  sort_order: number;
}

export interface Quote {
  id: string;
  quote_number: string;
  client_name: string;
  client_email?: string;
  campaign?: string;
  owner_id?: string;
  owner_email?: string;
  currency: string;
  vat_rate: number;
  eng_factor: number;
  audience_factor: number;
  seasonality_factor: number;
  content_type_factor: number;
  language_factor: number;
  authority_factor: number;
  objective_weight: number;
  measurement_confidence: 'pending' | 'estimated' | 'rounded' | 'exact';
  subtotal: number;
  addons_uplift_pct: number;
  pre_vat: number;
  vat_amount: number;
  total: number;
  status: QuoteStatus;
  notes?: string;
  internal_notes?: string;
  client_token: string;
  client_responded_at?: string;
  client_response?: string;
  created_at: string;
  updated_at: string;
  sent_at?: string;
}

export interface QuoteLine {
  id: string;
  quote_id: string;
  sort_order: number;
  talent_type: 'player' | 'creator';
  player_id?: number;
  creator_id?: number;
  talent_name: string;
  platform: string;
  base_rate: number;
  qty: number;
  final_unit: number;
  final_amount: number;
  is_companion?: boolean;
}

export type PlatformGroup = 'Social Media' | 'Live & Stream' | 'On-Ground & Events' | 'Continuity & Rights' | 'Other' | 'Campaign Archetypes';

/**
 * Player deliverables. `manual: true` means there's no fixed per-player rate
 * (e.g. Podcast Guesting, Fan Meet) — sales enters the rate when adding the
 * line. Mirrors the v7 Apps Script DELIVERABLES table.
 */
export const PLAYER_PLATFORMS = [
  // Social Media — fixed rates per player
  { key: 'rate_ig_reel',       label: 'IG Reel',            group: 'Social Media' as PlatformGroup,        manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_ig_static',     label: 'IG Static',          group: 'Social Media' as PlatformGroup,        manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_ig_story',      label: 'IG Story',           group: 'Social Media' as PlatformGroup,        manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_ig_repost',     label: 'IG Repost',          group: 'Social Media' as PlatformGroup,        manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_ig_share',      label: 'IG Share to Story',  group: 'Social Media' as PlatformGroup,        manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_tiktok_video',  label: 'TikTok Video',       group: 'Social Media' as PlatformGroup,        manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_tiktok_repost', label: 'TikTok Repost',      group: 'Social Media' as PlatformGroup,        manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_tiktok_share',  label: 'TikTok Stitch/Duet', group: 'Social Media' as PlatformGroup,        manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_yt_short',      label: 'YT Short',           group: 'Social Media' as PlatformGroup,        manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_x_post',        label: 'X Post',             group: 'Social Media' as PlatformGroup,        manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_x_repost',      label: 'X Retweet',          group: 'Social Media' as PlatformGroup,        manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_x_share',       label: 'X Quote Tweet',      group: 'Social Media' as PlatformGroup,        manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_fb_post',       label: 'FB Post / Video',    group: 'Social Media' as PlatformGroup,        manual: false, suggestedRange: null as null | [number, number] },
  // Live & Stream
  { key: 'rate_twitch_stream', label: 'Twitch Stream 2h',   group: 'Live & Stream' as PlatformGroup,       manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_twitch_integ', label: 'Twitch Integration',  group: 'Live & Stream' as PlatformGroup,       manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_kick_stream',  label: 'Kick Stream 2h',      group: 'Live & Stream' as PlatformGroup,       manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_kick_integ',   label: 'Kick Integration',    group: 'Live & Stream' as PlatformGroup,       manual: false, suggestedRange: null as null | [number, number] },
  // On-Ground & Events
  { key: 'rate_irl',           label: 'IRL Appearance',     group: 'On-Ground & Events' as PlatformGroup,  manual: false, suggestedRange: null as null | [number, number] },
  // Continuity & Rights — qty = number of months. Per-talent rate. Sales sets months as the quantity.
  { key: 'rate_usage_monthly', label: '1-Month Usage Rights', group: 'Continuity & Rights' as PlatformGroup,  manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_promo_monthly', label: '1-Month Promotion (channel rotation)', group: 'Continuity & Rights' as PlatformGroup, manual: false, suggestedRange: null as null | [number, number] },
  // Manual entries — suggestedRange is the SAR range to anchor sales when typing.
  // Sourced from v7 methodology hourly-cost tables + the Falcons Rate Cards.
  { key: 'manual_podcast',     label: 'Podcast Guesting',    group: 'On-Ground & Events' as PlatformGroup, manual: true, suggestedRange: [2000, 8000]   as [number, number] },
  { key: 'manual_pr_csr',      label: 'PR Appearance (CSR)', group: 'On-Ground & Events' as PlatformGroup, manual: true, suggestedRange: [3000, 12000]  as [number, number] },
  { key: 'manual_fan_meet',    label: 'Fan Meet & Greet',    group: 'On-Ground & Events' as PlatformGroup, manual: true, suggestedRange: [4000, 15000]  as [number, number] },
  { key: 'manual_photo_shoot', label: 'Photo Shoot (Brand)', group: 'Other' as PlatformGroup,              manual: true, suggestedRange: [3000, 12000]  as [number, number] },
  { key: 'manual_snapchat',    label: 'Snapchat Coverage',   group: 'Other' as PlatformGroup,              manual: true, suggestedRange: [1500, 25000]  as [number, number] },
  { key: 'manual_repost',      label: 'Content Repost',      group: 'Other' as PlatformGroup,              manual: true, suggestedRange: [800, 4000]    as [number, number] },
] as const;

export const CREATOR_PLATFORMS = [
  // Per-platform fixed rates (from creator's rate card)
  { key: 'rate_x_post_quote',      label: 'X Post / Quote',      group: 'Social Media' as PlatformGroup,        manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_x_repost',          label: 'X Repost',            group: 'Social Media' as PlatformGroup,        manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_ig_post',           label: 'IG Post',             group: 'Social Media' as PlatformGroup,        manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_ig_story',          label: 'IG Story',            group: 'Social Media' as PlatformGroup,        manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_ig_reels',          label: 'IG Reels',            group: 'Social Media' as PlatformGroup,        manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_yt_full',           label: 'YT Full Video',       group: 'Social Media' as PlatformGroup,        manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_yt_preroll',        label: 'YT 1–2min Pre-roll',  group: 'Social Media' as PlatformGroup,        manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_yt_shorts',         label: 'YT Shorts',           group: 'Social Media' as PlatformGroup,        manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_snapchat',          label: 'Snapchat',            group: 'Social Media' as PlatformGroup,        manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_tiktok_ours',       label: 'TikTok – Falcons Account (Ours)', group: 'Social Media' as PlatformGroup,        manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_tiktok_client',     label: 'TikTok – Client Account (Theirs)', group: 'Social Media' as PlatformGroup,        manual: false, suggestedRange: null as null | [number, number] },
  // Live & On-Ground
  { key: 'rate_twitch_kick_live',  label: 'Twitch / Kick Live',  group: 'Live & Stream' as PlatformGroup,       manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_kick_irl',          label: 'Kick IRL',            group: 'Live & Stream' as PlatformGroup,       manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_event_snap',        label: 'Event + Snap',        group: 'On-Ground & Events' as PlatformGroup,  manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_telegram',          label: 'Telegram Broadcast',  group: 'Other' as PlatformGroup,               manual: false, suggestedRange: null as null | [number, number] },
  // Continuity & Rights — qty = number of months. Per-creator rate. Sales sets months as the quantity.
  { key: 'rate_usage_monthly',     label: '1-Month Usage Rights',                group: 'Continuity & Rights' as PlatformGroup,  manual: false, suggestedRange: null as null | [number, number] },
  { key: 'rate_promo_monthly',     label: '1-Month Promotion (channel rotation)', group: 'Continuity & Rights' as PlatformGroup, manual: false, suggestedRange: null as null | [number, number] },
  // Campaign archetypes — manual entries for creator-led packages.
  // SAR ranges based on Saudi market norms; refine when Shikenso data lands.
  { key: 'archetype_lifestyle',    label: 'Lifestyle Campaign',  group: 'Campaign Archetypes' as PlatformGroup, manual: true,  suggestedRange: [15000, 50000]  as [number, number] },
  { key: 'archetype_dayinlife',    label: 'Day-in-the-Life',     group: 'Campaign Archetypes' as PlatformGroup, manual: true,  suggestedRange: [8000, 30000]   as [number, number] },
  { key: 'archetype_ambassador',   label: 'Brand Ambassador (monthly)', group: 'Campaign Archetypes' as PlatformGroup, manual: true, suggestedRange: [20000, 75000]  as [number, number] },
  { key: 'archetype_unboxing',     label: 'Product Unboxing',    group: 'Campaign Archetypes' as PlatformGroup, manual: true,  suggestedRange: [3000, 10000]   as [number, number] },
  { key: 'archetype_event',        label: 'Event Activation',    group: 'Campaign Archetypes' as PlatformGroup, manual: true,  suggestedRange: [5000, 25000]   as [number, number] },
  { key: 'archetype_always_on',    label: 'Always-On Partnership (quarter)', group: 'Campaign Archetypes' as PlatformGroup, manual: true, suggestedRange: [50000, 200000] as [number, number] },
] as const;

// ── Sales Log (realized revenue ledger) ─────────────────────────────────────

export type SalesStatus = 'in_progress' | 'waiting_for_payment' | 'payment_collected' | 'cancelled';

export interface SalesEntry {
  id: string;
  deal_date: string;             // ISO date
  category: string;              // 'Esports Influencer' default
  talent_name: string;           // Arabic-supported free text
  creator_id: number | null;
  player_id: number | null;
  brand_name: string | null;
  description: string | null;
  platform: string | null;
  amount_usd: number;
  amount_sar: number;
  total_with_vat_sar: number;
  vat_rate: number;
  status: SalesStatus;
  invoice_issued: boolean;
  payment_collected: boolean;
  claim_filed: boolean;
  cc_pay: boolean;
  quote_id: string | null;
  attachments: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Esports Teams (owned media channels) ─────────────────────────────────────
export interface EsportsTeam {
  id: number;
  game: string;
  team_name: string;
  logo_url: string | null;
  brand_color: string | null;
  handle_ig: string | null;
  handle_x: string | null;
  handle_tiktok: string | null;
  handle_yt: string | null;
  handle_twitch: string | null;
  handle_kick: string | null;
  discord_url: string | null;
  followers_ig: number;
  followers_x: number;
  followers_tiktok: number;
  subscribers_yt: number;
  followers_twitch: number;
  is_active: boolean;
  sort_order: number;
  notes: string | null;
}
