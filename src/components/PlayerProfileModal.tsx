'use client';
import { useEffect, useState } from 'react';
import {
  X, Trophy, Briefcase, Instagram, Twitter, Twitch, Youtube,
  ExternalLink, Calendar, Gamepad2, Award, Users,
} from 'lucide-react';

interface PlayerDetail {
  id: number;
  nickname: string;
  full_name?: string | null;
  game?: string | null;
  ingame_role?: string | null;
  tier_code?: string | null;
  avatar_url?: string | null;
  date_of_birth?: string | null;
  bio?: string | null;
  achievements?: string[] | null;
  agency_status?: 'direct' | 'agency' | 'unknown' | null;
  agency_name?: string | null;
  agency_contact?: string | null;
  // Socials
  x_handle?: string | null;
  instagram?: string | null;
  twitch?: string | null;
  youtube?: string | null;
  tiktok?: string | null;
  kick?: string | null;
  facebook?: string | null;
  snapchat?: string | null;
  link_in_bio?: string | null;
  // Followers
  followers_ig?: number;
  followers_twitch?: number;
  followers_yt?: number;
  followers_tiktok?: number;
  followers_x?: number;
  followers_fb?: number;
  followers_snap?: number;
}

function fmtFollow(n: number | null | undefined): string {
  const v = Number(n || 0);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1_000)     return (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return v.toLocaleString('en-US');
}

function calcAge(dob?: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const ms = Date.now() - d.getTime();
  return Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000));
}

