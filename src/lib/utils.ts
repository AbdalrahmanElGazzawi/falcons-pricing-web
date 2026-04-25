import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtMoney(n: number, ccy = 'SAR') {
  return `${ccy} ${Math.round(n).toLocaleString('en-US')}`;
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
  return s
    .split('_')
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join(' ');
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

/**
 * Format a SAR-canonical amount in the chosen presentation currency.
 * SAR stays as-is. USD divides by the rate (default 3.75 — Saudi peg).
 * AED is approximately 1:1 with SAR; we treat as no-op for now.
 *
 * Use this everywhere we display money on a quote / line / total — the
 * engine computes in SAR; only the presentation layer converts.
 */
export function fmtCurrency(sar: number, ccy: string = 'SAR', rate: number = 3.75): string {
  const n = Number(sar) || 0;
  if (ccy === 'USD') {
    const usd = rate > 0 ? n / rate : n;
    return `$ ${Math.round(usd).toLocaleString('en-US')}`;
  }
  if (ccy === 'AED') {
    return `AED ${Math.round(n).toLocaleString('en-US')}`;
  }
  return `SAR ${Math.round(n).toLocaleString('en-US')}`;
}

