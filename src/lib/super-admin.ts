// Single source of truth for super-admin email — usable from both server and
// client code. Mirrors the SQL is_super_admin() helper. If we ever move the
// source-of-truth into a column on profiles, both this and the SQL function
// need to flip together.
export const SUPER_ADMIN_EMAIL = 'abdghazzawi1@gmail.com';

export function isSuperAdminEmail(email?: string | null): boolean {
  return !!email && email.toLowerCase() === SUPER_ADMIN_EMAIL;
}
