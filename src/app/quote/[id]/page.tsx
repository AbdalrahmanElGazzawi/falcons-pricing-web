import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff, isSuperAdminEmail } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { ArrowLeft } from 'lucide-react';
import { QuoteDetailBody } from './QuoteDetailBody';

export const dynamic = 'force-dynamic';

export default async function QuoteDetail({ params }: { params: { id: string } }) {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return <AccessDenied />;

  const { data: quote } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!quote) notFound();

  const { data: lines } = await supabase
    .from('quote_lines')
    .select('*')
    .eq('quote_id', quote.id)
    .order('sort_order');

  const { data: addons } = await supabase
    .from('quote_addons')
    .select('addon_id, uplift_pct, addons(label)')
    .eq('quote_id', quote.id);

  const canDelete = isSuperAdminEmail(profile.email);

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <Link href="/quotes" className="inline-flex items-center gap-1 text-sm text-label hover:text-ink mb-3">
        <ArrowLeft size={14} /> Quote Log
      </Link>

      <PageHeader
        title={quote.quote_number}
        subtitle={`${quote.client_name}${quote.campaign ? ` · ${quote.campaign}` : ''}`}
      />

      <QuoteDetailBody
        quote={quote}
        lines={lines || []}
        addons={addons || []}
        profile={{ email: profile.email, full_name: profile.full_name ?? undefined, role: profile.role }}
        canDelete={canDelete}
      />
    </Shell>
  );
}
