'use client';
import { useState } from 'react';
import { Save, Instagram, Twitter, Youtube, Twitch, ExternalLink } from 'lucide-react';
import type { EsportsTeam } from '@/lib/types';

function fmtFollow(n: number | null | undefined) {
  const v = Number(n || 0);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1_000)     return (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return v.toLocaleString('en-US');
}

export function EsportsTeamsEditor({ initial }: { initial: EsportsTeam[] }) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<EsportsTeam>>({});
  const [saving, setSaving] = useState(false);

  function start(t: EsportsTeam) {
    setEditing(t.id); setDraft({ ...t });
  }
  function update<K extends keyof EsportsTeam>(k: K, v: any) {
    setDraft(s => ({ ...s, [k]: v }));
  }
  async function save() {
    if (!editing) return;
    setSaving(true);
    const res = await fetch(`/api/admin/esports-teams/${editing}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    setSaving(false);
    if (!res.ok) { alert('Save failed'); return; }
    const data = await res.json();
    setRows(prev => prev.map(r => r.id === data.id ? data : r));
    setEditing(null); setDraft({});
  }

  const totalFollowers = rows.reduce((s, r) =>
    s + Number(r.followers_ig||0) + Number(r.followers_x||0) + Number(r.followers_tiktok||0) +
        Number(r.subscribers_yt||0) + Number(r.followers_twitch||0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Teams" value={rows.length.toString()} />
        <Kpi label="Active" value={rows.filter(r => r.is_active).length.toString()} />
        <Kpi label="Channels populated" value={rows.filter(r => r.handle_ig || r.handle_x || r.handle_tiktok || r.handle_yt || r.handle_twitch).length.toString()} />
        <Kpi label="Total reach" value={fmtFollow(totalFollowers)} accent />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map(t => {
          const isEdit = editing === t.id;
          const cur = isEdit ? { ...t, ...draft } as EsportsTeam : t;
          const reach = Number(cur.followers_ig||0) + Number(cur.followers_x||0) + Number(cur.followers_tiktok||0) +
                        Number(cur.subscribers_yt||0) + Number(cur.followers_twitch||0);
          const channelCount = [cur.handle_ig, cur.handle_x, cur.handle_tiktok, cur.handle_yt, cur.handle_twitch].filter(Boolean).length;

          return (
            <div key={t.id} className={['card overflow-hidden', isEdit ? 'ring-2 ring-green' : ''].join(' ')}>
              <div className="p-4 border-b border-line bg-gradient-to-br from-navy/5 to-transparent">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-navy text-white grid place-items-center font-bold text-sm flex-shrink-0">
                    {t.game.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    {isEdit ? (
                      <input value={cur.team_name} onChange={e => update('team_name', e.target.value)}
                        className="input !py-1 text-sm font-semibold mb-1" />
                    ) : (
                      <div className="font-semibold text-ink truncate">{cur.team_name}</div>
                    )}
                    <div className="text-xs text-mute truncate">{t.game}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 text-xs">
                  <span className="text-label">{channelCount}/5 channels</span>
                  <span className="font-semibold text-greenDark tabular-nums">{fmtFollow(reach)} reach</span>
                </div>
              </div>

              <div className="p-3 space-y-2 text-xs">
                <SocialRow icon={Instagram} label="Instagram" prefix="@"
                  handle={cur.handle_ig} followers={cur.followers_ig}
                  onHandle={isEdit ? v => update('handle_ig', v) : null}
                  onFollowers={isEdit ? v => update('followers_ig', v) : null}
                  url={cur.handle_ig ? `https://instagram.com/${cur.handle_ig.replace(/^@/, '')}` : null}
                />
                <SocialRow icon={Twitter} label="X / Twitter" prefix="@"
                  handle={cur.handle_x} followers={cur.followers_x}
                  onHandle={isEdit ? v => update('handle_x', v) : null}
                  onFollowers={isEdit ? v => update('followers_x', v) : null}
                  url={cur.handle_x ? `https://x.com/${cur.handle_x.replace(/^@/, '')}` : null}
                />
                <SocialRow icon={() => <span className="text-xs font-bold">TT</span>} label="TikTok" prefix="@"
                  handle={cur.handle_tiktok} followers={cur.followers_tiktok}
                  onHandle={isEdit ? v => update('handle_tiktok', v) : null}
                  onFollowers={isEdit ? v => update('followers_tiktok', v) : null}
                  url={cur.handle_tiktok ? `https://tiktok.com/@${cur.handle_tiktok.replace(/^@/, '')}` : null}
                />
                <SocialRow icon={Youtube} label="YouTube" prefix="@"
                  handle={cur.handle_yt} followers={cur.subscribers_yt}
                  onHandle={isEdit ? v => update('handle_yt', v) : null}
                  onFollowers={isEdit ? v => update('subscribers_yt', v) : null}
                  url={cur.handle_yt ? `https://youtube.com/@${cur.handle_yt.replace(/^@/, '')}` : null}
                />
                <SocialRow icon={Twitch} label="Twitch" prefix=""
                  handle={cur.handle_twitch} followers={cur.followers_twitch}
                  onHandle={isEdit ? v => update('handle_twitch', v) : null}
                  onFollowers={isEdit ? v => update('followers_twitch', v) : null}
                  url={cur.handle_twitch ? `https://twitch.tv/${cur.handle_twitch}` : null}
                />
              </div>

              <div className="px-3 py-2 border-t border-line bg-bg flex items-center justify-end gap-2">
                {isEdit ? (
                  <>
                    <button onClick={() => { setEditing(null); setDraft({}); }} className="btn btn-ghost !py-1 !px-2 text-xs">Cancel</button>
                    <button onClick={save} disabled={saving} className="btn btn-primary !py-1 !px-2 text-xs">
                      <Save size={11} /> {saving ? 'Saving…' : 'Save'}
                    </button>
                  </>
                ) : (
                  <button onClick={() => start(t)} className="btn btn-ghost !py-1 !px-2 text-xs">Edit channels</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card card-p">
      <div className="text-[10px] uppercase tracking-wider text-label font-semibold mb-1">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${accent ? 'text-greenDark' : 'text-ink'}`}>{value}</div>
    </div>
  );
}

function SocialRow({
  icon: Icon, label, prefix, handle, followers, onHandle, onFollowers, url,
}: {
  icon: any; label: string; prefix: string;
  handle: string | null; followers: number;
  onHandle: ((v: string) => void) | null;
  onFollowers: ((v: number) => void) | null;
  url: string | null;
}) {
  const editing = !!onHandle;
  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded grid place-items-center text-label flex-shrink-0">
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            value={handle ?? ''}
            onChange={e => onHandle!(e.target.value)}
            placeholder={`${prefix}handle`}
            className="input !py-0.5 !px-1.5 text-xs w-full"
          />
        ) : handle ? (
          <a href={url ?? '#'} target="_blank" rel="noreferrer" className="text-ink hover:text-greenDark truncate flex items-center gap-1">
            {prefix}{handle}<ExternalLink size={10} />
          </a>
        ) : (
          <span className="text-mute italic">{label} —</span>
        )}
      </div>
      {editing ? (
        <input
          type="number"
          value={followers ?? 0}
          onChange={e => onFollowers!(Number(e.target.value))}
          className="input !py-0.5 !px-1.5 text-xs w-20 text-right"
        />
      ) : (
        <span className="text-mute tabular-nums whitespace-nowrap">{followers ? fmtFollow(followers) : '—'}</span>
      )}
    </div>
  );
}
