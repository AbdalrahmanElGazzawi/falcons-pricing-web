import { fetchActiveActivations } from '@/lib/activations-server';
import { PublicActivationsContent } from './PublicActivationsContent';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PublicActivationsPage() {
  const activations = await fetchActiveActivations();
  return <PublicActivationsContent activations={activations} />;
}
