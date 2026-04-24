import { requireAdmin } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';

export const dynamic = 'force-dynamic';

export default async function AssumptionsAdmin() {
  const { denied, profile, supabase } = await requireAdmin();
  if (denied) return <AccessDenied message="Admin only." />;

  const { data: rows } = await supabase
    .from('assumptions')
    .select('*')
    .order('area', { ascending: true });

  return (
    <Shell role={profile.role} email={profile.email}>
      <PageHeader
        title="Assumptions Log"
        subtitle="Industry-reasonable defaults baked into the engine. Re-evaluate on the listed triggers."
      />

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-label uppercase tracking-wide bg-bg">
              <th className="px-4 py-3 w-40">Area</th>
              <th className="px-4 py-3">Assumption</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3 w-24">Confidence</th>
              <th className="px-4 py-3">Re-visit trigger</th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map(r => (
              <tr key={r.id} className="border-t border-line align-top">
                <td className="px-4 py-3 font-medium text-ink">{r.area}</td>
                <td className="px-4 py-3 text-ink">{r.assumption}</td>
                <td className="px-4 py-3 text-label text-xs">{r.source || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`chip text-xs ${
                    r.confidence === 'High' ? 'chip-mint' :
                    r.confidence === 'Medium' ? 'chip-peach' : 'chip-grey'
                  }`}>{r.confidence || '—'}</span>
                </td>
                <td className="px-4 py-3 text-label text-xs">{r.revisit_trigger || '—'}</td>
              </tr>
            ))}
            {(!rows || rows.length === 0) && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-label">No assumptions logged.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}
