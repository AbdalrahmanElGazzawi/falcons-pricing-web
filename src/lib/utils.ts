import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Player } from '@/lib/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const TIER_REVIEW_THRESHOLDS: Array<{ code: string; min: number }> = [
  { code: 'Tier S', min: 1_000_000 },
  { code: 'Tier 1', min:   250_000 },
  { code: 'Tier 2', min:    50_000 },
  { code: 'Tier 3', min:    10_000 },
  { code: 'Tier 4', min:         0 },
];

export const TIER_REVIEW_RANK: Record<string, number> = {
  'Tier 4': 1, 'Tier 3': 2, 'Tier 2': 3, 'Tier 1': 4, 'Tier S': 5,
};

type ReachLike = Partial<Pick<
  Player,
  'followers_ig' | 'followers_twitch' | 'followers_yt' | 'followers_tiktok'
  | 'followers_x' | 'followers_fb' | 'followers_snap'
>> & { followers_kick?: number | null };

const num = (v: unknown): number => (Number(v) || 0);

export function fmtFollowers(n: number): string {
  const v = num(n);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}K`;
  return v.toLocaleString('en-US');
}

export function totalReach(p: ReachLike): number {
  return (
    num(p.followers_ig) + num(p.followers_twitch) + num(p.followers_yt) +
    num(p.followers_tiktok) + num(p.followers_x) + num(p.followers_fb) +
    num(p.followers_snap) + num(p.followers_kick)
  );
}

export function maxPlatformReach(p: ReachLike): number {
  return Math.max(
    num(p.followers_ig), num(p.followers_twitch), num(p.followers_yt),
    num(p.followers_tiktok), num(p.followers_x), num(p.followers_fb),
    num(p.followers_snap), num(p.followers_kick),
  );
}

export function expectedTierFromMax(
  max: number,
  thresholds: Array<{ code: string; min: number }> = TIER_REVIEW_THRESHOLDS,
): string {
  for (const t of thresholds) if (max >= t.min) return t.code;
  return thresholds[thresholds.length - 1]?.code ?? 'Tier 4';
}

export type TierReviewFlag = 'ok' | 'promote' | 'demote' | 'no-data';

export function tierReviewFlag(
  tierCode: string | null | undefined,
  max: number,
  opts: { tolerance?: number; thresholds?: Array<{ code: string; min: number }> } = {},
): TierReviewFlag {
  if (!max || max <= 0) return 'no-data';
  if (!tierCode) return 'no-data';
  const thresholds = opts.thresholds ?? TIER_REVIEW_THRESHOLDS;
  const tol = Math.max(0, Math.min(opts.tolerance ?? 0, 0.95));
  const expected = expectedTierFromMax(max, thresholds);
  if (expected === tierCode) return 'ok';
  if (tol > 0) {
    const expIdx = thresholds.findIndex(t => t.code === expected);
    const curIdx = thresholds.findIndex(t => t.code === tierCode);
    if (expIdx >= 0 && curIdx >= 0) {
      const cutoff = thresholds[Math.min(expIdx, curIdx)]?.min ?? 0;
      if (cutoff > 0 && Math.abs(max - cutoff) / cutoff <= tol) return 'ok';
    }
  }
  const expRank = TIER_REVIEW_RANK[expected] ?? 0;
  const curRank = TIER_REVIEW_RANK[tierCode] ?? 0;
  return expRank > curRank ? 'promote' : 'demote';
}

export function fmtMoney(n: number, ccy: string = 'SAR', rate: number = 3.75) {
  const v = Number(n) || 0;
  if (ccy === 'USD') { const usd = rate > 0 ? v / rate : v; return `$ ${Math.round(usd).toLocaleString('en-US')}`; }
  if (ccy === 'AED') { return `AED ${Math.round(v).toLocaleString('en-US')}`; }
  return `SAR ${Math.round(v).toLocaleString('en-US')}`;
}

export function fmtPct(n: number, digits = 1) {
  return `${(n * 100).toFixed(digits)}%`;
}

export function tierClass(code?: string) {
  switch (code) {
    case 'Tier S': return 'tier-S';
    case 'Tier 1': return 'tier-1';
    case 'Tier 2': return 'tier-2';
    case 'Tier 3': return 'tier-3';
    case 'Tier 4': return 'tier-4';
    default: return 'tier-4';
  }
}

export function statusLabel(s: string) {
  return s.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

export function statusColor(s: string) {
  switch (s) {
    case 'draft': return 'chip-grey';
    case 'pending_approval': return 'chip-peach';
    case 'approved': return 'chip-mint';
    case 'sent_to_client': return 'chip-sky';
    case 'client_approved': return 'chip-mint';
    case 'client_rejected': return 'bg-red-100 text-red-700 chip';
    case 'closed_won': return 'chip-mint';
    case 'closed_lost': return 'chip-grey';
    default: return 'chip-grey';
  }
}

export function fmtCurrency(sar: number, ccy: string = 'SAR', rate: number = 3.75): string {
  const n = Number(sar) || 0;
  if (ccy === 'USD') { const usd = rate > 0 ? n / rate : n; return `$ ${Math.round(usd).toLocaleString('en-US')}`; }
  if (ccy === 'AED') { return `AED ${Math.round(n).toLocaleString('en-US')}`; }
  return `SAR ${Math.round(n).toLocaleString('en-US')}`;
}
