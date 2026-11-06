import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireContext } from '@/lib/auth';
import { get, list, clinic } from '@/lib/store';
import { PageHeading } from '@/components/ui';
import { LandingEditor } from '@/components/landing-editor';
import type { Campaign, Asset, Landing } from '@/lib/types';
export default async function LandingEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireContext(),
    { id } = await params,
    c = await get<Campaign>(ctx, 'campaigns', id);
  if (!c) notFound();
  const [profile, pages] = await Promise.all([clinic(ctx), list<Landing>(ctx, 'landing_pages')]);
  const page = pages.find((p) => p.campaign_id === id);
  if (!page) notFound();
  const asset = c.active_asset_id
    ? await get<Asset>(ctx, 'campaign_assets', c.active_asset_id)
    : null;
  return (
    <>
      <Link href={`/app/campaigns/${id}`} className="back-link">
        → לפרטי הקמפיין
      </Link>
      <PageHeading
        title="דף הנחיתה שלך"
        description={`${c.title} · כל מה שצריך כדי להפוך עניין לפנייה.`}
      />
      <LandingEditor page={page} clinic={profile} campaign={c} asset={asset} />
    </>
  );
}
