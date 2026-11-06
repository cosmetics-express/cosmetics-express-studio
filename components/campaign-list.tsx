'use client';
import { useState } from 'react';
import { Search, SlidersHorizontal, Grid2X2, Check } from 'lucide-react';
import { CampaignCard } from './campaign-card';
import { EmptyState } from './ui';
import type { Campaign, Asset, Clinic, Landing, Lead } from '@/lib/types';
export function CampaignList({
  campaigns,
  assets,
  clinic,
  pages,
  leads,
  initialQuery = '',
}: {
  campaigns: Campaign[];
  assets: Asset[];
  clinic: Clinic;
  pages: Landing[];
  leads: Lead[];
  initialQuery?: string;
}) {
  const [tab, setTab] = useState('all'),
    [query, setQuery] = useState(initialQuery),
    [sort, setSort] = useState('newest');
  const filtered = campaigns
    .filter(
      (c) =>
        (c.title + c.service).includes(query) &&
        (tab === 'all' ||
          (tab === 'published'
            ? pages.some((p) => p.campaign_id === c.id && p.published)
            : !pages.some((p) => p.campaign_id === c.id && p.published))),
    )
    .sort((a, b) =>
      sort === 'name'
        ? a.title.localeCompare(b.title, 'he')
        : b.created_at.localeCompare(a.created_at),
    );
  return (
    <>
      <div className="list-toolbar">
        <div className="tabs">
          {[
            ['all', 'כל הקמפיינים'],
            ['published', 'דף נחיתה פעיל'],
            ['draft', 'טיוטות'],
          ].map(([v, label]) => (
            <button key={v} className={tab === v ? 'selected' : ''} onClick={() => setTab(v)}>
              {label}
              {v === 'all' && <span>{campaigns.length}</span>}
            </button>
          ))}
        </div>
        <div className="list-filters">
          <div className="search-input">
            <Search size={17} />
            <input
              aria-label="חיפוש ברשימה"
              placeholder="חיפוש לפי שם או טיפול"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <label className="sort-select">
            <SlidersHorizontal size={16} />
            <select
              aria-label="סדר קמפיינים"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="newest">החדשים ביותר</option>
              <option value="name">לפי שם</option>
            </select>
          </label>
        </div>
      </div>
      {filtered.length ? (
        <div className="campaign-grid all-campaigns">
          {filtered.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              clinic={clinic}
              asset={assets.find((a) => a.id === c.active_asset_id)}
              landing={pages.find((p) => p.campaign_id === c.id)}
              leads={leads.filter((l) => l.campaign_id === c.id).length}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title={query ? 'לא נמצאו קמפיינים' : 'כאן מתחיל הקמפיין הבא שלך'}
          description={
            query
              ? 'נסו שם או סוג טיפול אחר.'
              : 'יוצרים עיצוב מקורי ומוסיפים לו את הקול של הקליניקה שלך.'
          }
          href="/app/campaigns/new"
          label="יצירת קמפיין"
        />
      )}
      <div className="free-edit-note">
        <Check size={16} />
        שינוי טקסט, מחיר, לוגו או פורמט לא משתמש בקרדיט נוסף.
      </div>
    </>
  );
}
