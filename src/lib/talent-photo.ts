/**
 * Talent photo resolver.
 *
 * Falcons stores `avatar_url` for explicitly-uploaded portraits. When that's
 * empty, fall back to unavatar.io — a free third-party that proxies social-
 * platform avatars. unavatar.io serves a 404 image if it can't find one, so
 * the chain never breaks rendering.
 *
 *   prefer chain:
 *     avatar_url        (explicit upload, highest fidelity)
 *     instagram         (most common across our roster)
 *     x_handle / Twitter
 *     tiktok
 *     twitch
 *     youtube
 *
 * Returns { url, source } so the UI can mark auto-derived photos with a
 * small dotted-ring badge (so admins know to upload a real one if needed).
 */

export type AvatarSource =
  | 'explicit'
  | 'instagram'
  | 'twitter'
  | 'tiktok'
  | 'twitch'
  | 'youtube'
  | 'placeholder';

interface HandleHaving {
  avatar_url?: string | null;
  instagram?: string | null;
  x_handle?: string | null;
  tiktok?: string | null;
  twitch?: string | null;
  youtube?: string | null;
}

const stripHandle = (s: string | null | undefined): string => {
  if (!s) return '';
  const t = s.trim().replace(/^@+/, '');
  // pull from URL if a full URL was pasted
  const m = t.match(/(?:instagram\.com|tiktok\.com\/@?|twitter\.com|x\.com|twitch\.tv|youtube\.com\/@?)([^/?#]+)/);
  return (m ? m[1] : t).replace(/^@+/, '');
};

export function resolveTalentPhoto(p: HandleHaving | null | undefined): { url: string | null; source: AvatarSource } {
  if (!p) return { url: null, source: 'placeholder' };

  if (p.avatar_url && p.avatar_url.trim()) {
    return { url: p.avatar_url, source: 'explicit' };
  }
  const ig = stripHandle(p.instagram);
  if (ig) return { url: `https://unavatar.io/instagram/${ig}?fallback=false`, source: 'instagram' };
  const x = stripHandle(p.x_handle);
  if (x) return { url: `https://unavatar.io/twitter/${x}?fallback=false`, source: 'twitter' };
  const tt = stripHandle(p.tiktok);
  if (tt) return { url: `https://unavatar.io/tiktok/${tt}?fallback=false`, source: 'tiktok' };
  const tw = stripHandle(p.twitch);
  if (tw) return { url: `https://unavatar.io/twitch/${tw}?fallback=false`, source: 'twitch' };
  const yt = stripHandle(p.youtube);
  if (yt) return { url: `https://unavatar.io/youtube/${yt}?fallback=false`, source: 'youtube' };
  return { url: null, source: 'placeholder' };
}

export function isAuto(source: AvatarSource): boolean {
  return source !== 'explicit' && source !== 'placeholder';
}

/**
 * Audience market for currency display.
 *   KSA + MENA → SAR primary
 *   Anyone else (incl. global esports talent) → USD primary
 */
export function audienceMarketFor(nat: string | null | undefined): 'KSA' | 'MENA' | 'Global' {
  const n = (nat ?? '').trim().toLowerCase();
  if (!n) return 'Global';
  if (n.startsWith('saudi')) return 'KSA';
  const mena = ['emirati','bahraini','kuwaiti','qatari','omani',
                'egyptian','jordanian','lebanese','tunisian','moroccan','algerian','iraqi','syrian','palestinian','yemeni','sudanese'];
  if (mena.includes(n)) return 'MENA';
  return 'Global';
}
