'use client';
import { Trophy, AlertTriangle, Link2, Clock, DollarSign } from 'lucide-react';
import { liquipediaStats } from '@/components/LiquipediaChip';
import { useLocale } from '@/lib/i18n/Locale';

type Player = Parameters<typeof liquipediaStats>[0][number];

/**
 * Surfaces Liquipedia coverage above the roster table.
 *
 *   Players with URL              ← how many we know about
 *   Synced (with tournament data) ← how many actually have achievements pulled
 *   Needs sync                    ← URL set but scraper hasn't run
 *   Missing URL                   ← biggest gap; admins fill these manually
 *
 * Click any number to filter the table to just that bucket.
 */
export function LiquipediaCoverageBanner({
  players,
  filter,
  onFilter,
}: {
  players: Player[];
  filter: '' | 'missing_url' | 'has_url_unsynced' | 'synced' | 'stale';
  onFilter: (f: '' | 'missing_url' | 'has_url_unsynced' | 'synced' | 'stale') => void;
}) {
  const { t } = useLocale();
  const s = liquipediaStats(players);
  if (s.total === 0) return null;

  const totalPrizeStr =
    s.totalPrize >= 1_000_000 ? `$${(s.totalPrize / 1_000_000).toFixed(1)}M`
    : s.totalPrize >= 1_000   ? `$${Math.round(s.totalPrize / 1_000)}K`
    : `$${s.totalPrize}`;

  const Stat = ({
    label, value, sub, tone, icon: Icon, active, onClick, dim,
  }: {
    label: string;
    value: number | string;
    sub?: string;
    tone: 'green' | 'orange' | 'red' | 'mute' | 'gold';
    icon: any;
    active?: boolean;
    onClick?: () => void;
    dim?: boolean;
  }) => {
    const toneCls =
      tone === 'green' ? 'text-greenDark' :
      tone === 'orange' ? 'text-orange-700' :
      tone === 'red' ? 'text-red-600' :
      tone === 'gold' ? 'text-gold' :
      'text-mute';
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!onClick}
        className={[
          'flex-1 min-w-[140px] text-left px-3 py-2.5 rounded-lg border transition',
          active ? 'border-greenDark bg-greenSoft/40' : 'border-line bg-card hover:bg-cardHover hover:border-mute',
          !onClick ? 'cursor-default' : 'cursor-pointer',
          dim ? 'opacity-50' : '',
        ].join(' ')}
      >
        <div className="text-[10px] uppercase tracking-wider text-mute font-semibold flex items-center gap-1">
          <Icon size={10} />
          {label}
        </div>
        <div className={`text-2xl font-semibold tabular-nums mt-0.5 ${toneCls}`}>{value}</div>
        {sub && <div className="text-[11px] text-mute mt-0.5">{sub}</div>}
      </button>
    );
  };

  return (
    <div className="card card-p mb-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="font-semibold text-ink inline-flex items-center gap-2">
            <Trophy size={14} className="text-greenDark" />
            {t('liqcov.title')}
          </div>
          <div className="text-xs text-mute mt-0.5">
            {t('liqcov.hint')}
          </div>
        </div>
        {filter && (
          <button
            type="button"
            onClick={() => onFilter('')}
            className="text-xs text-mute hover:text-ink underline-offset-2 hover:underline"
          >
            {t('liqcov.clear_filter')}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Stat
          label={t('liqcov.with_url')}
          value={`${s.hasUrl} / ${s.total}`}
          sub={t('liqcov.coverage_pct').replace('{{n}}', String(Math.round((s.hasUrl / s.total) * 100)))}
          tone="green"
          icon={Link2}
        />
        <Stat
          label={t('liqcov.synced')}
          value={s.synced}
          sub={s.stale > 0 ? t('liqcov.stale_n').replace('{{n}}', String(s.stale)) : t('liqcov.fresh')}
          tone={s.stale > 0 ? 'orange' : 'green'}
          icon={Trophy}
          active={filter === 'synced'}
          onClick={() => onFilter(filter === 'synced' ? '' : 'synced')}
        />
        <Stat
          label={t('liqcov.needs_sync')}
          value={s.hasUrlUnsynced}
          sub={s.hasUrlUnsynced > 0 ? t('liqcov.run_scraper') : t('liqcov.all_caught_up')}
          tone={s.hasUrlUnsynced > 0 ? 'orange' : 'mute'}
          icon={Clock}
          active={filter === 'has_url_unsynced'}
          onClick={() => onFilter(filter === 'has_url_unsynced' ? '' : 'has_url_unsynced')}
        />
        <Stat
          label={t('liqcov.missing_url')}
          value={s.missingUrl}
          sub={s.missingUrl > 0 ? t('liqcov.add_via_editor') : t('liqcov.fully_populated')}
          tone={s.missingUrl > 0 ? 'red' : 'mute'}
          icon={AlertTriangle}
          active={filter === 'missing_url'}
          onClick={() => onFilter(filter === 'missing_url' ? '' : 'missing_url')}
        />
        <Stat
          label={t('liqcov.tracked_prize')}
          value={totalPrizeStr}
          sub={t('liqcov.with_hits').replace('{{n}}', String(s.withPrize))}
          tone="gold"
          icon={DollarSign}
        />
      </div>
    </div>
  );
}
