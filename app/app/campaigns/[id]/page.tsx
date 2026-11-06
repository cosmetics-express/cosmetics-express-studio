import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpLeft, PenLine, ExternalLink, Users, Layers, Globe, ArrowRight } from 'lucide-react';
import { requireContext } from '@/lib/auth';
import { get, list, clinic } from '@/lib/store';
import { Design } from '@/components/design';
import { PageHeading, Pill } from '@/components/ui';
import {
  formatDate,
  type Campaign,
  type Asset,
  type Landing,
  type Lead,
  type Generation,
} from '@/lib/types';
export default async function CampaignDetails({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireContext(),
    { id } = await params,
    c = await get<Campaign>(ctx, 'campaigns', id);
  if (!c) notFound();
  const [profile, assets, pages, leads, generations] = await Promise.all([
    clinic(ctx),
    list<Asset>(ctx, 'campaign_assets'),
    list<Landing>(ctx, 'landing_pages'),
    list<Lead>(ctx, 'leads'),
    list<Generation>(ctx, 'ai_generations'),
  ]);
  const asset = assets.find((a) => a.id === c.active_asset_id),
    page = pages.find((p) => p.campaign_id === id),
    history = generations.filter((g) => g.campaign_id === id);
  return (
    <>
      <Link href="/app/campaigns" className="back-link">
        <ArrowRight size={14} />
        לכל הקמפיינים
      </Link>
      <PageHeading
        title={c.title}
        description={`${c.service} · נוצר ב־${formatDate(c.created_at)}`}
        action={
          <Link href={`/app/campaigns/${id}/editor`} className="button">
            <PenLine size={17} />
            פתיחה בסטודיו
          </Link>
        }
      />
      <div className="detail-layout">
        <div className="detail-preview">
          <Design campaign={c} asset={asset} clinic={profile} />
        </div>
        <div className="detail-info">
          <div className="detail-stats">
            <div>
              <Users size={19} />
              <strong>{leads.filter((l) => l.campaign_id === id).length}</strong>
              <span>לידים שהתקבלו</span>
            </div>
            <div>
              <Layers size={19} />
              <strong>{assets.filter((a) => a.campaign_id === id).length}</strong>
              <span>גרסאות עיצוב</span>
            </div>
          </div>
          <section className="panel">
            <h2>הקמפיין, במילים שלך</h2>
            <dl className="detail-list">
              <div>
                <dt>מטרה</dt>
                <dd>{c.objective}</dd>
              </div>
              <div>
                <dt>קהל יעד</dt>
                <dd>{c.audience}</dd>
              </div>
              <div>
                <dt>סגנון</dt>
                <dd>{c.style}</dd>
              </div>
              <div>
                <dt>הצעה</dt>
                <dd>{c.price || 'ללא מחיר'}</dd>
              </div>
              <div>
                <dt>כיוון ויזואלי</dt>
                <dd>{c.direction || 'אסתטיקה נקייה, בהתאמה למותג'}</dd>
              </div>
            </dl>
          </section>
          <section className="panel">
            <div className="section-heading">
              <h2>
                <Globe size={19} />
                דף הנחיתה שלך
              </h2>
              <Pill tone={page?.published ? 'green' : 'neutral'}>
                {page?.published ? 'פורסם' : 'טיוטה'}
              </Pill>
            </div>
            <p className="muted">הכותרת, היתרונות וטופס הפנייה — מוכנים ללקוחות הבאים שלך.</p>
            <div className="inline-actions">
              <Link className="button button-outline" href={`/app/campaigns/${id}/landing`}>
                עריכת דף הנחיתה <ArrowUpLeft size={16} />
              </Link>
              {page?.published && (
                <Link className="text-link" target="_blank" href={`/p/${page.slug}`}>
                  צפייה בדף <ExternalLink size={15} />
                </Link>
              )}
            </div>
          </section>
          <section className="panel">
            <h2>היסטוריית יצירה</h2>
            {history.length ? (
              history.map((g) => (
                <div className="generation-row" key={g.id}>
                  <span>{formatDate(g.created_at)}</span>
                  <span>{g.prompt_version}</span>
                  <Pill tone={g.status === 'failed' ? 'neutral' : 'green'}>
                    {g.status === 'succeeded'
                      ? 'הושלם'
                      : g.status === 'pending'
                        ? 'בתהליך'
                        : 'נכשל · הוחזר'}
                  </Pill>
                  <span>{g.credit_consumed} קרדיט</span>
                </div>
              ))
            ) : (
              <p className="muted">
                טרם נוצרה תמונת AI בקמפיין זה. איורים לדוגמה אינם תמונות שנוצרו עם AI.
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
