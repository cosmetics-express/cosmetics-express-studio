export type Clinic = {
  id: string;
  name: string;
  phone: string;
  city: string;
  description: string;
  color: string;
  logo_path: string | null;
  suspended: boolean | number;
  created_at: string;
};
export type Subscription = {
  clinic_id: string;
  plan: string;
  allowance: number;
  bonus: number;
  used: number;
  cycle_start: string;
  cycle_end: string;
  status: string;
};
export type Campaign = {
  id: string;
  clinic_id: string;
  title: string;
  service: string;
  objective: string;
  price: string;
  second_offer: string;
  style: string;
  audience: string;
  notes: string;
  direction: string;
  headline: string;
  subheadline: string;
  cta: string;
  phone: string;
  overlay_color: string;
  text_color: string;
  alignment: 'right' | 'center' | 'left';
  text_position: number;
  layout: 'bottom' | 'center' | 'top';
  format: 'post' | 'story' | 'square';
  active_asset_id: string | null;
  created_at: string;
};
export type Asset = {
  id: string;
  clinic_id: string;
  campaign_id: string;
  generation_id: string | null;
  path: string;
  kind: string;
  created_at: string;
};
export type Landing = {
  id: string;
  clinic_id: string;
  campaign_id: string;
  slug: string;
  headline: string;
  subheadline: string;
  benefits: string[];
  faq: { question: string; answer: string }[];
  cta: string;
  color: string;
  published: boolean | number;
  created_at: string;
};
export type LeadStatus = 'new' | 'contacted' | 'appointment' | 'not_interested' | 'no_answer';
export type Lead = {
  id: string;
  clinic_id: string;
  campaign_id: string;
  name: string;
  phone: string;
  email: string;
  status: LeadStatus;
  notes: string;
  consent: boolean | number;
  created_at: string;
};
export type Generation = {
  id: string;
  clinic_id: string;
  campaign_id: string;
  idempotency_key: string;
  prompt_inputs: Record<string, unknown>;
  prompt: string;
  prompt_version: string;
  status: 'pending' | 'succeeded' | 'failed';
  credit_consumed: number;
  error: string | null;
  cycle_start: string;
  created_at: string;
};
export type Context = { userId: string; email: string; clinicId: string; admin: boolean };
export const services = [
  'הסרת שיער בלייזר',
  'טיפול פנים RF',
  'טיפול באקנה',
  'טיפול בפיגמנטציה',
  'הסרת קעקועים',
  'חידוש העור',
];
export const styles = ['יוקרתי', 'נשי', 'נועז', 'אלגנטי', 'נקי', 'רך'];
export const leadStatuses: Record<LeadStatus, string> = {
  new: 'חדש',
  contacted: 'נוצר קשר',
  appointment: 'נקבע תור',
  not_interested: 'לא מעוניינים',
  no_answer: 'אין מענה',
};
export const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Jerusalem',
  });
