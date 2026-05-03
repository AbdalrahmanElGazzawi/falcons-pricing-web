import { requireSuperAdmin } from '@/lib/auth';
import { Shell, PageHeader } from '@/components/Shell';
import { AccessDenied } from '@/components/AccessDenied';
import { createServiceClient } from '@/lib/supabase-server';
import { AnalyticsDashboard } from './AnalyticsDashboard';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const { denied, profile } = await requireSuperAdmin();
  if (denied) return <AccessDenied message="Super-admin only." />;

  const sb = createServiceClient();
  const sinceIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: online }, { data: visits }, { data: actions }, { data: profiles }] = await Promise.all([
    sb.from('v_online_users').select('*').order('last_seen_at', { ascending: false }),
    sb.from('page_visits')
      .select('id, user_id, user_email, path, visited_at, session_id')
      .gte('visited_at', sinceIso)
      .order('visited_at', { ascending: false })
      .limit(500),
    sb.from('audit_log')
      .select('id, actor_id, actor_email, action, entity_type, entity_id, created_at')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(300),
    sb.from('profiles')
      .select('id, email, full_name, role, is_active')
      .eq('is_active', true)
      .order('email'),
  ]);

  return (
    <Shell role={profile.role} email={profile.email} fullName={profile.full_name}>
      <PageHeader
        title="Team Activity"
        subtitle="Who's online, what pages they're on, what they've done. Live — refreshes via Supabase Realtime."
      />
      <AnalyticsDashboard
        initialOnline={(online ?? []) as any}
        initialVisits={(visits ?? []) as any}
        initialActions={(actions ?? []) as any}
        profiles={(profiles ?? []) as any}
      />
    </Shell>
  );
}
