'use client';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

export default function AccessRevokedPage() {
  const supabase = createClient();
  const router = useRouter();

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-gradient-to-br from-navy via-navyDark to-navy">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <img src="/falcon-mark.png" alt="Team Falcons" className="w-14 h-14" />
          <div>
            <div className="text-white font-semibold text-xl leading-none">Team Falcons</div>
            <div className="text-white/60 text-xs mt-1">Pricing OS</div>
          </div>
        </div>

        <div className="card card-p space-y-4">
          <div>
            <h1 className="text-xl font-semibold">Access revoked</h1>
            <p className="text-sm text-label mt-2">
              Your account has been deactivated by an administrator. If you believe this is a
              mistake, contact your admin to have access restored.
            </p>
          </div>

          <button onClick={signOut} className="btn btn-primary w-full justify-center">
            Sign out
          </button>
        </div>

        <div className="text-center text-white/30 text-[10px] mt-6 tracking-wide">
          Built by Abdalrahman elGazzawi
        </div>
      </div>
    </div>
  );
}
