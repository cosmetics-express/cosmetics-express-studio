import 'server-only';
import { randomUUID } from 'node:crypto';
import { atomic } from './local-db';
import { clinic } from './store';
import { isDemo, supabase } from './supabase';
import { campaignSchema } from './validation';
import type { Context } from './types';
export async function createCampaign(ctx: Context, input: unknown) {
  const values = campaignSchema.parse(input),
    profile = await clinic(ctx),
    id = randomUUID(),
    now = new Date().toISOString();
  const campaign = {
    ...values,
    id,
    headline: values.title,
    subheadline: values.second_offer || `${values.service} בהתאמה אישית`,
    cta: 'לתיאום פגישת ייעוץ',
    phone: profile.phone,
    overlay_color: profile.color,
    text_color: '#ffffff',
    alignment: 'right',
    text_position: 0,
    layout: 'bottom',
    format: 'post',
    active_asset_id: null,
    created_at: now,
  };
  const landing = {
    id: randomUUID(),
    campaign_id: id,
    slug: `campaign-${id}`,
    headline: campaign.headline,
    subheadline: campaign.subheadline,
    benefits: ['התאמה אישית לצרכים שלך', 'צוות מקצועי ומנוסה', 'אווירה נעימה ויחס אישי'],
    faq: [
      {
        question: 'איך מתחילים?',
        answer: 'השאירו פרטים וניצור קשר לתיאום ייעוץ. ההתאמה לטיפול ולתוצאות תיבחן באופן אישי.',
      },
      {
        question: 'איפה הקליניקה?',
        answer: `אנחנו נמצאים ב${profile.city}. נשמח למסור פרטים נוספים בשיחה.`,
      },
    ],
    cta: campaign.cta,
    color: profile.color,
    published: false,
    created_at: now,
  };
  if (isDemo()) {
    atomic((db) => {
      for (const [table, value] of [
        ['campaigns', campaign],
        ['landing_pages', landing],
      ] as const) {
        const row = { ...value, clinic_id: ctx.clinicId };
        const keys = Object.keys(row),
          values = Object.values(row).map((v) =>
            typeof v === 'boolean'
              ? Number(v)
              : typeof v === 'object' && v !== null
                ? JSON.stringify(v)
                : v,
          );
        db.prepare(
          `INSERT INTO ${table}(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')})`,
        ).run(...(values as (string | number | null)[]));
      }
    });
  } else {
    const { error } = await (
      await supabase()
    ).rpc('create_campaign', { p_campaign: campaign, p_landing: landing });
    if (error) throw error;
  }
  return id;
}
