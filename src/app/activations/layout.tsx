import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Activations — Team Falcons',
  description: 'Productized brand activations from Team Falcons. 65 SKUs across 9 pillars and 11 Falcons-owned IPs. Brand sends the brief, Falcons brings the operational machinery.',
  openGraph: {
    title: 'Activations — Team Falcons',
    description: 'Sixty-five productized brand activations across nine pillars. Filter by cohort, complexity, and event window. Submit a brief and we come back within 48 hours.',
  },
};

export default function ActivationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
