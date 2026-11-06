import 'server-only';
import { localDb } from './local-db';
import { isDemo, supabase } from './supabase';
import type { Context } from './types';
const allowed = [
  'campaigns',
  'campaign_assets',
  'ai_generations',
  'landing_pages',
  'leads',
  'brand_assets',
  'usage_events',
] as const;
export type Table = (typeof allowed)[number];
const jsonFields = ['benefits', 'faq', 'prompt_inputs'];
export function decode<T>(row: unknown): T {
  const r = { ...(row as Record<string, unknown>) };
  for (const key of jsonFields)
    if (typeof r[key] === 'string') r[key] = JSON.parse(r[key] as string);
  return r as T;
}
export async function list<T>(ctx: Context, table: Table): Promise<T[]> {
  if (!allowed.includes(table)) throw new Error('Invalid table');
  if (isDemo())
    return localDb()
      .prepare(`SELECT * FROM ${table} WHERE clinic_id=? ORDER BY created_at DESC`)
      .all(ctx.clinicId)
      .map((r) => decode<T>(r));
  const { data, error } = await (
    await supabase()
  )
    .from(table)
    .select('*')
    .eq('clinic_id', ctx.clinicId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as T[];
}
export async function get<T>(ctx: Context, table: Table, id: string): Promise<T | null> {
  if (!allowed.includes(table)) throw new Error('Invalid table');
  if (isDemo()) {
    const row = localDb()
      .prepare(`SELECT * FROM ${table} WHERE id=? AND clinic_id=?`)
      .get(id, ctx.clinicId);
    return row ? decode<T>(row) : null;
  }
  const { data, error } = await (
    await supabase()
  )
    .from(table)
    .select('*')
    .eq('id', id)
    .eq('clinic_id', ctx.clinicId)
    .maybeSingle();
  if (error) throw error;
  return data as T | null;
}
export async function insert(ctx: Context, table: Table, values: Record<string, unknown>) {
  if (!allowed.includes(table)) throw new Error('Invalid table');
  const row = { ...values, clinic_id: ctx.clinicId };
  if (isDemo()) {
    const keys = Object.keys(row);
    const vals = Object.values(row).map((v) =>
      typeof v === 'object' ? JSON.stringify(v) : typeof v === 'boolean' ? Number(v) : v,
    );
    localDb()
      .prepare(`INSERT INTO ${table}(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')})`)
      .run(...(vals as (string | number | null)[]));
    return;
  }
  const { error } = await (await supabase()).from(table).insert(row);
  if (error) throw error;
}
export async function update(
  ctx: Context,
  table: Table,
  id: string,
  values: Record<string, unknown>,
) {
  if (!allowed.includes(table)) throw new Error('Invalid table');
  const safe = { ...values };
  delete safe.id;
  delete safe.clinic_id;
  delete safe.created_at;
  if (isDemo()) {
    const keys = Object.keys(safe);
    const vals = Object.values(safe).map((v) =>
      typeof v === 'object' && v !== null
        ? JSON.stringify(v)
        : typeof v === 'boolean'
          ? Number(v)
          : v,
    );
    localDb()
      .prepare(
        `UPDATE ${table} SET ${keys.map((k) => `${k}=?`).join(',')} WHERE id=? AND clinic_id=?`,
      )
      .run(...(vals as (string | number | null)[]), id, ctx.clinicId);
    return;
  }
  const { error } = await (
    await supabase()
  )
    .from(table)
    .update(safe)
    .eq('id', id)
    .eq('clinic_id', ctx.clinicId);
  if (error) throw error;
}
export async function clinic(ctx: Context) {
  if (isDemo())
    return decode<import('./types').Clinic>(
      localDb().prepare('SELECT * FROM clinics WHERE id=?').get(ctx.clinicId),
    );
  const { data, error } = await (
    await supabase()
  )
    .from('clinics')
    .select('*')
    .eq('id', ctx.clinicId)
    .single();
  if (error) throw error;
  return data as import('./types').Clinic;
}
