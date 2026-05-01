'use client';
import { normalizeImageUrl } from '@/components/Avatar';
import { useState } from 'react';
import { PlayerProfileModal } from '@/components/PlayerProfileModal';
import { Briefcase } from 'lucide-react';

interface Player {
  id: number;
  nickname: string;
  game?: string | null;
  ingame_role?: string | null;
  avatar_url?: string | null;
  agency_status?: 'direct' | 'agency' | 'unknown' | null;
  agency_name?: string | null;
  agency_contact?: string | null;
}

export function ATeamGrid({ players }: { players: Player[] }) {
  const [openId, setOpenId] = useState<number | null>(null);
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 p-4">
        {players.map(p => (
          <button key={p.id} onClick={() => setOpenId(p.id)} className="group text-left">
            <div className="aspect-square rounded-xl bg-gradient-to-br from-navy/5 to-amber-50 border border-line overflow-hidden grid place-items-center relative">
              {p.avatar_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={normalizeImageUrl(p.avatar_url)} alt={p.nickname} className="w-full h-full object-cover"
                  loading="lazy" decoding="async" referrerPolicy="no-referrer"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <div className="text-3xl font-bold text-navy/40">{p.nickname.slice(0, 2).toUpperCase()}</div>
              )}
              <div className="absolute top-1.5 right-1.5">
                <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[9px] font-bold uppercase tracking-wider">S</span>
              </div>
            </div>
            <div className="mt-2 px-1">
              <div className="text-sm font-semibold text-ink truncate group-hover:text-greenDark">{p.nickname}</div>
              <div className="text-[10px] text-mute uppercase tracking-wide truncate">
                {p.game}{p.ingame_role ? ` · ${p.ingame_role}` : ''}
              </div>
              {p.agency_status === 'agency' ? (
                <div className="text-[10px] text-blue-700 mt-0.5 truncate"
                  title={`${p.agency_name || ''}${p.agency_contact ? ' · ' + p.agency_contact : ''}`}>
                  <Briefcase size={9} className="inline mr-0.5 mb-0.5" />
                  {p.agency_name || p.agency_contact || 'Agency-managed'}
                </div>
              ) : p.agency_status === 'direct' ? (
                <div className="text-[10px] text-greenDark mt-0.5">Direct</div>
              ) : null}
            </div>
          </button>
        ))}
      </div>
      <PlayerProfileModal playerId={openId} onClose={() => setOpenId(null)} />
    </>
  );
}

export function BrainTrustGrid({ players, max = 8, totalCount }: { players: Player[]; max?: number; totalCount: number }) {
  const [openId, setOpenId] = useState<number | null>(null);
  const visible = players.slice(0, max);
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
        {visible.map(p => (
          <button key={p.id} onClick={() => setOpenId(p.id)} className="flex items-center gap-3 p-2 rounded-lg border border-line bg-bg/40 hover:border-green hover:bg-greenSoft text-left transition">
            <div className="w-10 h-10 rounded-full bg-navy text-white grid place-items-center font-bold text-xs flex-shrink-0 overflow-hidden">
              {p.avatar_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={normalizeImageUrl(p.avatar_url)} alt={p.nickname} className="w-full h-full object-cover"
                  loading="lazy" decoding="async" referrerPolicy="no-referrer"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <span>{p.nickname.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-ink truncate">{p.nickname}</div>
              <div className="text-[10px] text-mute uppercase tracking-wide truncate">{(p as any).role} · {p.game}</div>
            </div>
          </button>
        ))}
        {totalCount > max && (
          <a href="/roster/players?role=staff" className="flex items-center justify-center p-2 rounded-lg border border-dashed border-line text-xs text-greenDark hover:bg-greenSoft">
            + {totalCount - max} more →
          </a>
        )}
      </div>
      <PlayerProfileModal playerId={openId} onClose={() => setOpenId(null)} />
    </>
  );
}
