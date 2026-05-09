/**
 * AuthorityChip — surfaces a player's Authority Tier as a visible chip
 * (Migration 071, May 9 2026).
 *
 * Renders:
 *   🏆 World Champion   (AT-1, ×1.40 anchor lift)
 *   🥈 Major Finalist   (AT-2, ×1.20)
 *   ⭐ Tier-1 Active    (AT-3, ×1.10)
 *      Active Pro       (AT-4, ×1.00)
 *      Emerging         (AT-5, ×0.95)
 *
 * Renders nothing for AT-0 (No Authority Signal) — a coach or content-only
 * talent shouldn't visually claim a tier they haven't earned. Engine still
 * treats AT-0 as neutral 1.00 (the bug fix from 0.5).
 */

import { getAuthorityTierMeta, type AuthorityTier } from '@/lib/authority-tier';

interface Props {
  player: {
    authority_tier?: AuthorityTier | string | null;
    authority_tier_override?: AuthorityTier | string | null;
  };
  size?: 'sm' | 'md';
  showPremium?: boolean;
}

export function AuthorityChip({ player, size = 'sm', showPremium = false }: Props) {
  const meta = getAuthorityTierMeta(player);
  if (!meta || meta.tier === 'AT-0') return null;

  const colors: Record<AuthorityTier, string> = {
    'AT-1': 'bg-amber-100 text-amber-900 border-amber-300',
    'AT-2': 'bg-slate-100 text-slate-800 border-slate-300',
    'AT-3': 'bg-yellow-50 text-yellow-900 border-yellow-200',
    'AT-4': 'bg-zinc-50 text-zinc-700 border-zinc-200',
    'AT-5': 'bg-zinc-50 text-zinc-600 border-zinc-200',
    'AT-0': 'bg-zinc-50 text-zinc-500 border-zinc-200',
  };

  const padX = size === 'sm' ? 'px-2' : 'px-2.5';
  const padY = size === 'sm' ? 'py-0.5' : 'py-1';
  const text = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border ${colors[meta.tier]} ${padX} ${padY} ${text} font-semibold tracking-wide`}
      title={`${meta.displayLabel} — ${meta.description}. Anchor premium ×${meta.anchorPremium.toFixed(2)}.`}
    >
      {meta.chipEmoji && meta.chipEmoji !== '·' && <span>{meta.chipEmoji}</span>}
      <span>{meta.displayLabel}</span>
      {showPremium && meta.anchorPremium !== 1.0 && (
        <span className="opacity-70">·{meta.anchorPremium.toFixed(2)}×</span>
      )}
    </span>
  );
}

export default AuthorityChip;
