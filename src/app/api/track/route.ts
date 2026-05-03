import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch {}

  const path = typeof body?.path === 'string' ? body.path.slice(0, 1000) : '/';
  const referrer = typeof body?.referrer === 'string' ? body.referrer.slice(0, 1000) : null;
  const session_id = typeof body?.session_id === 'string' ? body.session_id.slice(0, 64) : null;
  const user_agent = req.headers.get('user-agent')?.slice(0, 500) ?? null;
  const event = body?.event === 'ping' ? 'ping' : 'visit';

  await supabase.from('user_presence').upsert(
    { user_id: user.id, last_seen_at: new Date().toISOString(), current_path: path, user_agent },
    { onConflict: 'user_id' }
  );

  if (event === 'visit') {
    await supabase.from('page_visits').insert({
      user_id: user.id,
      user_email: user.email,
      path, referrer, session_id, user_agent,
    });
  }
  return NextResponse.json({ ok: true });
}
