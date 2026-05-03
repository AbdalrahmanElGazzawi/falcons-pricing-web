'use client';
import { useEffect, useState } from 'react';
import {
  X, ExternalLink, Instagram, Music2, Youtube, Twitch, Twitter, Facebook,
  Trophy, Pencil, Save, ShieldCheck, Calendar, MapPin, Gamepad2, Award, Users,
} from 'lucide-react';
import Link from 'next/link';
import { Avatar } from './Avatar';

// ─── Generic drawer shell ──────────────────────────────────────────────────
function DrawerShell({
  open, onClose, children, title,
}: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <aside
        role="dialog"
        aria-label={title}
        className="absolute right-0 top-0 h-full w-full sm:w-[480px] bg-card shadow-2xl border-l border-line overflow-y-auto z-[61]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-card border-b border-line px-4 py-3">
          <div className="text-sm font-semibold text-ink truncate">{title}</div>
          <button onClick={onClose} aria-label="Close"
                  className="text-mute hover:text-ink p-1 -m-1">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 space-y-4">{children}</div>
      </aside>
    </div>
  );
}

// ─── Inline editable field ─────────────────────────────────────────────────
function EditableNumber({
  label, value, isAdmin, onCommit, suffix,
}: {
  label: string; value: number; isAdmin: boolean;
  onCommit: (v: number) => Promise<boolean>;
  suffix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value || 0));
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft(String(value || 0)); }, [value]);

  if (!isAdmin) {
    return (
      <Row label={label}>
        <span className="text-ink tabular-nums">{Number(value || 0).toLocaleString('en-US')}{suffix ? ` ${suffix}` : ''}</span>
      </Row>
    );
  }

  return (
    <Row label={label}>
      {editing ? (
        <span className="flex items-center gap-1">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value.replace(/[^\d]/g, ''))}
            className="w-24 text-right text-sm font-semibold tabular-nums border border-line rounded-md px-1.5 py-0.5 bg-bg focus:outline-none focus:ring-2 focus:ring-greenDark/40"
            autoFocus
          />
          <button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              const ok = await onCommit(Number(draft || 0));
              setSaving(false);
              if (ok) setEditing(false);
            }}
            className="text-greenDark hover:text-greenDark/80 disabled:opacity-50"
            aria-label="Save"
          ><Save size={13} /></button>
          <button onClick={() => { setDraft(String(value || 0)); setEditing(false); }}
                  className="text-mute hover:text-ink" aria-label="Cancel">
            <X size={13} />
          </button>
        </span>
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="text-ink tabular-nums hover:underline decoration-dotted decoration-mute inline-flex items-center gap-1"
          title="Click to edit"
        >
          {Number(value || 0).toLocaleString('en-US')}{suffix ? ` ${suffix}` : ''}
          <Pencil size={11} className="text-mute" />
        </button>
      )}
    </Row>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-line/60 text-xs">
      <span className="text-mute font-medium">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-bg/30 p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold text-label mb-2">
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

// ─── Player drawer ─────────────────────────────────────────────────────────
type AnyRecord = Record<string, any>;

