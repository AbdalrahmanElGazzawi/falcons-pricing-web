import type { QuoteStatus } from '@/lib/types';
import { Circle, AlertTriangle, AlertCircle, CheckCircle2, Send, Trophy, XCircle, Pencil } from 'lucide-react';

const META: Record<QuoteStatus, { label: string; icon: any }> = {
  draft:            { label: 'Draft',           icon: Pencil },
  pending_approval: { label: 'Pending approval', icon: AlertTriangle },
  approved:         { label: 'Approved',         icon: CheckCircle2 },
  sent_to_client:   { label: 'Sent to client',   icon: Send },
  client_approved:  { label: 'Client approved',  icon: CheckCircle2 },
  client_rejected:  { label: 'Client rejected',  icon: AlertCircle },
  closed_won:       { label: 'Closed won',       icon: Trophy },
  closed_lost:      { label: 'Closed lost',      icon: XCircle },
};

/**
 * Quote-status pill with hierarchy:
 *   pending_approval / client_rejected → loud, ringed/pulsing
 *   draft / approved / sent / client_approved → calm
 *   closed_won / closed_lost → muted
 */
export function StatusPill({ status }: { status: QuoteStatus }) {
  const meta = META[status] ?? { label: status, icon: Circle };
  const Icon = meta.icon;
  return (
    <span className={`status status-${status}`}>
      <Icon size={11} className="shrink-0" />
      <span>{meta.label}</span>
    </span>
  );
}
