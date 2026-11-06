import Link from 'next/link';
import {
  ArrowUpLeft,
  Layers,
  Users,
  Sparkles,
  MousePointer2,
  ArrowLeft,
  Plus,
  Check,
  Clock3,
  Lightbulb,
  TrendingUp,
} from 'lucide-react';
import { requireContext } from '@/lib/auth';
import { clinic, list } from '@/lib/store';
import { subscription } from '@/lib/usage';
import { PageHeading, NewCampaignButton, Pill, EmptyState } from '@/components/ui';
import { CampaignCard } from '@/components/campaign-card';
import { Design } from '@/components/design';
import {
  formatDate,
  leadStatuses,
  type Campaign,
  type Asset,
  type Lead,
  type Landing,
} from '@/lib/types';
export default async function Dashboard() {
  const ctx = await requireContext();
  const [profile, campaigns, assets, leads, pages, sub] = await Promise.all([
    clinic(ctx),
    list<Campaign>(ctx, 'campaigns'),
    list<Asset>(ctx, 'campaign_assets'),
    list<Lead>(ctx, 'leads'),
    list<Landing>(ctx, 'landing_pages'),
    subscription(ctx),
  ]);
  const remaining = Math.max(0, sub.allowance + sub.bonus - sub.used),
    first = campaigns.find((c) => c.active_asset_id);
  const stats = [
    {
      label: 'קמפיינים שיצרת',
      value: campaigns.length,
      icon: Layers,
      detail: 'כל הרעיונות שלך, במקום אחד',
      tone: 'sage',
    },
    {
      label: 'לידים שהתקבלו',
      value: leads.length,
      icon: Users,
      detail: `${leads.filter((l) => l.status === 'new').length} פניות חדשות מחכות לך`,
      tone: 'peach',
    },
    {
      label: 'דפי נחיתה פעילים',
      value: pages.filter((p) => p.published).length,
      icon: MousePointer2,
      detail: 'מוכנים לקבל את הלקוחות הבאים',
      tone: 'lavender',
    },
    {
      label: 'קרדיטים ליצירה',
      value: remaining,
      icon: Sparkles,
      detail: `מתחדשים ב־${formatDate(sub.cycle_end)}`,
      tone: 'sand',
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow="מקום לרעיונות יפים"
        title="יום יפה ליצור משהו חדש ✳"
        description={`${profile.name}, כל מה שצריך כדי להפוך את הקליניקה שלך למותג.`}
        action={<NewCampaignButton />}
      />
      <section className="dashboard-hero">
        <div className="hero-copy">
          <span className="hero-tag">
            <Sparkles size={13} />
            היצירתיות שלך. הקסם של AI.
          </span>
          <h2>
            הטיפול שלך מדהים.
            <br />
            עכשיו גם השיווק שלך.
          </h2>
          <p>
            מרעיון לקמפיין מעוצב, בכמה רגעים.
            <br />
            עיצובים מקוריים, דפי נחיתה ולידים — בסטודיו אחד.
          </p>
          <Link href="/app/campaigns/new" className="button button-cream">
            בואו ניצור את הקמפיין הבא
            <ArrowUpLeft size={18} />
          </Link>
          <small>
            <Check size={13} />
            מותאם למותג שלך <span>·</span> בעברית, מהרעיון ועד התוצאה
          </small>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="hero-float-label">
            <span className="ai-dot">
              <Sparkles size={16} />
            </span>
            <span>
              קצת קסם, הרבה את.<small>עיצוב שנוצר בשביל הקליניקה שלך</small>
            </span>
            <Check size={14} />
          </div>
          <div className="hero-preview">
            {first ? (
              <Design
                campaign={first}
                asset={assets.find((a) => a.id === first.active_asset_id)}
                clinic={profile}
                format="post"
              />
            ) : (
              <img src="/art/laser.svg" alt="" />
            )}
          </div>
          <div className="hero-stamp">
            MADE FOR
            <br />
            <strong>your beauty</strong>
            <span>✳</span>
          </div>
        </div>
      </section>
      <section className="stats-grid">
        {stats.map(({ label, value, icon: Icon, detail, tone }) => (
          <div key={label} className="stat-card">
            <div className="stat-top">
              <span>{label}</span>
              <span className={`stat-icon ${tone}`}>
                <Icon size={19} />
              </span>
            </div>
            <strong className="stat-number">
              {value.toLocaleString('he-IL')}
              {label === 'קרדיטים ליצירה' && <small>/ {sub.allowance + sub.bonus}</small>}
            </strong>
            <div className="stat-detail">
              {label === 'לידים שהתקבלו' ? (
                <TrendingUp size={13} />
              ) : label === 'קרדיטים ליצירה' ? (
                <Clock3 size={13} />
              ) : (
                <span className="tiny-dot" />
              )}
              {detail}
            </div>
          </div>
        ))}
      </section>
      <section className="section-block">
        <div className="section-heading">
          <div>
            <h2>
              הקמפיינים האחרונים שלך <span className="count-badge">{campaigns.length}</span>
            </h2>
            <p>רעיונות שהפכו למשהו יפה. ממשיכים מאיפה שעצרת.</p>
          </div>
          <Link href="/app/campaigns" className="text-link">
            לכל הקמפיינים <ArrowLeft size={16} />
          </Link>
        </div>
        {campaigns.length ? (
          <div className="campaign-grid dashboard-campaigns">
            {campaigns.slice(0, 3).map((c) => (
              <CampaignCard
                key={c.id}
                campaign={c}
                clinic={profile}
                asset={assets.find((a) => a.id === c.active_asset_id)}
                landing={pages.find((p) => p.campaign_id === c.id)}
                leads={leads.filter((l) => l.campaign_id === c.id).length}
              />
            ))}
            <Link className="new-campaign-card" href="/app/campaigns/new">
              <span>
                <Plus size={27} />
              </span>
              <h3>הרעיון הבא שלך</h3>
              <p>מתחיל ממש כאן</p>
              <b>
                יצירת קמפיין חדש <ArrowUpLeft size={15} />
              </b>
            </Link>
          </div>
        ) : (
          <EmptyState
            title="הקמפיין הראשון שלך מחכה"
            description="בוחרים טיפול וכיוון עיצובי, ונותנים לרעיון להתעורר לחיים."
            href="/app/campaigns/new"
            label="ליצירת קמפיין"
          />
        )}
      </section>
      <div className="dashboard-bottom">
        <section className="panel">
          <div className="section-heading">
            <h2>הפניות האחרונות</h2>
            <Link className="text-link" href="/app/leads">
              כל הלידים <ArrowLeft size={15} />
            </Link>
          </div>
          {leads.length ? (
            <div className="recent-leads">
              {leads.slice(0, 3).map((l) => (
                <Link href="/app/leads" className="recent-lead" key={l.id}>
                  <span className="lead-avatar">{l.name.charAt(0)}</span>
                  <span>
                    <strong>{l.name}</strong>
                    <small>{campaigns.find((c) => c.id === l.campaign_id)?.service}</small>
                  </span>
                  <Pill tone={l.status === 'new' ? 'green' : 'neutral'}>
                    {leadStatuses[l.status]}
                  </Pill>
                  <span className="recent-date">{formatDate(l.created_at)}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted empty-inline">הפניות מהקמפיינים שלך יופיעו כאן.</p>
          )}
        </section>
        <aside className="tip-card">
          <span className="tip-icon">
            <Lightbulb size={22} />
          </span>
          <h3>עיצוב אחד. אינסוף אפשרויות.</h3>
          <p>אפשר לשנות כותרת, מחיר ופורמט כמה שרוצים. רק יצירת תמונה חדשה משתמשת בקרדיט נוסף.</p>
          <Link href="/app/campaigns" className="text-link">
            בחזרה לעיצובים שלך <ArrowUpLeft size={16} />
          </Link>
        </aside>
      </div>
    </>
  );
}
