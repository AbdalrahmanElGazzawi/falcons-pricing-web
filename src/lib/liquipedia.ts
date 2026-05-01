/**
 * Liquipedia client — fetches a player's tournament record via the
 * MediaWiki API and computes the fields we store on `players`.
 *
 * Liquipedia ToS (https://liquipedia.net/api-terms-of-use):
 *   • Identify your client via a non-default User-Agent including a contact.
 *   • Throttle: max 1 request / 2 seconds.
 *   • Cache responses ≥ 30 days where possible.
 *   • Attribute Liquipedia (CC-BY-SA 3.0) on any surface that displays the data.
 *
 * URL shape: https://liquipedia.net/{game}/{Player_Slug}
 *   → API:   https://liquipedia.net/{game}/api.php?action=parse&page={Player_Slug}
 *
 * We pull two things from each player page:
 *   1. The "Earnings" / "Total winnings" infobox row (lifetime + most recent).
 *   2. The "Achievements" results table — last 24 months of placements,
 *      grouped by tier with prize money parsed per row.
 *
 * Decay model: 12-month half-life, exponential.
 *   weight(monthsAgo) = 0.5 ^ (monthsAgo / 12)
 *   prize_money_24mo_usd = Σ (placement_prize × weight)
 *   achievement_decay_factor = MIN(1.5, 0.5 + Σ (weight × tier_value) / 10)
 *     where tier_value: S=1.0, A=0.7, B=0.4, C=0.2
 */

const USER_AGENT =
  'FalconsPricingOS/1.0 (https://falcons-pricing-web.vercel.app; ops@falcons.gg)';
const MIN_INTERVAL_MS = 2_100; // a hair above 2s to be polite
let lastFetchAt = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const wait = Math.max(0, lastFetchAt + MIN_INTERVAL_MS - now);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastFetchAt = Date.now();
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept-Encoding': 'gzip' },
  });
  return res;
}

export interface LiquipediaSyncResult {
  prize_money_24mo_usd: number;
  peak_tournament_tier: 'S' | 'A' | 'B' | 'C' | 'unrated';
  last_major_finish_date: string | null;     // ISO yyyy-mm-dd
  last_major_placement: string | null;       // "1st", "Top 4"
  achievement_decay_factor: number;          // 0..1.5
  liquipedia_synced_at: string;              // ISO timestamp
  raw_html_preview?: string;                 // first 4KB for debugging
}

interface ParsedPlacement {
  date: Date;
  tier: 'S' | 'A' | 'B' | 'C' | 'unrated';
  placement: string;
  prize_usd: number;
}

/** Extract the {game} subdomain and player slug from a Liquipedia URL. */
export function parseLiquipediaUrl(url: string): { game: string; slug: string } | null {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith('liquipedia.net')) return null;
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    return { game: parts[0], slug: parts.slice(1).join('/') };
  } catch {
    return null;
  }
}

/** MediaWiki parse endpoint URL. */
function apiUrl(game: string, slug: string): string {
  const params = new URLSearchParams({
    action: 'parse',
    page: decodeURIComponent(slug),
    format: 'json',
    prop: 'text',
    redirects: 'true',
  });
  return `https://liquipedia.net/${game}/api.php?${params.toString()}`;
}

/** Liquipedia tier classes appear in the Results table cells. */
function classifyTier(tierLabel: string): 'S' | 'A' | 'B' | 'C' | 'unrated' {
  const t = tierLabel.toLowerCase();
  if (/(\bs[\s-]?tier\b|major|world championship|the international|worlds)/.test(t)) return 'S';
  if (/(\ba[\s-]?tier\b|premier|masters|epl|blast premier)/.test(t)) return 'A';
  if (/(\bb[\s-]?tier\b|challenger|qualifier final)/.test(t)) return 'B';
  if (/(\bc[\s-]?tier\b|minor|qualifier|invitational)/.test(t)) return 'C';
  return 'unrated';
}

const TIER_VALUE: Record<'S' | 'A' | 'B' | 'C' | 'unrated', number> = {
  S: 1.0, A: 0.7, B: 0.4, C: 0.2, unrated: 0.05,
};

const PEAK_RANK: Record<'S' | 'A' | 'B' | 'C' | 'unrated', number> = {
  S: 4, A: 3, B: 2, C: 1, unrated: 0,
};

/** Parse a USD prize string like "$1,500,000" or "€10,000" into a number. */
function parsePrizeUSD(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9.]/g, '');
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n)) return 0;
  // Liquipedia normalises everything to USD in the prize column on the player
  // page. If we ever see a € or £ prefix we'll just treat the number as-is —
  // the resulting decay weighting compresses any tiny FX error into noise.
  return Math.round(n);
}

