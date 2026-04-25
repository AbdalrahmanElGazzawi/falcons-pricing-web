import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';

export const runtime = 'nodejs';

// Whitelist of legal page keys. Add more as we extend the layout system.
const ALLOWED_PAGES = new Set([
  'quote/new',
  'dashboard',
]);

// Whitelist of legal section ids per page so a malicious payload can't inject
// arbitrary strings into our render switch.
const ALLOWED_SECTIONS: Record<string, Set<string>> = {
  'quote/new': new Set(['header', 'brand_brief', 'globals', 'addons', 'lines', 'notes_totals']),
  'dashboard': new Set(['hero', 'owned_media', 'a_team', 'brain_trust', 'charts', 'inventory']),
};

export async function GET(_req: Request, { params }: { params: { page: string } }) {
  const page = decodeURIComponent(params.page);
  if (!ALLOWED_PAGES.has(page)) {
    return NextResponse.json({ error: 'Unknown page' }, { status: 404 });
  }
  const { denied, supabase } = await requireSuperAdmin();
  // GET is open to any staff (matches SELECT RLS) — but the route is mounted
  // under /api/admin/layout. Use the supabase client created during auth and
  // fall through; if the user is not staff RLS will return empty.
  // (We don't gate GET to super admin so the page can render for everyone.)
  void denied;

  const { data, error } = await supabase
    .from('page_layouts')
    .select('section_order')
    .eq('page', page)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ section_order: data?.section_order ?? [] });
}

export async function PATCH(req: Request, { params }: { params: { page: string } }) {
  const page = decodeURIComponent(params.page);
  if (!ALLOWED_PAGES.has(page)) {
    return NextResponse.json({ error: 'Unknown page' }, { status: 404 });
  }

  const { denied, profile, supabase } = await requireSuperAdmin();
  if (denied) return NextResponse.json({ error: 'Super admin only' }, { status: 403 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const next = Array.isArray(body?.section_order) ? body.section_order : null;
  if (!next || next.length === 0) {
    return NextResponse.json({ error: 'section_order must be a non-empty array' }, { status: 400 });
  }

  const allowed = ALLOWED_SECTIONS[page]!;
  const seen = new Set<string>();
  for (const s of next) {
    if (typeof s !== 'string' || !allowed.has(s)) {
      return NextResponse.json({ error: `Unknown section: ${s}` }, { status: 400 });
    }
    if (seen.has(s)) {
      return NextResponse.json({ error: `Duplicate section: ${s}` }, { status: 400 });
    }
    seen.add(s);
  }
  // Require complete coverage — every legal section must appear.
  for (const s of allowed) {
    if (!seen.has(s)) {
      return NextResponse.json({ error: `Missing section: ${s}` }, { status: 400 });
    }
  }

  // Read the previous order for the audit diff.
  const { data: prev } = await supabase
    .from('page_layouts')
    .select('section_order')
    .eq('page', page)
    .single();

  const { error } = await supabase
    .from('page_layouts')
    .update({
      section_order: next,
      updated_at: new Date().toISOString(),
      updated_by: profile.id,
    })
    .eq('page', page);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_log').insert({
    actor_id: profile.id,
    actor_email: profile.email,
    actor_kind: 'human',
    action: 'layout.update',
    entity_type: 'page_layout',
    entity_id: page,
    diff: {
      before: prev?.section_order ?? null,
      after: next,
    },
  });

  return NextResponse.json({ ok: true, section_order: next });
}
