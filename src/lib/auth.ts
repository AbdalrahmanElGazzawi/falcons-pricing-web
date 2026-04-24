import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from './supabase-server';
import type { UserRole } from './types';

export async function requireAuth() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_active')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.is_active) {
    return { user, profile: null as any, supabase, denied: true };
  }
  return { user, profile, supabase, denied: false };
}

export async function requireStaff() {
  const res = await requireAuth();
  if (res.denied || !['admin', 'sales', 'finance'].includes(res.profile.role)) {
    return { ...res, denied: true as const };
  }
  return { ...res, denied: false as const };
}

export async function requireAdmin() {
  const res = await requireAuth();
  if (res.denied || res.profile.role !== 'admin') {
    return { ...res, denied: true as const };
  }
  return { ...res, denied: false as const };
}