export function PlayerProfileModal({
  playerId, onClose,
}: {
  playerId: number | null;
  onClose: () => void;
}) {
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (playerId == null) { setPlayer(null); return; }
    setLoading(true); setErr(null);
    fetch(`/api/players/${playerId}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(setPlayer)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [playerId]);

  // Lock body scroll
  useEffect(() => {
    if (playerId == null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [playerId]);

  // Esc to close
  useEffect(() => {
    if (playerId == null) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playerId, onClose]);

  if (playerId == null) return null;

  const age = calcAge(player?.date_of_birth);
  const initials = (player?.nickname || '??').slice(0, 2).toUpperCase();

  // Build social rows from the columns that have actual handles
  const socialDefs = player ? [
    { key: 'instagram', icon: Instagram, label: 'Instagram', handle: player.instagram, followers: player.followers_ig,
      url: player.instagram ? `https://instagram.com/${String(player.instagram).replace(/^@/, '')}` : null },
    { key: 'tiktok',    icon: () => <span className="text-[10px] font-bold">TT</span>, label: 'TikTok', handle: player.tiktok, followers: player.followers_tiktok,
      url: player.tiktok ? `https://tiktok.com/@${String(player.tiktok).replace(/^@/, '')}` : null },
    { key: 'x',         icon: Twitter, label: 'X / Twitter', handle: player.x_handle, followers: player.followers_x,
      url: player.x_handle ? `https://x.com/${String(player.x_handle).replace(/^@/, '')}` : null },
    { key: 'twitch',    icon: Twitch, label: 'Twitch', handle: player.twitch, followers: player.followers_twitch,
      url: player.twitch ? `https://twitch.tv/${player.twitch}` : null },
    { key: 'youtube',   icon: Youtube, label: 'YouTube', handle: player.youtube, followers: player.followers_yt,
      url: player.youtube ? `https://youtube.com/@${String(player.youtube).replace(/^@/, '')}` : null },
    { key: 'kick',      icon: () => <span className="text-[10px] font-bold">K</span>, label: 'Kick', handle: player.kick, followers: 0,
      url: player.kick ? `https://kick.com/${player.kick}` : null },
  ].filter(s => s.handle) : [];

  const totalReach = player ? (
    Number(player.followers_ig || 0) +
    Number(player.followers_x || 0) +
    Number(player.followers_tiktok || 0) +
    Number(player.followers_yt || 0) +
    Number(player.followers_twitch || 0) +
    Number(player.followers_fb || 0) +
    Number(player.followers_snap || 0)
  ) : 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center pt-[5vh] sm:pt-[8vh] px-4 pb-4 overflow-y-auto">
      <button onClick={onClose} aria-label="Close"
        className="fixed inset-0 bg-navy/60 backdrop-blur-sm" />

      <div className="relative w-full max-w-2xl card overflow-hidden shadow-2xl">
        {/* Hero header — gradient + avatar + name */}
        <div className="bg-gradient-to-br from-navy via-navy to-navy/90 text-white relative">
          <button onClick={onClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 grid place-items-center text-white">
            <X size={16} />
          </button>

          {loading && !player ? (
            <div className="p-8 text-center text-white/60">Loading…</div>
          ) : err ? (
            <div className="p-8 text-center text-red-300">{err}</div>
          ) : player ? (
            <div className="p-6 flex flex-col sm:flex-row gap-4">
              {/* Avatar */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-white/10 flex-shrink-0 grid place-items-center">
                {player.avatar_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={player.avatar_url} alt={player.nickname}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                  <div className="text-3xl font-bold text-white/40">{initials}</div>
                )}
              </div>

              {/* Identity */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold truncate">{player.nickname}</h2>
                  {player.tier_code && (
                    <span className={[
                      'text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded',
                      player.tier_code === 'Tier S' ? 'bg-amber-500 text-white' : 'bg-white/15 text-white/80',
                    ].join(' ')}>{player.tier_code}</span>
                  )}
                </div>
                {player.full_name && player.full_name !== player.nickname && (
                  <div className="text-sm text-white/70">{player.full_name}</div>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-white/70">
                  {player.game && <span className="flex items-center gap-1"><Gamepad2 size={12} /> {player.game}</span>}
                  {player.ingame_role && <span className="flex items-center gap-1"><Award size={12} /> {player.ingame_role}</span>}
                  {age !== null && <span className="flex items-center gap-1"><Calendar size={12} /> {age}y</span>}
                </div>

                {/* Total reach + agency tag */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {totalReach > 0 && (
                    <span className="px-2 py-1 rounded-md bg-green/20 text-green text-xs font-semibold flex items-center gap-1">
                      <Users size={11} /> {fmtFollow(totalReach)} total reach
                    </span>
                  )}
                  {player.agency_status === 'agency' ? (
                    <span className="px-2 py-1 rounded-md bg-blue-500/20 text-blue-200 text-xs font-medium flex items-center gap-1"
                      title={`${player.agency_name ?? ''}${player.agency_contact ? ' · ' + player.agency_contact : ''}`}>
                      <Briefcase size={11} /> {player.agency_name || player.agency_contact || 'Agency-managed'}
                    </span>
                  ) : player.agency_status === 'direct' ? (
                    <span className="px-2 py-1 rounded-md bg-green/20 text-green text-xs font-medium">Direct</span>
                  ) : (
                    <span className="px-2 py-1 rounded-md bg-white/10 text-white/60 text-xs font-medium">Agency: unknown</span>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {player && (
          <div className="p-6 space-y-5">
            {/* Bio */}
            {player.bio && (
              <p className="text-sm text-ink leading-relaxed">{player.bio}</p>
            )}

            {/* Achievements */}
            {player.achievements && player.achievements.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wider text-label font-semibold mb-2 flex items-center gap-1.5">
                  <Trophy size={12} className="text-amber-500" /> Achievements
                </div>
                <ul className="space-y-1.5">
                  {player.achievements.map((a, i) => (
                    <li key={i} className="text-sm text-ink flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">▸</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Socials */}
            {socialDefs.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wider text-label font-semibold mb-2">Socials</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {socialDefs.map((s) => {
                    const Icon = s.icon as any;
                    return (
                      <a
                        key={s.key}
                        href={s.url ?? '#'}
                        target="_blank" rel="noreferrer"
                        className="flex items-center gap-3 p-2.5 rounded-lg border border-line hover:border-green hover:bg-greenSoft transition group"
                      >
                        <div className="w-8 h-8 rounded grid place-items-center bg-bg text-label group-hover:bg-green/15 group-hover:text-greenDark">
                          <Icon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs uppercase tracking-wide text-label">{s.label}</div>
                          <div className="text-sm font-medium text-ink truncate">@{String(s.handle).replace(/^@/, '')}</div>
                        </div>
                        {(s.followers ?? 0) > 0 && (
                          <span className="text-xs text-greenDark font-semibold tabular-nums whitespace-nowrap">{fmtFollow(s.followers)}</span>
                        )}
                        <ExternalLink size={11} className="text-mute" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty state if nothing populated */}
            {!player.bio && (!player.achievements || player.achievements.length === 0) && socialDefs.length === 0 && (
              <div className="text-center py-6 text-mute text-sm">
                No bio, achievements, or socials captured yet for this player.
                <br />
                <a href={`/admin/users`} className="text-greenDark hover:underline text-xs">
                  Add via admin →
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