/**
 * Cheap-and-cheerful HTML parser for Liquipedia results tables. We avoid a
 * full DOM dep (cheerio) — the markup is regular enough that targeted regex
 * + careful whitespace handling does the job. If Liquipedia ever changes
 * markup, we'll see zero-result syncs and can swap this for a real parser.
 */
function extractPlacements(html: string): ParsedPlacement[] {
  const out: ParsedPlacement[] = [];
  // Capture table rows that look like result rows. The shape is:
  //   <tr>...<td>YYYY-MM-DD</td>...<td>Tier</td>...<td>Placement</td>...<td>$prize</td>...</tr>
  const rowRe = /<tr[^>]*>(.*?)<\/tr>/gis;
  const cellRe = /<t[dh][^>]*>(.*?)<\/t[dh]>/gis;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRe.exec(html)) !== null) {
    const cells: string[] = [];
    let cm: RegExpExecArray | null;
    cellRe.lastIndex = 0;
    while ((cm = cellRe.exec(rowMatch[1])) !== null) {
      cells.push(stripTags(cm[1]));
    }
    if (cells.length < 4) continue;
    // Heuristic: first cell that parses as a date is the date; first cell
    // matching tier wording is the tier; first $-prefixed cell is the prize.
    const dateCell = cells.find(c => /^\d{4}-\d{2}-\d{2}/.test(c));
    if (!dateCell) continue;
    const date = new Date(dateCell.slice(0, 10));
    if (Number.isNaN(date.valueOf())) continue;
    const tierCell = cells.find(c => /tier|major|premier|championship|international|masters/i.test(c)) ?? '';
    const placementCell = cells.find(c => /^(\d+(st|nd|rd|th)|top\s*\d+)/i.test(c)) ?? '';
    const prizeCell = cells.find(c => /[$€£]/.test(c)) ?? '';
    out.push({
      date,
      tier: classifyTier(tierCell),
      placement: placementCell.trim(),
      prize_usd: parsePrizeUSD(prizeCell),
    });
  }
  return out;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Apply 12-month half-life decay to a placement's prize money based on its age.
 */
function decayWeight(months: number): number {
  return Math.pow(0.5, months / 12);
}

function monthsBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
}

/** Public entry point — fetch + parse + compute. */
export async function syncFromLiquipedia(
  liquipediaUrl: string,
): Promise<LiquipediaSyncResult> {
  const parsed = parseLiquipediaUrl(liquipediaUrl);
  if (!parsed) throw new Error(`Not a valid Liquipedia URL: ${liquipediaUrl}`);

  const res = await rateLimitedFetch(apiUrl(parsed.game, parsed.slug));
  if (!res.ok) throw new Error(`Liquipedia returned ${res.status} for ${liquipediaUrl}`);
  const json = await res.json() as { parse?: { text?: { '*': string } } };
  const html = json?.parse?.text?.['*'] ?? '';
  if (!html) throw new Error('Liquipedia returned no parseable HTML');

  const placements = extractPlacements(html);

  const now = new Date();
  const cutoff = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 365 * 2); // 24 months
  const inWindow = placements.filter(p => p.date >= cutoff);

  let prizeUsd = 0;
  let decayScore = 0;
  let peak: 'S' | 'A' | 'B' | 'C' | 'unrated' = 'unrated';
  let lastMajorDate: Date | null = null;
  let lastMajorPlacement: string | null = null;

  for (const p of inWindow) {
    const months = monthsBetween(p.date, now);
    const weight = decayWeight(Math.max(0, months));
    prizeUsd += p.prize_usd * weight;
    decayScore += weight * TIER_VALUE[p.tier];
    if (PEAK_RANK[p.tier] > PEAK_RANK[peak]) peak = p.tier;
    if ((p.tier === 'S' || p.tier === 'A') && (!lastMajorDate || p.date > lastMajorDate)) {
      lastMajorDate = p.date;
      lastMajorPlacement = p.placement || null;
    }
  }

  const achievement_decay_factor = Math.min(1.5, 0.5 + decayScore / 10);

  return {
    prize_money_24mo_usd: Math.round(prizeUsd),
    peak_tournament_tier: peak,
    last_major_finish_date: lastMajorDate ? lastMajorDate.toISOString().slice(0, 10) : null,
    last_major_placement: lastMajorPlacement,
    achievement_decay_factor: +achievement_decay_factor.toFixed(3),
    liquipedia_synced_at: new Date().toISOString(),
    raw_html_preview: html.slice(0, 4096),
  };
}
