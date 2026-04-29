import { requireSuperAdmin } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { AuditLogTable } from './AuditLogTable';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 100;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams?: { actor?: string; action?: string; entity?: string };
}) {
  const { denied, profile, supabase } = await requireSuperAdmin();
  if (denied) return <AccessDenied />;

  const actorFilter = searchParams?.actor ?? '';
  const actionFilter = searchParams?.action ?? '';
  const entityFilter = searchParams?.entity ?? '';

  let q = supabase
    .from('audit_log')
    .select('id, created_at, actor_email, actor_kind, action, entity_type, entity_id, diff')
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);
  if (actorFilter === 'human' || actorFilter === 'ai' || actorFilter === 'system') {
    q = q.eq('actor_kind', actorFilter);
  }
  if (actionFilter) q = q.ilike('action', `%${actionFilter}%`);
  if (entityFilter) q = q.eq('entity_type', entityFilter);

  const { data: rows, error } = await q;

  // Distinct entity_types for the filter dropdown
  const { data: distinctTypes } = await supabase
    .from('audit_log')
    .select('entity_type')
    .order('entity_type')
    .limit(500);
  const entityTypes: string[] = Array.from(
    new Set((distinctTypes ?? []).map((r: any) => r.entity_type as string).filter(Boolean))
  );

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title="Audit Log"
        subtitle="Every admin action and AI-initiated change. Most recent first."
      />
      {error && (
        <div className="text-sm text-red-600 mb-4">Error loading log: {error.message}</div>
      )}
      <AuditLogTable
        rows={(rows ?? []) as any}
        entityTypes={entityTypes}
        currentActor={actorFilter}
        currentAction={actionFilter}
        currentEntity={entityFilter}
      />
    </Shell>
  );
}
