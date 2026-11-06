import { requireContext } from '@/lib/auth';
import { clinic, list } from '@/lib/store';
import { CampaignList } from '@/components/campaign-list';
import { PageHeading, NewCampaignButton } from '@/components/ui';
import type { Campaign, Asset, Landing, Lead } from '@/lib/types';
export default async function Campaigns({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await requireContext();
  const [profile, campaigns, assets, pages, leads, p] = await Promise.all([
    clinic(ctx),
    list<Campaign>(ctx, 'campaigns'),
    list<Asset>(ctx, 'campaign_assets'),
    list<Landing>(ctx, 'landing_pages'),
    list<Lead>(ctx, 'leads'),
    searchParams,
  ]);
  return (
    <>
      <PageHeading
        eyebrow="מרעיון למשהו יפה"
        title="הקמפיינים שלי"
        description="כל העיצובים, דפי הנחיתה והרעיונות שלך. במקום אחד."
        action={<NewCampaignButton />}
      />
      <CampaignList
        clinic={profile}
        campaigns={campaigns}
        assets={assets}
        pages={pages}
        leads={leads}
        initialQuery={p.q}
      />
    </>
  );
}
