import { requireAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import RosterSyncClient from './RosterSyncClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default async function RosterSyncPage() {
  const { denied } = await requireAdmin();
  if (denied) redirect('/');
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Roster sync</h1>
        <p className="mt-2 text-sm text-mute">
          Catch missing-talent gaps before they bite a brand pitch. Paste the
          <strong> Data Entry </strong> tab of <em>Website Esport Data Entry</em> as CSV
          (Google Sheets → File → Download → Comma-separated values, current sheet)
          and the diff against the live DB surfaces below. Inserts run only after explicit confirmation.
        </p>
      </header>
      <RosterSyncClient />
    </main>
  );
}
