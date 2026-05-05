import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from './supabase-server';
import { isSuperAdminEmail } from './super-admin';

export { SUPER_ADMIN_EMAIL, isSuperAdminEmail } from './super-admin';

export async function requireAuth() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_active, title')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.is_active) {
    redirect('/access-revoked');
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

export async function requireSuperAdmin() {
  const res = await requireAuth();
  if (res.denied || !isSuperAdminEmail(res.profile.email)) {
    return { ...res, denied: true as const };
  }
  return { ...res, denied: false as const };
}

export async function requireAdminOrSuper() {
  const res = await requireAuth();
  if (res.denied) return { ...res, denied: true as const };
  const isSuper = isSuperAdminEmail(res.profile.email);
  const isAdmin = res.profile.role === 'admin';
  if (!isSuper && !isAdmin) return { ...res, denied: true as const };
  return { ...res, denied: false as const };
}
