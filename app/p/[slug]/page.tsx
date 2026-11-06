import { notFound } from 'next/navigation';
import { publicLanding } from '@/lib/public';
import { LandingView } from '@/components/landing';
import { isDemo } from '@/lib/supabase';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params,
    d = await publicLanding(slug);
  return {
    title: d ? `${d.page.headline} | ${d.clinic.name}` : 'העמוד לא נמצא',
    robots: isDemo() ? { index: false, follow: false } : undefined,
  };
}
export default async function PublicLanding({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params,
    d = await publicLanding(slug);
  if (!d) notFound();
  return <LandingView {...d} />;
}
