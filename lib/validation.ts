import { z } from 'zod';
import { services, styles } from './types';
const text = (max = 200) => z.string().trim().max(max);
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(?:\+972|0)[\d\s()-]{8,15}$/, 'יש להזין מספר טלפון ישראלי תקין');
export const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'צבע לא תקין');
export const authSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(8, 'הסיסמה צריכה להכיל לפחות 8 תווים').max(128),
  clinic: text(100).optional(),
});
export const campaignSchema = z.object({
  title: text(100).min(2),
  service: z.enum(services as [string, ...string[]]),
  objective: z.enum(['לידים חדשים', 'קביעת פגישות', 'חשיפה למותג']),
  price: text(50),
  second_offer: text(150).default(''),
  style: z.enum(styles as [string, ...string[]]),
  audience: text(200).min(2),
  notes: text(1000).default(''),
  direction: text(500).default(''),
});
export const editorSchema = z.object({
  headline: text(140).min(1),
  subheadline: text(250),
  price: text(50),
  cta: text(60).min(1),
  phone: phoneSchema,
  overlay_color: colorSchema,
  text_color: colorSchema,
  alignment: z.enum(['right', 'center', 'left']),
  text_position: z.number().int().min(0).max(40),
  layout: z.enum(['bottom', 'center', 'top']),
  format: z.enum(['post', 'story', 'square']),
});
export const clinicSchema = z.object({
  name: text(100).min(2),
  phone: phoneSchema,
  city: text(80).min(2),
  description: text(1000),
  color: colorSchema,
});
export const landingSchema = z.object({
  headline: text(140).min(1),
  subheadline: text(500),
  benefits: z.array(text(180).min(1)).min(1).max(6),
  faq: z.array(z.object({ question: text(180).min(1), answer: text(600).min(1) })).max(6),
  cta: text(60).min(1),
  color: colorSchema,
  published: z.boolean(),
});
export const leadSchema = z.object({
  name: text(100).min(2),
  phone: phoneSchema,
  email: z.union([z.email().max(254), z.literal('')]).default(''),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
});
export const leadUpdateSchema = z.object({
  status: z.enum(['new', 'contacted', 'appointment', 'not_interested', 'no_answer']),
  notes: text(2000),
});
