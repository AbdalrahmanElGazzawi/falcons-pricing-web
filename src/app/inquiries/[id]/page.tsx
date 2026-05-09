import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff, isSuperAdminEmail } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { InquiryDetail } from './InquiryDetail';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function InquiryDetailPage({ params }: { params: { id: string } }) {
  const { denied, profile, supabase } = await requireStaff();
  if (denied) return <AccessDenied />;

  const { data: inquiry } = await supabase
    .from('inquiries')
    .select('*')
    .eq('id', params.id)
    .single();
  if (!inquiry) notFound();

  // If linked to a quote, fetch its number for the cross-link
  let linkedQuote: { id: string; quote_number: string; status: string } | null = null;
  if (inquiry.quote_id) {
    const { data: q } = await supabase
      .from('quotes').select('id, quote_number, status').eq('id', inquiry.quote_id).single();
    if (q) linkedQuote = q;
  }

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title={`${inquiry.brand} · ${inquiry.inquiry_number}`}
        subtitle={inquiry.campaign || inquiry.agency || 'Inbound inquiry'}
        crumbs={[{ label: 'Inquiries', href: '/inquiries' }, { label: inquiry.inquiry_number }]}
        action={
          <Link href="/inquiries" className="btn btn-ghost text-sm">
            <ArrowLeft size={14} /> All inquiries
          </Link>
        }
      />
      {(() => null)()}
      {/* ─── V3.4 Talent auto-suggest based on inquiry context ─────── */}
      {await (async () => {
        // Heuristic: parse inquiry.deliverables + region + body to suggest matched talents.
        const need = String(inquiry.deliverables || '').toLowerCase() + ' ' + String(inquiry.body || '').toLowerCase();
        const wantsStream = /twitch|stream|live/.test(need);
        const wantsIRL = /event|appearance|irl|on-?site/.test(need);
        const wantsCinematic = /shoot|cinematic|video|production/.test(need);
        const wantsKSA = (inquiry.region || '').toLowerCase().includes('ksa') || /saudi|ksa|riyadh|jeddah/.test(need);
        const ksaTag = wantsKSA ? 'archetype.eq.hybrid_lifestyle,archetype.eq.esports_personality,archetype.eq.regional_pro' : '';
        const { data: matched } = await supabase
          .from('players')
          .select('id, nickname, tier_code, game, archetype, archetype_override, authority_tier, authority_tier_override, stream_intensity, irl_availability, cinematic_ready, peak_platforms, bilingual, avatar_url')
          .eq('is_active', true)
          .limit(80);
        const ranked = ((matched ?? []) as any[]).map(p => {
          let score = 0;
          const at = p.authority_tier_override ?? p.authority_tier;
          if (at === 'AT-1') score += 30;
          else if (at === 'AT-2') score += 20;
          else if (at === 'AT-3') score += 10;
          if (wantsStream && p.stream_intensity >= 2) score += 15;
          if (wantsStream && p.stream_intensity === 0) score -= 10;
          if (wantsIRL && (p.irl_availability === 'global' || p.irl_availability === 'mena')) score += 10;
          if (wantsIRL && p.irl_availability === 'none') score -= 15;
          if (wantsCinematic && p.cinematic_ready) score += 12;
          if (wantsKSA && p.bilingual) score += 8;
          return { ...p, _score: score };
        }).sort((a, b) => b._score - a._score).slice(0, 6);

        if (ranked.length === 0) return null;
        return (
          <section className="rounded-xl border border-greenDark/30 bg-greenSoft/30 p-4 mb-5">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-sm font-bold text-greenDark uppercase tracking-wider">⚡ Suggested talent for this brief</h2>
              <span className="text-[11px] text-mute">
                Auto-matched on: {[wantsStream && 'streaming', wantsIRL && 'IRL', wantsCinematic && 'cinematic', wantsKSA && 'KSA market'].filter(Boolean).join(' · ') || 'general'}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {ranked.map(p => (
                <Link key={p.id} href={`/admin/players/${p.id}/estimate`} className="rounded-lg border border-line bg-white p-2.5 hover:border-greenDark transition flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-bg overflow-hidden flex-shrink-0 grid place-items-center text-xs font-bold text-mute">
                    {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : p.nickname.slice(0,2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-ink text-sm truncate">{p.nickname}</div>
                    <div className="text-[10px] text-mute truncate">
                      {p.tier_code} · {p.game || '—'}
                      {(p.archetype_override ?? p.archetype) && <> · <span className="capitalize">{(p.archetype_override ?? p.archetype).replace(/_/g, ' ')}</span></>}
                    </div>
                  </div>
                  <span className="text-[10px] tabular-nums text-greenDark font-bold">+{p._score}</span>
                </Link>
              ))}
            </div>
            <p className="text-[10px] text-mute mt-2 italic">
              Heuristic match on archetype + authority + profile flags vs. brief content. Click a card to open Quick Estimate.
              Build a quote from this brief: <Link href="/quote/new" className="text-greenDark hover:underline">/quote/new →</Link>
            </p>
          </section>
        );
      })()}
      <InquiryDetail
        inquiry={inquiry}
        linkedQuote={linkedQuote}
        canDelete={isSuperAdminEmail(profile.email)}
      />
    </Shell>
  );
}
