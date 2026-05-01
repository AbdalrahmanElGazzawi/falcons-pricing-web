'use client';
import { useState } from 'react';
/**
 * Talent avatar with graceful fallback chain:
 *   1. If avatar_url is an http(s) URL → render <img />.
 *      Drive thumbnail URLs are transformed to lh3.googleusercontent.com,
 *      which is the same image served from Google's CDN — reliable on mobile.
 *      drive.google.com/thumbnail rate-limits and sometimes returns HTML
 *      instead of image bytes (especially on Saudi mobile carriers).
 *   2. On image load error → fall back to initials.
 *   3. If no URL → render initials directly.
 */
function isDisplayableUrl(s: string | undefined | null): boolean {
  if (!s) return false;
  return /^https?:\/\//.test(s) || s.startsWith("/");
}

/**
 * Convert any Google Drive sharing/thumbnail URL to lh3.googleusercontent.com
 * which serves the same file reliably on mobile.
 *
 *   drive.google.com/thumbnail?id=ABC          → lh3.googleusercontent.com/d/ABC=w400
 *   drive.google.com/thumbnail?id=ABC&sz=w400  → lh3.googleusercontent.com/d/ABC=w400
 *   drive.google.com/uc?id=ABC                 → lh3.googleusercontent.com/d/ABC=w400
 *   drive.google.com/file/d/ABC/view           → lh3.googleusercontent.com/d/ABC=w400
 *   anything else                              → unchanged
 */
export function normalizeImageUrl(src: string): string {
  if (!src) return src;
  const m =
    src.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
    src.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    src.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m && /drive\.google\.com|googleusercontent\.com/.test(src)) {
    return `https://lh3.googleusercontent.com/d/${m[1]}=w400`;
  }
  return src;
}

function initials(name: string): string {
  const parts = name.trim().split(/[\s_\-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZES = {
  sm: 'w-8 h-8 text-[11px]',
  md: 'w-10 h-10 text-xs',
  lg: 'w-14 h-14 text-sm',
  xl: 'w-20 h-20 text-base',
} as const;

export function Avatar({
  src, name, size = 'md',
}: {
  src?: string | null;
  name: string;
  size?: keyof typeof SIZES;
}) {
  const sizeClasses = SIZES[size];
  const [errored, setErrored] = useState(false);
  const showImage = !errored && isDisplayableUrl(src);
  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={normalizeImageUrl(src!)}
        alt={name}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setErrored(true)}
        className={`${sizeClasses} rounded-full object-cover bg-bg border border-line`}
      />
    );
  }
  return (
    <div
      className={`${sizeClasses} rounded-full bg-greenSoft text-greenDark border border-line flex items-center justify-center font-semibold uppercase tracking-tight`}
      aria-label={name}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