export function PlayerQuickView({
  open, onClose, player, isAdmin, onPatch,
}: {
  open: boolean; onClose: () => void;
  player: AnyRecord;
  isAdmin: boolean;
  onPatch: (id: number, body: AnyRecord) => Promise<boolean>;
}) {
  const ageFromDob = (dob?: string | null) => {
    if (!dob) return null;
    const t = new Date(dob).getTime();
    if (Number.isNaN(t)) return null;
    return Math.floor((Date.now() - t) / (365.25 * 24 * 3600 * 1000));
  };
  const age = ageFromDob(player.date_of_birth);

  const SOCIAL = [
    { key: 'followers_ig',     handle: 'instagram', label: 'Instagram', icon: <Instagram size={12}/>, prefix: 'instagram.com/' },
    { key: 'followers_tiktok', handle: 'tiktok',    label: 'TikTok',    icon: <Music2 size={12}/>,    prefix: 'tiktok.com/@' },
    { key: 'followers_yt',     handle: 'youtube',   label: 'YouTube',   icon: <Youtube size={12}/>,   prefix: 'youtube.com/@' },
    { key: 'followers_twitch', handle: 'twitch',    label: 'Twitch',    icon: <Twitch size={12}/>,    prefix: 'twitch.tv/' },
    { key: 'followers_x',      handle: 'x_handle',  label: 'X / Twitter', icon: <Twitter size={12}/>, prefix: 'x.com/' },
    { key: 'followers_fb',     handle: 'facebook',  label: 'Facebook',  icon: <Facebook size={12}/>,  prefix: 'facebook.com/' },
  ];

  return (
    <DrawerShell open={open} onClose={onClose} title={player.nickname || 'Player'}>
      {/* Hero */}
      <div className="flex items-center gap-3">
        <Avatar src={player.avatar_url} name={player.nickname} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="text-lg font-bold text-ink truncate">{player.nickname}</div>
          {player.full_name && <div className="text-xs text-mute truncate">{player.full_name}</div>}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {player.tier_code && <span className="chip border bg-bg text-label">{player.tier_code}</span>}
            {player.role && <span className="text-[11px] text-mute">{player.role}</span>}
          </div>
        </div>
        <Link
          href={`/showcase?focus=${player.id}`}
          className="btn btn-ghost text-[11px] inline-flex items-center gap-1"
          title="Open full profile in showcase"
        >
          Full <ExternalLink size={11} />
        </Link>
      </div>

      {/* Quick facts */}
      <Section title="At a glance" icon={<Gamepad2 size={11}/>}>
        <Row label="Game">{player.game || '—'}</Row>
        <Row label="Team">{player.team || '—'}</Row>
        <Row label="In-game role">{player.ingame_role || '—'}</Row>
        <Row label="Nationality">{player.nationality || '—'}</Row>
        <Row label="Age">{age ?? '—'}</Row>
        {player.commission != null && (
          <Row label="Talent cut">
            {Math.round((1 - Number(player.commission)) * 100)}%
            <span className="text-mute"> · Falcons {Math.round(Number(player.commission) * 100)}%</span>
          </Row>
        )}
      </Section>

      {/* Socials + followers (editable) */}
      <Section title="Reach" icon={<Users size={11}/>}>
        {SOCIAL.map(s => {
          const handle = player[s.handle] as string | null | undefined;
          const followers = Number(player[s.key] || 0);
          if (!handle && followers === 0) return null;
          // Handle may be a full URL (post-dossier ingest) or bare handle (legacy)
          const isUrl = handle ? /^https?:\/\//i.test(String(handle).trim()) : false;
          const href = handle ? (isUrl ? String(handle).trim() : `https://${s.prefix}${String(handle).replace(/^@/, '')}`) : '#';
          const displayHandle = handle ? (isUrl
            ? (String(handle).match(/([^\/?#]+)\/?(?:$|[?#])/)?.[1] || String(handle))
            : String(handle).replace(/^@/, '')) : '';
          return (
            <div key={s.key} className="flex items-center justify-between gap-3 py-1.5 border-b border-line/60 text-xs">
              <span className="text-mute font-medium inline-flex items-center gap-1">{s.icon} {s.label}</span>
              <span className="text-right flex items-center gap-2">
                {handle && (
                  <a
                    href={href}
                    target="_blank" rel="noopener noreferrer"
                    className="text-greenDark hover:underline truncate max-w-[140px]"
                  >@{displayHandle.replace(/^@/, '')}</a>
                )}
                <EditableNumberInline
                  value={followers}
                  isAdmin={isAdmin}
                  onCommit={v => onPatch(player.id, { [s.key]: v })}
                />
              </span>
            </div>
          );
        })}
      </Section>

      {/* Key rates (editable) */}
      <Section title="Key rates (SAR per posting)" icon={<ShieldCheck size={11}/>}>
        <EditableNumber label="IG Reel"        value={Number(player.rate_ig_reel || 0)}        isAdmin={isAdmin} onCommit={v => onPatch(player.id, { rate_ig_reel: v })} />
        <EditableNumber label="IG Static"      value={Number(player.rate_ig_static || 0)}      isAdmin={isAdmin} onCommit={v => onPatch(player.id, { rate_ig_static: v })} />
        <EditableNumber label="TikTok Video"   value={Number(player.rate_tiktok_video || 0)}   isAdmin={isAdmin} onCommit={v => onPatch(player.id, { rate_tiktok_video: v })} />
        <EditableNumber label="YT Short"       value={Number(player.rate_yt_short || 0)}       isAdmin={isAdmin} onCommit={v => onPatch(player.id, { rate_yt_short: v })} />
        <EditableNumber label="X Post"         value={Number(player.rate_x_post || 0)}         isAdmin={isAdmin} onCommit={v => onPatch(player.id, { rate_x_post: v })} />
        <EditableNumber label="Twitch Stream"  value={Number(player.rate_twitch_stream || 0)}  isAdmin={isAdmin} onCommit={v => onPatch(player.id, { rate_twitch_stream: v })} />
        <EditableNumber label="IRL / Event"    value={Number(player.rate_irl || 0)}            isAdmin={isAdmin} onCommit={v => onPatch(player.id, { rate_irl: v })} />
      </Section>

      {/* Achievements (read-only here; edit via full form) */}
      {Array.isArray(player.achievements) && player.achievements.length > 0 && (
        <Section title="Achievements" icon={<Trophy size={11}/>}>
          <ul className="space-y-1 text-xs max-h-40 overflow-auto">
            {player.achievements.slice(0, 10).map((a: any, i: number) => (
              <li key={i} className="text-ink truncate">
                {typeof a === 'string' ? a : `${a.placement || ''} ${a.title || a.tier || ''} ${a.year ? '· ' + a.year : ''}`.trim()}
              </li>
            ))}
            {player.achievements.length > 10 && (
              <li className="text-mute italic">+ {player.achievements.length - 10} more — open full profile</li>
            )}
          </ul>
        </Section>
      )}

      {/* Footer actions */}
      {isAdmin && (
        <div className="flex items-center justify-between pt-2">
          <a
            href={`/admin/players/${player.id}`}
            className="btn btn-primary text-xs inline-flex items-center gap-1.5"
          >
            <Pencil size={12} /> Open full edit
          </a>
          {player.liquipedia_url && (
            <a href={player.liquipedia_url} target="_blank" rel="noopener noreferrer"
               className="text-xs text-mute hover:text-greenDark inline-flex items-center gap-1">
              Liquipedia <ExternalLink size={10} />
            </a>
          )}
        </div>
      )}
    </DrawerShell>
  );
}

// ─── Creator drawer ────────────────────────────────────────────────────────
export function CreatorQuickView({
  open, onClose, creator, isAdmin, onPatch,
}: {
  open: boolean; onClose: () => void;
  creator: AnyRecord;
  isAdmin: boolean;
  onPatch: (id: number, body: AnyRecord) => Promise<boolean>;
}) {
  const SOCIAL = [
    { key: 'followers_ig',     handle: 'handle_ig',     label: 'Instagram', icon: <Instagram size={12}/>, prefix: 'instagram.com/' },
    { key: 'followers_tiktok', handle: 'handle_tiktok', label: 'TikTok',    icon: <Music2 size={12}/>,    prefix: 'tiktok.com/@' },
    { key: 'followers_yt',     handle: 'handle_yt',     label: 'YouTube',   icon: <Youtube size={12}/>,   prefix: 'youtube.com/@' },
    { key: 'followers_twitch', handle: 'handle_twitch', label: 'Twitch',    icon: <Twitch size={12}/>,    prefix: 'twitch.tv/' },
    { key: 'followers_x',      handle: 'handle_x',      label: 'X / Twitter', icon: <Twitter size={12}/>, prefix: 'x.com/' },
  ];

  return (
    <DrawerShell open={open} onClose={onClose} title={creator.nickname || 'Creator'}>
      <div className="flex items-center gap-3">
        <Avatar src={creator.avatar_url} name={creator.nickname} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="text-lg font-bold text-ink truncate">{creator.nickname}</div>
          {creator.full_name && <div className="text-xs text-mute truncate">{creator.full_name}</div>}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {creator.tier_code && <span className="chip border bg-bg text-label">{creator.tier_code}</span>}
            {creator.audience_market && <span className="text-[11px] text-mute">{creator.audience_market}</span>}
          </div>
        </div>
      </div>

      <Section title="At a glance" icon={<MapPin size={11}/>}>
        <Row label="Nationality">{creator.nationality || '—'}</Row>
        <Row label="Audience market">{creator.audience_market || '—'}</Row>
        {creator.commission != null && (
          <Row label="Talent cut">
            {Math.round((1 - Number(creator.commission)) * 100)}%
            <span className="text-mute"> · Falcons {Math.round(Number(creator.commission) * 100)}%</span>
          </Row>
        )}
      </Section>

      <Section title="Reach" icon={<Users size={11}/>}>
        {SOCIAL.map(s => {
          const handle = creator[s.handle] as string | null | undefined;
          const followers = Number(creator[s.key] || 0);
          if (!handle && followers === 0) return null;
          return (
            <div key={s.key} className="flex items-center justify-between gap-3 py-1.5 border-b border-line/60 text-xs">
              <span className="text-mute font-medium inline-flex items-center gap-1">{s.icon} {s.label}</span>
              <span className="text-right flex items-center gap-2">
                {handle && (
                  <a
                    href={`https://${s.prefix}${handle.replace(/^@/, '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-greenDark hover:underline truncate max-w-[140px]"
                  >@{handle.replace(/^@/, '')}</a>
                )}
                <EditableNumberInline
                  value={followers}
                  isAdmin={isAdmin}
                  onCommit={v => onPatch(creator.id, { [s.key]: v })}
                />
              </span>
            </div>
          );
        })}
      </Section>

      <Section title="Key rates (SAR per posting)" icon={<ShieldCheck size={11}/>}>
        <EditableNumber label="IG Reel"        value={Number(creator.rate_ig_reel || 0)}        isAdmin={isAdmin} onCommit={v => onPatch(creator.id, { rate_ig_reel: v })} />
        <EditableNumber label="IG Static"      value={Number(creator.rate_ig_static || 0)}      isAdmin={isAdmin} onCommit={v => onPatch(creator.id, { rate_ig_static: v })} />
        <EditableNumber label="TikTok Video"   value={Number(creator.rate_tiktok_video || 0)}   isAdmin={isAdmin} onCommit={v => onPatch(creator.id, { rate_tiktok_video: v })} />
        <EditableNumber label="YT Short"       value={Number(creator.rate_yt_short || 0)}       isAdmin={isAdmin} onCommit={v => onPatch(creator.id, { rate_yt_short: v })} />
        <EditableNumber label="IRL / Event"    value={Number(creator.rate_irl || 0)}            isAdmin={isAdmin} onCommit={v => onPatch(creator.id, { rate_irl: v })} />
      </Section>

      {isAdmin && (
        <div className="flex items-center justify-between pt-2">
          <a
            href={`/admin/creators/${creator.id}`}
            className="btn btn-primary text-xs inline-flex items-center gap-1.5"
          >
            <Pencil size={12} /> Open full edit
          </a>
        </div>
      )}
    </DrawerShell>
  );
}

// ─── Compact inline editor used in social rows ────────────────────────────
function EditableNumberInline({
  value, isAdmin, onCommit,
}: {
  value: number; isAdmin: boolean;
  onCommit: (v: number) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value || 0));
  useEffect(() => { setDraft(String(value || 0)); }, [value]);

  const fmt = (n: number) => n >= 1e6 ? (n/1e6).toFixed(1).replace(/\.0$/,'')+'M'
                          : n >= 1e3 ? (n/1e3).toFixed(1).replace(/\.0$/,'')+'K'
                          : n.toLocaleString('en-US');

  if (!isAdmin) return <span className="text-ink tabular-nums font-semibold">{fmt(value)}</span>;

  if (editing) {
    return (
      <span className="flex items-center gap-1">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value.replace(/[^\d]/g, ''))}
          className="w-20 text-right text-xs tabular-nums border border-line rounded px-1 py-0.5 bg-bg"
          autoFocus
        />
        <button
          onClick={async () => {
            const ok = await onCommit(Number(draft || 0));
            if (ok) setEditing(false);
          }}
          className="text-greenDark"
        ><Save size={12}/></button>
        <button onClick={() => { setDraft(String(value || 0)); setEditing(false); }} className="text-mute"><X size={12}/></button>
      </span>
    );
  }
  return (
    <button
      onClick={() => setEditing(true)}
      className="text-ink tabular-nums font-semibold hover:underline decoration-dotted inline-flex items-center gap-1"
      title="Click to edit"
    >
      {fmt(value)}
      <Pencil size={10} className="text-mute" />
    </button>
  );
}
