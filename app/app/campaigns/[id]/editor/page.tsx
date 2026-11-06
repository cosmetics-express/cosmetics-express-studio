import { notFound } from 'next/navigation';
import { requireContext } from '@/lib/auth';
import { clinic, get, list } from '@/lib/store';
import { subscription } from '@/lib/usage';
import { isDemo } from '@/lib/supabase';
import { Editor } from '@/components/editor';
import type { Campaign, Asset, Landing } from '@/lib/types';
export default async function EditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ generate?: string }>;
}) {
  const ctx = await requireContext(),
    { id } = await params,
    c = await get<Campaign>(ctx, 'campaigns', id);
  if (!c) notFound();
  const [profile, assets, pages, sub, q] = await Promise.all([
    clinic(ctx),
    list<Asset>(ctx, 'campaign_assets'),
    list<Landing>(ctx, 'landing_pages'),
    subscription(ctx),
    searchParams,
  ]);
  return (
    <Editor
      campaign={c}
      clinic={profile}
      assets={assets.filter((a) => a.campaign_id === id)}
      remaining={Math.max(0, sub.allowance + sub.bonus - sub.used)}
      demo={isDemo()}
      autoGenerate={q.generate === '1'}
      landingId={pages.find((p) => p.campaign_id === id)?.id || ''}
    />
  );
}
