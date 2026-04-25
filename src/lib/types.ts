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
  rate_tiktok_video: number;
  rate_yt_short: number;
  rate_x_post: number;
  rate_fb_post: number;
  rate_twitch_stream: number;
  rate_twitch_integ: number;
  rate_irl: number;
  commission: number;
  markup: number;
  floor_share: number;
  authority_factor: number;
  default_seasonality: number;
  default_language: number;
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
}

export type PlatformGroup = 'Social Media' | 'Live & Stream' | 'On-Ground & Events' | 'Other';

/**
 * Player deliverables. `manual: true` means there's no fixed per-player rate
 * (e.g. Podcast Guesting, Fan Meet) — sales enters the rate when adding the
 * line. Mirrors the v7 Apps Script DELIVERABLES table.
 */
export const PLAYER_PLATFORMS = [
  // Social Media — fixed rates per player
  { key: 'rate_ig_reel',       label: 'IG Reel',            group: 'Social Media' as PlatformGroup,        manual: false },
  { key: 'rate_ig_static',     label: 'IG Static',          group: 'Social Media' as PlatformGroup,        manual: false },
  { key: 'rate_ig_story',      label: 'IG Story',           group: 'Social Media' as PlatformGroup,        manual: false },
  { key: 'rate_tiktok_video',  label: 'TikTok Video',       group: 'Social Media' as PlatformGroup,        manual: false },
  { key: 'rate_yt_short',      label: 'YT Short',           group: 'Social Media' as PlatformGroup,        manual: false },
  { key: 'rate_x_post',        label: 'X Post',             group: 'Social Media' as PlatformGroup,        manual: false },
  { key: 'rate_fb_post',       label: 'FB Post / Video',    group: 'Social Media' as PlatformGroup,        manual: false },
  // Live & Stream
  { key: 'rate_twitch_stream', label: 'Twitch Stream 2h',   group: 'Live & Stream' as PlatformGroup,       manual: false },
  { key: 'rate_twitch_integ', label: 'Twitch Integration',  group: 'Live & Stream' as PlatformGroup,       manual: false },
  // On-Ground & Events
  { key: 'rate_irl',           label: 'IRL Appearance',     group: 'On-Ground & Events' as PlatformGroup,  manual: false },
  { key: 'manual_podcast',     label: 'Podcast Guesting',   group: 'On-Ground & Events' as PlatformGroup,  manual: true  },
  { key: 'manual_pr_csr',      label: 'PR Appearance (CSR)', group: 'On-Ground & Events' as PlatformGroup, manual: true  },
  { key: 'manual_fan_meet',    label: 'Fan Meet & Greet',   group: 'On-Ground & Events' as PlatformGroup,  manual: true  },
  // Other
  { key: 'manual_photo_shoot', label: 'Photo Shoot (Brand)', group: 'Other' as PlatformGroup,              manual: true  },
  { key: 'manual_snapchat',    label: 'Snapchat Coverage',  group: 'Other' as PlatformGroup,               manual: true  },
  { key: 'manual_repost',      label: 'Content Repost',     group: 'Other' as PlatformGroup,               manual: true  },
] as const;

export const CREATOR_PLATFORMS = [
  { key: 'rate_x_post_quote', label: 'X Post / Quote' },
  { key: 'rate_x_repost', label: 'X Repost' },
  { key: 'rate_ig_post', label: 'IG Post' },
  { key: 'rate_ig_story', label: 'IG Story' },
  { key: 'rate_ig_reels', label: 'IG Reels' },
  { key: 'rate_yt_full', label: 'YT Full Video' },
  { key: 'rate_yt_preroll', label: 'YT 1–2min Pre-roll' },
  { key: 'rate_yt_shorts', label: 'YT Shorts' },
  { key: 'rate_snapchat', label: 'Snapchat' },
  { key: 'rate_tiktok_ours', label: 'TikTok Our-side' },
  { key: 'rate_tiktok_client', label: 'TikTok Client Vids' },
  { key: 'rate_event_snap', label: 'Event + Snap' },
  { key: 'rate_twitch_kick_live', label: 'Twitch / Kick Live' },
  { key: 'rate_kick_irl', label: 'Kick IRL' },
  { key: 'rate_telegram', label: 'Telegram' },
] as const;
