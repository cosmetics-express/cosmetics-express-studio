import Link from 'next/link';
import { ArrowUpLeft, MoreHorizontal } from 'lucide-react';
import { Design } from './design';
import type { Campaign, Asset, Clinic, Landing } from '@/lib/types';
import { formatDate } from '@/lib/types';
export function CampaignCard({
  campaign,
  asset,
  clinic,
  landing,
  leads = 0,
}: {
  campaign: Campaign;
  asset?: Asset;
  clinic: Clinic;
  landing?: Landing;
  leads?: number;
}) {
  return (
    <article className="campaign-card">
      <Link
        href={`/app/campaigns/${campaign.id}/editor`}
        className="campaign-visual"
        aria-label={`עריכת ${campaign.title}`}
      >
        <Design campaign={campaign} asset={asset} clinic={clinic} compact format="post" />
        <span className={`campaign-state ${landing?.published ? 'published' : ''}`}>
          <i />
          {landing?.published ? 'דף נחיתה פעיל' : 'טיוטה'}
        </span>
        <span className="visual-edit">
          פתיחה בסטודיו <ArrowUpLeft size={16} />
        </span>
      </Link>
      <div className="campaign-card-info">
        <div className="campaign-card-meta">
          <span>{campaign.service}</span>
          <Link
            href={`/app/campaigns/${campaign.id}`}
            className="icon-button"
            aria-label={`פרטי ${campaign.title}`}
          >
            <MoreHorizontal size={20} />
          </Link>
        </div>
        <Link href={`/app/campaigns/${campaign.id}`}>
          <h3>{campaign.title}</h3>
        </Link>
        <div className="campaign-card-bottom">
          <span>{formatDate(campaign.created_at)}</span>
          <span>
            <i className="tiny-dot" />
            {leads} לידים
          </span>
          <Link href={`/app/campaigns/${campaign.id}/editor`} aria-label="עריכה">
            <ArrowUpLeft size={17} />
          </Link>
        </div>
      </div>
    </article>
  );
}
