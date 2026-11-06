import 'server-only';
import { localDb } from './local-db';
import { decode } from './store';
import { isDemo, serviceClient } from './supabase';
import type { Landing, Clinic, Campaign, Asset } from './types';
export async function publicLanding(slug: string) {
  let page: Landing | null = null,
    clinic: Clinic,
    campaign: Campaign,
    asset: Asset | null = null;
  if (isDemo()) {
    const db = localDb(),
      row = db.prepare('SELECT * FROM landing_pages WHERE slug=? AND published=1').get(slug);
    if (!row) return null;
    page = decode<Landing>(row);
    clinic = db
      .prepare('SELECT * FROM clinics WHERE id=?')
      .get(page.clinic_id) as unknown as Clinic;
    if (clinic.suspended) return null;
    campaign = db
      .prepare('SELECT * FROM campaigns WHERE id=? AND clinic_id=?')
      .get(page.campaign_id, page.clinic_id) as unknown as Campaign;
    if (campaign.active_asset_id)
      asset = db
        .prepare('SELECT * FROM campaign_assets WHERE id=? AND clinic_id=?')
        .get(campaign.active_asset_id, page.clinic_id) as unknown as Asset;
  } else {
    const client = serviceClient();
    const { data: p, error } = await client
      .from('landing_pages')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle();
    if (error) throw error;
    if (!p) return null;
    page = p as Landing;
    const { data: c } = await client.from('clinics').select('*').eq('id', page.clinic_id).single();
    if (!c || c.suspended) return null;
    clinic = c as Clinic;
    const { data: camp } = await client
      .from('campaigns')
      .select('*')
      .eq('id', page.campaign_id)
      .eq('clinic_id', page.clinic_id)
      .single();
    if (!camp) return null;
    campaign = camp as Campaign;
    if (campaign.active_asset_id) {
      const { data: a } = await client
        .from('campaign_assets')
        .select('*')
        .eq('id', campaign.active_asset_id)
        .eq('clinic_id', page.clinic_id)
        .maybeSingle();
      asset = a as Asset | null;
    }
  }
  // Client-rendered public pages must not serialize internal campaign strategy or prompts.
  return {
    page,
    clinic: { ...clinic },
    campaign: {
      ...campaign,
      notes: '',
      direction: '',
      audience: '',
      objective: '',
      second_offer: '',
    },
    asset: asset ? { ...asset } : null,
  };
}
