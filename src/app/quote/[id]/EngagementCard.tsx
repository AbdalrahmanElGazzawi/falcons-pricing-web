'use client';
import { useLocale } from '@/lib/i18n/Locale';
import { Eye, EyeOff, CheckCircle2, XCircle, Clock } from 'lucide-react';

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString('en-GB');
}

export function EngagementCard({
  viewedAt, lastViewedAt, viewedCount,
  acceptedAt, acceptedByName, acceptedByEmail,
  declinedAt, declineReason,
  status,
}: {
  viewedAt: string | null;
  lastViewedAt: string | null;
  viewedCount: number;
  acceptedAt: string | null;
  acceptedByName: string | null;
  acceptedByEmail: string | null;
  declinedAt: string | null;
  declineReason: string | null;
  status: string;
}) {
  const { t } = useLocale();
  return (
    <div className="card card-p">
      <div className="text-xs text-label uppercase tracking-wide mb-3">{t('ec.title')}</div>

      {/* View state */}
      <div className="flex items-start gap-3 mb-3">
        <div className={[
          'w-8 h-8 rounded-full grid place-items-center flex-shrink-0',
          viewedAt ? 'bg-green/15 text-greenDark' : 'bg-bg text-mute',
        ].join(' ')}>
          {viewedAt ? <Eye size={16} /> : <EyeOff size={16} />}
        </div>
        <div className="flex-1 min-w-0">
          {viewedAt ? (
            <>
              <div className="text-sm font-medium text-ink">
                {viewedCount > 1 ? t('ec.viewed_n_times').replace('{{n}}', String(viewedCount)) : t('ec.viewed_once')}
              </div>
              <div className="text-xs text-mute">
                First {timeAgo(viewedAt)}
                {lastViewedAt && lastViewedAt !== viewedAt && ` · last ${timeAgo(lastViewedAt)}`}
              </div>
            </>
          ) : (
            <>
              <div className="text-sm font-medium text-ink">{t('ec.not_opened')}</div>
              <div className="text-xs text-mute">
                {status === 'sent_to_client'
                  ? 'Share the client link below.'
                  : 'Send the quote to enable tracking.'}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Decision state */}
      {acceptedAt ? (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-green/10 border border-green/20">
          <CheckCircle2 size={18} className="text-greenDark flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-semibold text-greenDark">Accepted {timeAgo(acceptedAt)}</div>
            {acceptedByName && (
              <div className="text-ink mt-0.5">by {acceptedByName}{acceptedByEmail ? ` · ${acceptedByEmail}` : ''}</div>
            )}
            <div className="text-mute mt-0.5">{new Date(acceptedAt).toLocaleString('en-GB')}</div>
          </div>
        </div>
      ) : declinedAt ? (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
          <XCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-semibold text-red-700">Declined {timeAgo(declinedAt)}</div>
            {declineReason && <div className="text-ink mt-1 whitespace-pre-wrap">&ldquo;{declineReason}&rdquo;</div>}
            <div className="text-mute mt-0.5">{new Date(declinedAt).toLocaleString('en-GB')}</div>
          </div>
        </div>
      ) : viewedAt && status === 'sent_to_client' ? (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-bg border border-line">
          <Clock size={18} className="text-label flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-semibold text-ink">{t('ec.awaiting_decision')}</div>
            <div className="text-mute mt-0.5">{t('ec.consider_nudge')}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
